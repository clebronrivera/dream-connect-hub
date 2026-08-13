-- Breeder tool: support multiple named PINs (e.g. Yolanda + an admin
-- backup pin), replacing the single-row breeder_config table.
--
-- All PINs are equal-access — this is not a role system, just multiple
-- valid credentials into the same breeder portal, each labeled so the
-- admin session list (BreederPasscodeSettings) can show who logged in.

CREATE TABLE IF NOT EXISTS breeder_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  passcode_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_breeder_pins_label_lower
  ON breeder_pins (lower(label));

ALTER TABLE breeder_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_breeder_pins ON breeder_pins;
CREATE POLICY admin_all_breeder_pins ON breeder_pins FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Carry the existing single pin forward under the "Yolanda" label so her
-- current pin keeps working without her having to re-enter anything.
INSERT INTO breeder_pins (label, passcode_hash, created_at, updated_at)
SELECT 'Yolanda', passcode_hash, updated_at, updated_at
FROM breeder_config
WHERE id = 1
ON CONFLICT (lower(label)) DO NOTHING;

-- Record which named pin was used at login, for the admin session list.
ALTER TABLE breeder_sessions
  ADD COLUMN IF NOT EXISTS pin_label text;

COMMENT ON TABLE breeder_config IS
  'Superseded by breeder_pins (multi-pin support, Aug 2026). No longer read or written by app code; kept only as a rollback reference.';
