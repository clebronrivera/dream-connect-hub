-- ============================================================================
-- TRAINING PLAN SUBMISSIONS — Lead capture + rate limiting for AI training plans
-- ============================================================================

CREATE TABLE training_plan_submissions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 text NOT NULL,
  dog_name              text NOT NULL,
  breed                 text,
  age                   text,              -- e.g. "6 months", "2 years"
  weight                text,              -- optional
  living_situation      text,              -- apartment, house_yard, house_no_yard, farm
  has_kids              boolean,
  has_other_pets        boolean,
  experience_level      text,              -- first_time, some, experienced
  time_per_day          text,              -- e.g. "30min", "1hr", "2hr+"
  problem_type          text NOT NULL,     -- potty_training, biting, crate_training, etc.
  problem_description   text,
  frequency             text,              -- rarely, sometimes, often, always
  whats_been_tried      text,
  ip_address            inet,
  user_agent            text,
  plan_generated_at     timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE training_plan_submissions ENABLE ROW LEVEL SECURITY;

-- Public can insert
CREATE POLICY public_insert_training ON training_plan_submissions
  FOR INSERT WITH CHECK (true);

-- Admin can read all
CREATE POLICY admin_read_training ON training_plan_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Index for IP rate limiting
CREATE INDEX idx_training_ip_created ON training_plan_submissions (ip_address, created_at DESC);
CREATE INDEX idx_training_email ON training_plan_submissions (email);
