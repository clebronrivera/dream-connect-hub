-- Breeder Tool — PR 1 setup
--
-- Companion spec: docs/breeder-tool/HANDOFF.md
-- Implementation plan: ~/.claude/plans/users-lebron-documents-dream-enterprise-quiet-brook.md
--
-- This migration creates:
--   1. A trigger that propagates litters.ready_date changes to all linked puppies.
--   2. A `photos text[]` column on breeding_dogs (mirrors puppies.photos).
--   3. Three new tables: breeder_config, breeder_sessions, breeder_login_attempts.
--   4. A `breeder_litter_summary` view consumed by the breeder Home screen.
--   5. A private `puppy-videos` storage bucket (signed-URL read only).
--
-- RLS strategy: all breeder writes go through edge functions with the
-- service-role key, which bypasses RLS. The new admin-only policies below
-- exist so the /admin UI can manage these tables directly. The breeder
-- client never SELECTs them.

-- ---------------------------------------------------------------------------
-- 1. litters.ready_date → puppies.ready_date propagation
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN litters.ready_date IS
  'Breeder-reported "ready to go home" date. Primary user-facing date — shown on the public site as "Ready by [date]". A trigger propagates updates to all linked puppies that have not been manually overridden.';

CREATE OR REPLACE FUNCTION propagate_litter_ready_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.ready_date IS DISTINCT FROM OLD.ready_date THEN
    UPDATE puppies
       SET ready_date = NEW.ready_date,
           updated_at = now()
     WHERE litter_id = NEW.id
       AND (
         ready_date IS NULL
         OR ready_date = OLD.ready_date  -- only sweep along inherited values; respect per-puppy overrides
       );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_litter_ready_date ON litters;
CREATE TRIGGER trg_propagate_litter_ready_date
  AFTER UPDATE OF ready_date ON litters
  FOR EACH ROW EXECUTE FUNCTION propagate_litter_ready_date();

-- ---------------------------------------------------------------------------
-- 2. Multi-photo support for parent dogs
-- ---------------------------------------------------------------------------

ALTER TABLE breeding_dogs
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN breeding_dogs.photos IS
  'Multi-photo array for parent dogs. Mirrors puppies.photos. The legacy photo_path column remains as the single-primary-photo source of truth; new uploads land here.';

-- ---------------------------------------------------------------------------
-- 3a. breeder_config — single-row table holding the bcrypt-hashed passcode
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS breeder_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  passcode_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE breeder_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_breeder_config ON breeder_config;
CREATE POLICY admin_all_breeder_config ON breeder_config FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 3b. breeder_sessions — bookmarkable session tokens (30-day expiration)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS breeder_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_breeder_sessions_token
  ON breeder_sessions(token) WHERE revoked_at IS NULL;

ALTER TABLE breeder_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_breeder_sessions ON breeder_sessions;
CREATE POLICY admin_all_breeder_sessions ON breeder_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 3c. breeder_login_attempts — rate-limit ledger (5 fails / 15min / IP)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS breeder_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  succeeded boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_breeder_login_attempts_ip_time
  ON breeder_login_attempts(ip_address, attempted_at DESC);

ALTER TABLE breeder_login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_breeder_login_attempts ON breeder_login_attempts;
CREATE POLICY admin_all_breeder_login_attempts ON breeder_login_attempts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 4. breeder_litter_summary view (read-only)
-- ---------------------------------------------------------------------------
--
-- One SELECT per Home screen render. Joins upcoming_litters → litters by
-- shared UUID (the breeder-write `confirmLitterBorn` op inserts the litters
-- row carrying the same UUID as the upcoming_litters row). Includes dam/sire
-- names, photo-completion counters, and the freshest puppy update timestamp.

CREATE OR REPLACE VIEW breeder_litter_summary
  WITH (security_invoker = on) AS
SELECT
  ul.id AS upcoming_litter_id,
  ul.breed,
  ul.lifecycle_status,
  ul.expected_whelping_date,
  ul.date_of_birth AS upcoming_date_of_birth,
  ul.male_puppy_count,
  ul.female_puppy_count,
  ul.total_puppy_count,
  d.name AS dam_name,
  s.name AS sire_name,
  l.id AS litter_id,
  l.date_of_birth AS litter_date_of_birth,
  l.ready_date,
  COUNT(p.id)::int AS total_puppies,
  COUNT(p.id) FILTER (
    WHERE COALESCE(array_length(p.photos, 1), 0) = 0 AND p.primary_photo IS NULL
  )::int AS puppies_missing_photos,
  MAX(p.updated_at) AS last_puppy_update
FROM upcoming_litters ul
LEFT JOIN breeding_dogs d ON d.id = ul.dam_id
LEFT JOIN breeding_dogs s ON s.id = ul.sire_id
LEFT JOIN litters l ON l.id = ul.id
LEFT JOIN puppies p ON p.upcoming_litter_id = ul.id
GROUP BY ul.id, d.name, s.name, l.id, l.date_of_birth, l.ready_date;

COMMENT ON VIEW breeder_litter_summary IS
  'Read model for the breeder Home screen. Joins upcoming_litters → litters on shared UUID. The breeder client SELECTs this through breeder-write (op=loadHome).';

-- ---------------------------------------------------------------------------
-- 5. puppy-videos storage bucket — private, signed-URL read only
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
  VALUES ('puppy-videos', 'puppy-videos', false)
  ON CONFLICT (id) DO NOTHING;

-- No public read policy — videos served via Supabase signed URLs only.
-- Service-role writes from breeder-upload-video; admin reads via signed URL.
-- Admin direct read is allowed for parity with puppy-photos.

DROP POLICY IF EXISTS "Admins can read puppy videos" ON storage.objects;
CREATE POLICY "Admins can read puppy videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'puppy-videos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
