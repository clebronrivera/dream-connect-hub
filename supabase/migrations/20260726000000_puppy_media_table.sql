-- Puppy media library — PR 1a (table only; sync lives in 20260726000001).
--
-- Why: puppy photos have lived in `puppies.photos text[]` + `primary_photo`
-- + a single `video_path` since the beginning. That model carries no
-- per-photo metadata, so three things are impossible:
--
--   1. Knowing which photo is the face / back / top-down / paw shot. The
--      capture wizard writes those meanings into array indices 0-3, but
--      /breeder/photos appends extras onto the same array and the admin form
--      dense-collapses on save, so the convention is already lost on every
--      puppy with 5+ photos.
--   2. Adding a photo without publishing it. The public site renders the
--      whole array, so there is no staging lane.
--   3. Keeping an AI-edited variant next to its original — an edit can only
--      overwrite.
--
-- This table becomes the source of truth. `puppies.photos` / `primary_photo`
-- / `video_path` are demoted to a synced projection of the *public* rows here
-- (see the next migration), so the public site, admin UI, and SEO prerender
-- keep reading exactly what they read today with zero code changes.
--
-- Access: admin-only RLS for the /admin UI. The breeder portal never selects
-- this table directly — it goes through breeder-write / breeder-upload-photo
-- on the service-role key, same as every other breeder table.

CREATE TABLE IF NOT EXISTS public.puppy_media (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puppy_id              uuid NOT NULL REFERENCES public.puppies(id) ON DELETE CASCADE,

  media_type            text NOT NULL CHECK (media_type IN ('photo', 'video')),

  -- What the shot IS, replacing the positional face/back/top/paw convention.
  -- 'candid' is the catch-all for day-to-day shots that aren't one of the
  -- four structured angles.
  kind                  text NOT NULL DEFAULT 'candid'
                          CHECK (kind IN ('face', 'back', 'top', 'paw', 'candid', 'video')),

  -- Stored VERBATIM as it appears in puppies.photos / primary_photo /
  -- video_path. Every current writer stores a full public URL, but legacy
  -- rows may hold a bare storage path; resolvePuppyPhotosPublicUrl tolerates
  -- both. Round-tripping the exact string is what lets the projection be
  -- byte-comparable against the arrays it replaces — never canonicalize here.
  url                   text NOT NULL,

  -- Parsed out of `url` when it points at one of our buckets; NULL for
  -- external or unparseable URLs. Only used to decide whether a file is ours
  -- to delete from storage.
  storage_bucket        text,
  storage_path          text,

  -- The staging lane. New photos added in bulk default to false and appear
  -- only in the breeder portal; the operator publishes the keepers.
  is_public             boolean NOT NULL DEFAULT false,
  is_primary            boolean NOT NULL DEFAULT false,

  -- Dense integers, rewritten wholesale by puppy_media_reorder(). Ties break
  -- on (created_at, id) so ordering can never flip between reads.
  sort_order            int NOT NULL DEFAULT 0,

  -- AI-edit lineage (crop / enhance / background removal). An edit inserts a
  -- NEW row pointing back at its source; the original is never destroyed.
  derived_from_media_id uuid REFERENCES public.puppy_media(id) ON DELETE SET NULL,
  edit_ops              jsonb,

  width                 int,
  height                int,
  captured_at           timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- The primary photo is what the public site shows first, so it must be a
  -- visible photo. To hide the primary you clear is_primary first (the
  -- updatePuppyMedia op does this automatically).
  CONSTRAINT puppy_media_primary_is_public_photo
    CHECK (is_primary = false OR (media_type = 'photo' AND is_public)),

  -- kind='video' and media_type='video' are the same statement; keep them
  -- from drifting apart.
  CONSTRAINT puppy_media_video_kind_matches_type
    CHECK ((media_type = 'video') = (kind = 'video'))
);

COMMENT ON TABLE public.puppy_media IS
  'Source of truth for puppy photos and videos. puppies.photos / primary_photo / video_path are a synced projection of the is_public rows here — see puppy_media_project().';
COMMENT ON COLUMN public.puppy_media.url IS
  'Verbatim string as stored in puppies.photos. Usually a full public URL; legacy rows may hold a bare storage path. Never canonicalized.';
COMMENT ON COLUMN public.puppy_media.is_public IS
  'false = staging (breeder portal only). true = projected into puppies.photos and visible on the public site.';
COMMENT ON COLUMN public.puppy_media.derived_from_media_id IS
  'Set on AI-edited variants (crop / enhance / background removal) to point at the source row. Originals are never overwritten.';

-- At most one primary per puppy, enforced by the index rather than by
-- application discipline. puppy_media_set_primary() clears + sets in one
-- statement to stay inside it.
CREATE UNIQUE INDEX IF NOT EXISTS puppy_media_one_primary_per_puppy
  ON public.puppy_media (puppy_id) WHERE is_primary;

-- Makes the arrays->media reconcile idempotent: re-importing the same array
-- upserts instead of duplicating. Also collapses the duplicate URLs that
-- exist inside some live photo arrays (the client already deduped these on
-- render, so nothing visible changes).
CREATE UNIQUE INDEX IF NOT EXISTS puppy_media_puppy_url_key
  ON public.puppy_media (puppy_id, url);

-- Exactly the ORDER BY used by puppy_media_project().
CREATE INDEX IF NOT EXISTS puppy_media_puppy_order
  ON public.puppy_media (puppy_id, is_primary DESC, sort_order, created_at, id);

CREATE INDEX IF NOT EXISTS puppy_media_derived_from
  ON public.puppy_media (derived_from_media_id);

-- Reuses the shared function from the products_kits_inventory migration.
DROP TRIGGER IF EXISTS set_updated_at_puppy_media ON public.puppy_media;
CREATE TRIGGER set_updated_at_puppy_media
  BEFORE UPDATE ON public.puppy_media
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS — admin only.
--
-- No anon/authenticated policy on purpose: the public site never reads this
-- table, it reads the projected puppies columns. The breeder portal reaches
-- it through service-role edge functions, which bypass RLS.
-- ---------------------------------------------------------------------------

ALTER TABLE public.puppy_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_puppy_media ON public.puppy_media;
CREATE POLICY admin_all_puppy_media ON public.puppy_media FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
