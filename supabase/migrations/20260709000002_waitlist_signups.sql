-- Phase 5.3: waitlist funnel. "No puppies right now" used to be a dead end —
-- this captures the lead so a matching puppy can be offered when one's ready.
CREATE TABLE waitlist_signups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  phone           text,
  breed_interest  text,
  size_interest   text,
  timeframe       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Public can insert (lead capture from <WaitlistForm />) — same accepted
-- shape as public_insert_training on training_plan_submissions. Scoped
-- explicitly TO anon, authenticated rather than left unscoped (PUBLIC).
CREATE POLICY public_insert_waitlist_signups ON waitlist_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admin can read all.
CREATE POLICY admin_read_waitlist_signups ON waitlist_signups
  FOR SELECT USING (public.is_admin());

CREATE INDEX idx_waitlist_signups_created_at ON waitlist_signups (created_at DESC);

COMMENT ON TABLE waitlist_signups IS
  'Leads captured from the "no matching puppies" empty state on /puppies and city x breed pages. Admin-only read.';
