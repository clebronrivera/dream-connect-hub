-- Puppy media library — PR 1a, part 3: seed puppy_media from the existing
-- arrays, and refuse to commit unless the public site would render identically.
--
-- Runs puppy_media_import() — the exact same function the live arrays->media
-- trigger uses — so the seeded state cannot drift from the ongoing behaviour.
-- That call also reprojects, which rewrites the arrays into canonical form.
--
-- Canonical form differs from what is stored today for a minority of rows.
-- Measured on production before writing this migration (45 puppies):
--
--   6  rows have primary_photo at a non-zero index -> primary gets hoisted to
--      the front of photos[]
--   1  row (Buddy) has primary_photo = '' (empty string, not NULL) with an
--      empty photos[] -> becomes NULL
--   0  rows contain duplicate URLs within photos[]
--   0  rows contain bare (non-absolute) storage paths inside photos[]
--
-- None of those change RENDERED output, because
-- src/lib/puppy-display-utils.ts getPuppyMediaList() already builds
-- [primary_photo, ...photos] and dedupes first-seen, and
-- resolvePuppyPhotosPublicUrl() returns null for blank strings. The assertion
-- below proves that claim per-row rather than asserting it in prose: it
-- snapshots the rendered list BEFORE, recomputes it AFTER, and raises on any
-- difference — which rolls back this entire migration.
--
-- Comparing raw strings (rather than resolved URLs) is sound here only because
-- there are no bare/absolute duplicates of the same object in the data; a bare
-- path and its absolute equivalent would dedupe in the client but not in SQL.
-- Verified zero such rows above.

-- ---------------------------------------------------------------------------
-- 1. Snapshot what the site renders today.
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _puppy_media_legacy ON COMMIT DROP AS
WITH flat AS (
  SELECT p.id AS puppy_id,
         NULLIF(btrim(COALESCE(t.raw, '')), '') AS u,
         t.ord
    FROM puppies p,
         unnest(ARRAY[p.primary_photo] || COALESCE(p.photos, '{}'::text[]))
           WITH ORDINALITY AS t(raw, ord)
),
deduped AS (
  SELECT DISTINCT ON (puppy_id, u) puppy_id, u, ord
    FROM flat
   WHERE u IS NOT NULL
   ORDER BY puppy_id, u, ord      -- first occurrence wins, like Array.from(new Set(...))
)
SELECT p.id,
       COALESCE(
         (SELECT array_agg(d.u ORDER BY d.ord) FROM deduped d WHERE d.puppy_id = p.id),
         '{}'::text[]
       ) AS photos,
       NULLIF(btrim(COALESCE(p.video_path, '')), '') AS video
  FROM puppies p;

-- ---------------------------------------------------------------------------
-- 2. Seed puppy_media and normalize the arrays.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM puppies ORDER BY created_at LOOP
    PERFORM public.puppy_media_import(r.id);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Prove the render is unchanged, or roll everything back.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_bad    int;
  v_detail text;
BEGIN
  WITH flat AS (
    SELECT p.id AS puppy_id,
           NULLIF(btrim(COALESCE(t.raw, '')), '') AS u,
           t.ord
      FROM puppies p,
           unnest(ARRAY[p.primary_photo] || COALESCE(p.photos, '{}'::text[]))
             WITH ORDINALITY AS t(raw, ord)
  ),
  deduped AS (
    SELECT DISTINCT ON (puppy_id, u) puppy_id, u, ord
      FROM flat
     WHERE u IS NOT NULL
     ORDER BY puppy_id, u, ord
  ),
  now_render AS (
    SELECT p.id,
           COALESCE(
             (SELECT array_agg(d.u ORDER BY d.ord) FROM deduped d WHERE d.puppy_id = p.id),
             '{}'::text[]
           ) AS photos,
           NULLIF(btrim(COALESCE(p.video_path, '')), '') AS video
      FROM puppies p
  )
  SELECT count(*),
         string_agg(format('%s (was %s photos, now %s)', l.id,
                           COALESCE(array_length(l.photos, 1), 0),
                           COALESCE(array_length(n.photos, 1), 0)), '; ')
    INTO v_bad, v_detail
    FROM _puppy_media_legacy l
    JOIN now_render n ON n.id = l.id
   WHERE n.photos IS DISTINCT FROM l.photos
      OR n.video  IS DISTINCT FROM l.video;

  IF v_bad > 0 THEN
    RAISE EXCEPTION
      'puppy_media backfill would change rendered output for % puppy row(s): %',
      v_bad, v_detail;
  END IF;

  RAISE NOTICE 'puppy_media backfill verified: rendered output unchanged for all puppies.';
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Structural sanity checks.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_dupe_primary int;
  v_orphan       int;
BEGIN
  SELECT count(*) INTO v_dupe_primary
    FROM (SELECT puppy_id FROM puppy_media WHERE is_primary
           GROUP BY puppy_id HAVING count(*) > 1) x;
  IF v_dupe_primary > 0 THEN
    RAISE EXCEPTION 'puppy_media: % puppies ended up with more than one primary', v_dupe_primary;
  END IF;

  -- Every non-blank primary_photo must now have a matching is_primary row.
  SELECT count(*) INTO v_orphan
    FROM puppies p
   WHERE NULLIF(btrim(COALESCE(p.primary_photo, '')), '') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM puppy_media m
        WHERE m.puppy_id = p.id AND m.is_primary AND m.url = p.primary_photo);
  IF v_orphan > 0 THEN
    RAISE EXCEPTION 'puppy_media: % puppies have primary_photo with no matching is_primary row', v_orphan;
  END IF;
END;
$$;
