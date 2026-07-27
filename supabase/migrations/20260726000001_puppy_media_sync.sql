-- Puppy media library — PR 1a, part 2: two-way sync with puppies.photos.
--
-- puppy_media is the source of truth. puppies.photos / primary_photo /
-- video_path become a projection of its *public* rows, so every existing
-- reader (public site, admin lists, SEO prerender, breeder_litter_summary)
-- keeps working untouched.
--
-- Sync runs in BOTH directions because there are two independent writer
-- families and only one of them will ever call the new media ops:
--
--   media -> arrays  (trigger A)  every breeder-portal write
--   arrays -> media  (trigger B)  admin PuppyForm, litter-api, ad-hoc SQL —
--                                 these go straight through PostgREST and
--                                 will never learn about puppy_media
--
-- Doing it in the database rather than in the edge function is what makes the
-- arrays impossible to observe stale: both directions are transactional, and
-- a future writer that forgets to reproject cannot desync the public site.
--
-- ---------------------------------------------------------------------------
-- Loop guard
-- ---------------------------------------------------------------------------
-- Each direction sets a transaction-local GUC while it writes, and the other
-- direction returns early when it sees it. The value is SAVED AND RESTORED
-- around every write so nesting can never leak state into the rest of the
-- transaction.
--
-- A bare pg_trigger_depth() check would NOT be sufficient here: this schema
-- already updates puppies from inside other triggers (propagate_litter_ready_date
-- and propagate_litter_base_price on `litters`), so depth > 0 is a legitimate
-- state, not a loop signal. The depth check below is only a fuse — it should
-- never fire in any designed flow, and exists so a future mistake surfaces as
-- a WARNING instead of stack exhaustion.
--
-- ---------------------------------------------------------------------------
-- Why trigger B is scoped `OF photos, primary_photo, video_path`
-- ---------------------------------------------------------------------------
-- Verified against every trigger currently on public.puppies —
-- set_puppies_updated_at, trg_notify_waitlist_on_puppy_available (OF status),
-- trg_puppies_autoset_date_sold (OF status), trg_puppies_enforce_visibility
-- (OF status, is_deceased, is_publicly_visible), trg_puppies_generate_slug
-- (BEFORE INSERT) — plus sync_puppy_status_from_agreement (writes status from
-- deposit_agreements) and the litter-wide UPDATEs in UpcomingLitterForm /
-- applyLitterDefaultsToLittermates. None of them touch a photo column, so
-- none of them fire media sync. Status churn and litter bulk edits stay free.

-- ---------------------------------------------------------------------------
-- 0. Storage-location parser
-- ---------------------------------------------------------------------------
-- Only used to decide whether a file is ours to delete later. Returns NULLs
-- for external or unrecognizable URLs, which is exactly what we want: we
-- never delete what we didn't upload.

CREATE OR REPLACE FUNCTION public.puppy_media_parse_storage(
  p_url         text,
  p_default_bucket text
)
RETURNS TABLE (bucket text, path text)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_clean text;
  v_match text[];
BEGIN
  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RETURN QUERY SELECT NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Drop any query string / fragment before matching.
  v_clean := split_part(split_part(btrim(p_url), '?', 1), '#', 1);

  IF v_clean ~* '^https?://' OR v_clean ~ '^//' THEN
    v_match := regexp_match(v_clean, '/storage/v1/object/(?:public/|sign/|authenticated/)?([^/]+)/(.+)$');
    IF v_match IS NULL THEN
      -- Absolute URL we don't recognize (external host, CDN, etc).
      RETURN QUERY SELECT NULL::text, NULL::text;
    ELSE
      RETURN QUERY SELECT v_match[1], v_match[2];
    END IF;
  ELSE
    -- Legacy bare storage path. resolvePuppyPhotosPublicUrl treats these as
    -- bucket-relative, so we do too.
    RETURN QUERY SELECT p_default_bucket, ltrim(v_clean, '/');
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Projection: puppy_media -> puppies
-- ---------------------------------------------------------------------------
-- Shared by trigger A, trigger B's normalize step, the backfill migration,
-- and any future repair job. One implementation, no drift.
--
-- Ordering semantics are chosen to preserve RENDERED output, which is the
-- real contract — src/lib/puppy-display-utils.ts getPuppyMediaList() builds
-- [primary_photo, ...photos] and then dedupes first-seen. So:
--
--   photos        = public photos, primary FIRST, then sort_order
--   primary_photo = the is_primary row, or NULL (no auto-promotion —
--                   getPuppyImage already falls back to photos[0])
--   video_path    = first public video
--
-- Every drifted live shape survives this:
--   primary == photos[0]  -> identical array
--   primary NOT in photos -> array grows by one, but the rendered list was
--                            already [primary, ...photos] via the prepend
--   primary at index i>0  -> primary hoisted to front; rendered list was
--                            already [primary, ...rest] after dedupe
--   duplicate URL in array -> collapsed once (client already deduped it)

CREATE OR REPLACE FUNCTION public.puppy_media_project(p_puppy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_photos  text[];
  v_primary text;
  v_video   text;
  v_prev    text;
BEGIN
  IF p_puppy_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(array_agg(url ORDER BY is_primary DESC, sort_order, created_at, id), '{}'::text[])
    INTO v_photos
    FROM puppy_media
   WHERE puppy_id = p_puppy_id AND media_type = 'photo' AND is_public;

  SELECT url INTO v_primary
    FROM puppy_media
   WHERE puppy_id = p_puppy_id AND is_primary;

  SELECT url INTO v_video
    FROM puppy_media
   WHERE puppy_id = p_puppy_id AND media_type = 'video' AND is_public
   ORDER BY sort_order, created_at, id
   LIMIT 1;

  v_prev := COALESCE(current_setting('app.puppy_media_sync', true), '');
  PERFORM set_config('app.puppy_media_sync', 'from_media', true);

  -- The IS DISTINCT FROM guard keeps this a no-op when nothing changed, so
  -- reprojecting is always safe and never churns updated_at needlessly.
  UPDATE puppies
     SET photos        = v_photos,
         primary_photo = v_primary,
         video_path    = v_video
   WHERE id = p_puppy_id
     AND (photos        IS DISTINCT FROM v_photos
       OR primary_photo IS DISTINCT FROM v_primary
       OR video_path    IS DISTINCT FROM v_video);

  PERFORM set_config('app.puppy_media_sync', v_prev, true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Trigger A: puppy_media -> puppies
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_puppy_media_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Trigger B is mid-reconcile; it reprojects once at the end itself.
  IF COALESCE(current_setting('app.puppy_media_sync', true), '') = 'from_arrays' THEN
    RETURN NULL;
  END IF;

  IF pg_trigger_depth() > 4 THEN
    RAISE WARNING 'puppy_media sync depth fuse tripped (media->arrays), puppy_id=%',
      COALESCE(NEW.puppy_id, OLD.puppy_id);
    RETURN NULL;
  END IF;

  PERFORM puppy_media_project(COALESCE(NEW.puppy_id, OLD.puppy_id));

  -- Re-parenting a media row has to refresh both puppies.
  IF TG_OP = 'UPDATE' AND NEW.puppy_id IS DISTINCT FROM OLD.puppy_id THEN
    PERFORM puppy_media_project(OLD.puppy_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_puppy_media_project ON public.puppy_media;
CREATE TRIGGER trg_puppy_media_project
  AFTER INSERT OR UPDATE OR DELETE ON public.puppy_media
  FOR EACH ROW EXECUTE FUNCTION public.trg_puppy_media_project();

-- ---------------------------------------------------------------------------
-- 3. Trigger B: puppies -> puppy_media (reconcile)
-- ---------------------------------------------------------------------------
-- Catches every writer that bypasses the breeder edge functions: the admin
-- PuppyForm (src/lib/admin/puppies-service.ts), createPuppyFromLitter, the
-- bulk littermate generator, and anything typed into Supabase Studio.
--
-- Deliberately DEMOTES rather than deletes rows whose URL dropped out of the
-- array. The admin form's 4-slot UI dense-collapses on save, which today
-- silently orphans photos; under this trigger those photos move to staging
-- and stay recoverable in the breeder portal.

-- The reconcile body lives in a callable function rather than inline in the
-- trigger so the backfill migration runs the exact same code path. One
-- implementation, no chance of the seed logic drifting from the live logic.

CREATE OR REPLACE FUNCTION public.puppy_media_import(p_puppy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_prev    text;
  v_seq     text[];
  v_primary text;
  v_video   text;
  v_url     text;
  v_kind    text;
  v_idx     int;
  v_bucket  text;
  v_path    text;
  v_row     puppies%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM puppies WHERE id = p_puppy_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Deduped, blank-stripped, original order preserved.
  SELECT COALESCE(array_agg(u ORDER BY ord), '{}'::text[])
    INTO v_seq
    FROM (
      SELECT DISTINCT ON (u) u, ord
        FROM unnest(COALESCE(v_row.photos, '{}'::text[])) WITH ORDINALITY AS t(u, ord)
       WHERE u IS NOT NULL AND btrim(u) <> ''
       ORDER BY u, ord
    ) d;

  v_primary := NULLIF(btrim(COALESCE(v_row.primary_photo, '')), '');
  v_video   := NULLIF(btrim(COALESCE(v_row.video_path, '')), '');

  v_prev := COALESCE(current_setting('app.puppy_media_sync', true), '');
  PERFORM set_config('app.puppy_media_sync', 'from_arrays', true);

  -- (a) Clear primary first so later demotions can't collide with the
  --     "primary must be a public photo" CHECK.
  UPDATE puppy_media SET is_primary = false
   WHERE puppy_id = p_puppy_id AND is_primary;

  -- (b) Upsert every URL in the array. `kind` is only assigned on INSERT —
  --     an operator who has since labelled a photo keeps their label.
  FOR v_idx IN 1 .. COALESCE(array_length(v_seq, 1), 0) LOOP
    v_url := v_seq[v_idx];
    v_kind := CASE v_idx WHEN 1 THEN 'face' WHEN 2 THEN 'back'
                         WHEN 3 THEN 'top'  WHEN 4 THEN 'paw'
                         ELSE 'candid' END;
    SELECT bucket, path INTO v_bucket, v_path
      FROM puppy_media_parse_storage(v_url, 'puppy-photos');

    INSERT INTO puppy_media (puppy_id, media_type, kind, url, storage_bucket, storage_path,
                             is_public, sort_order)
    VALUES (p_puppy_id, 'photo', v_kind, v_url, v_bucket, v_path, true, v_idx - 1)
    ON CONFLICT (puppy_id, url)
    DO UPDATE SET is_public = true, sort_order = EXCLUDED.sort_order;
  END LOOP;

  -- (c) A primary that isn't in the array still needs a row — this is the
  --     legacy "primary_photo set, photos empty" shape.
  IF v_primary IS NOT NULL THEN
    SELECT bucket, path INTO v_bucket, v_path
      FROM puppy_media_parse_storage(v_primary, 'puppy-photos');
    INSERT INTO puppy_media (puppy_id, media_type, kind, url, storage_bucket, storage_path,
                             is_public, sort_order)
    VALUES (p_puppy_id, 'photo', 'face', v_primary, v_bucket, v_path, true, 0)
    ON CONFLICT (puppy_id, url) DO UPDATE SET is_public = true;
  END IF;

  -- (d) Demote (never delete) public photos that dropped out of the array.
  UPDATE puppy_media
     SET is_public = false, is_primary = false
   WHERE puppy_id = p_puppy_id
     AND media_type = 'photo'
     AND is_public
     AND NOT (url = ANY (v_seq))
     AND (v_primary IS NULL OR url <> v_primary);

  -- (e) Now the primary row is guaranteed present and public.
  IF v_primary IS NOT NULL THEN
    UPDATE puppy_media SET is_primary = true, is_public = true
     WHERE puppy_id = p_puppy_id AND url = v_primary;
  END IF;

  -- (f) Video: one public video at a time, matching the single video_path column.
  IF v_video IS NOT NULL THEN
    SELECT bucket, path INTO v_bucket, v_path
      FROM puppy_media_parse_storage(v_video, 'puppy-videos');
    INSERT INTO puppy_media (puppy_id, media_type, kind, url, storage_bucket, storage_path,
                             is_public, sort_order)
    VALUES (p_puppy_id, 'video', 'video', v_video, v_bucket, v_path, true, 0)
    ON CONFLICT (puppy_id, url) DO UPDATE SET is_public = true;
  END IF;

  UPDATE puppy_media SET is_public = false
   WHERE puppy_id = p_puppy_id
     AND media_type = 'video'
     AND is_public
     AND (v_video IS NULL OR url <> v_video);

  PERFORM set_config('app.puppy_media_sync', v_prev, true);

  -- Normalize the arrays to canonical form. No-op when they already are;
  -- rewrites drifted admin writes to the render-equivalent canonical shape.
  PERFORM puppy_media_project(p_puppy_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_puppies_import_media()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Our own projection echoing back; nothing to import.
  IF COALESCE(current_setting('app.puppy_media_sync', true), '') = 'from_media' THEN
    RETURN NULL;
  END IF;

  IF pg_trigger_depth() > 4 THEN
    RAISE WARNING 'puppy_media sync depth fuse tripped (arrays->media), puppy_id=%', NEW.id;
    RETURN NULL;
  END IF;

  PERFORM puppy_media_import(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_puppies_import_media_upd ON public.puppies;
CREATE TRIGGER trg_puppies_import_media_upd
  AFTER UPDATE OF photos, primary_photo, video_path ON public.puppies
  FOR EACH ROW
  WHEN (OLD.photos        IS DISTINCT FROM NEW.photos
     OR OLD.primary_photo IS DISTINCT FROM NEW.primary_photo
     OR OLD.video_path    IS DISTINCT FROM NEW.video_path)
  EXECUTE FUNCTION public.trg_puppies_import_media();

-- Littermate creation inserts with primary_photo/photos already populated
-- (src/lib/litter-api.ts createPuppyFromLitter), so INSERT needs a leg too.
DROP TRIGGER IF EXISTS trg_puppies_import_media_ins ON public.puppies;
CREATE TRIGGER trg_puppies_import_media_ins
  AFTER INSERT ON public.puppies
  FOR EACH ROW
  WHEN (COALESCE(array_length(NEW.photos, 1), 0) > 0
     OR NEW.primary_photo IS NOT NULL
     OR NEW.video_path    IS NOT NULL)
  EXECUTE FUNCTION public.trg_puppies_import_media();

-- ---------------------------------------------------------------------------
-- 4. Helpers for the breeder-write ops
-- ---------------------------------------------------------------------------
-- Both exist so the multi-statement operations stay inside one transaction and
-- inside the partial unique index, rather than being raced from the client.

CREATE OR REPLACE FUNCTION public.puppy_media_set_primary(p_media_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_puppy_id uuid;
  v_type     text;
BEGIN
  SELECT puppy_id, media_type INTO v_puppy_id, v_type
    FROM puppy_media WHERE id = p_media_id;

  IF v_puppy_id IS NULL THEN
    RAISE EXCEPTION 'puppy_media row % not found', p_media_id;
  END IF;
  IF v_type <> 'photo' THEN
    RAISE EXCEPTION 'only a photo can be the primary (row % is %)', p_media_id, v_type;
  END IF;

  UPDATE puppy_media SET is_primary = false
   WHERE puppy_id = v_puppy_id AND is_primary AND id <> p_media_id;

  -- Setting primary implies publishing it; the CHECK requires it anyway.
  UPDATE puppy_media SET is_primary = true, is_public = true
   WHERE id = p_media_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.puppy_media_reorder(p_puppy_id uuid, p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_foreign int;
BEGIN
  -- Refuse to reorder rows that belong to another puppy.
  SELECT count(*) INTO v_foreign
    FROM unnest(p_ids) AS t(id)
    LEFT JOIN puppy_media m ON m.id = t.id
   WHERE m.id IS NULL OR m.puppy_id IS DISTINCT FROM p_puppy_id;

  IF v_foreign > 0 THEN
    RAISE EXCEPTION '% id(s) in the reorder list do not belong to puppy %', v_foreign, p_puppy_id;
  END IF;

  UPDATE puppy_media m
     SET sort_order = t.ord - 1
    FROM unnest(p_ids) WITH ORDINALITY AS t(id, ord)
   WHERE m.id = t.id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Lock down EXECUTE (matches the 2026-06-19 advisor hardening)
-- ---------------------------------------------------------------------------
-- All SECURITY DEFINER. The trigger functions fire regardless of grants; the
-- three callable ones are only ever invoked by service-role edge functions.

REVOKE EXECUTE ON FUNCTION public.puppy_media_parse_storage(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.puppy_media_project(uuid)             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.puppy_media_import(uuid)              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.puppy_media_set_primary(uuid)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.puppy_media_reorder(uuid, uuid[])     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_puppy_media_project()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_puppies_import_media()            FROM PUBLIC, anon, authenticated;
