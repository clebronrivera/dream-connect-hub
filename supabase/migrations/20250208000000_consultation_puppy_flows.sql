-- Migration: Consultation and Puppy Flows (Decisions Locked In)
-- Run in Supabase SQL Editor. Adds new columns and status model active|inactive; creates profiles for admin.

-- 1. consultation_requests: new columns + status active|inactive
ALTER TABLE consultation_requests
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS consultation_type TEXT CHECK (consultation_type IN ('starter', 'readiness', 'behavior')),
  ADD COLUMN IF NOT EXISTS source_page TEXT,
  ADD COLUMN IF NOT EXISTS purchased_from_puppy_heaven BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS purchase_date_approx TEXT,
  ADD COLUMN IF NOT EXISTS puppy_name_at_purchase TEXT,
  ADD COLUMN IF NOT EXISTS breed_at_purchase TEXT,
  ADD COLUMN IF NOT EXISTS phone_at_purchase TEXT,
  ADD COLUMN IF NOT EXISTS intake_payload JSONB;

-- Allow active|inactive; migrate existing to active
ALTER TABLE consultation_requests DROP CONSTRAINT IF EXISTS consultation_requests_status_check;
UPDATE consultation_requests SET status = 'active' WHERE status IS NOT NULL AND status NOT IN ('active', 'inactive');
ALTER TABLE consultation_requests ADD CONSTRAINT consultation_requests_status_check CHECK (status IN ('active', 'inactive'));
ALTER TABLE consultation_requests ALTER COLUMN status SET DEFAULT 'active';

-- Pet fields optional for readiness/behavior (no pet yet)
ALTER TABLE consultation_requests ALTER COLUMN pet_name DROP NOT NULL;
ALTER TABLE consultation_requests ALTER COLUMN pet_type DROP NOT NULL;

-- 2. puppy_inquiries: new columns + status active|inactive
ALTER TABLE puppy_inquiries
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS interested_specific BOOLEAN,
  ADD COLUMN IF NOT EXISTS timeline TEXT,
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS household_description TEXT,
  ADD COLUMN IF NOT EXISTS preferences JSONB,
  ADD COLUMN IF NOT EXISTS additional_comments TEXT,
  ADD COLUMN IF NOT EXISTS needs_followup BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS puppy_name_at_submit TEXT,
  ADD COLUMN IF NOT EXISTS puppy_status_at_submit TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to TEXT;

ALTER TABLE puppy_inquiries DROP CONSTRAINT IF EXISTS puppy_inquiries_status_check;
UPDATE puppy_inquiries SET status = 'active' WHERE status IS NOT NULL AND status NOT IN ('active', 'inactive');
ALTER TABLE puppy_inquiries ADD CONSTRAINT puppy_inquiries_status_check CHECK (status IN ('active', 'inactive'));
ALTER TABLE puppy_inquiries ALTER COLUMN status SET DEFAULT 'active';

-- 3. contact_messages: admin_notes + status active|inactive
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE contact_messages DROP CONSTRAINT IF EXISTS contact_messages_status_check;
UPDATE contact_messages SET status = 'active' WHERE status IS NOT NULL AND status NOT IN ('active', 'inactive');
ALTER TABLE contact_messages ADD CONSTRAINT contact_messages_status_check CHECK (status IN ('active', 'inactive'));
ALTER TABLE contact_messages ALTER COLUMN status SET DEFAULT 'active';

-- 4. profiles table for admin (role: admin | public)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('admin', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS: public can insert into submission tables; select puppies where status = 'Available'
-- (Existing insert policies remain. Add select for puppies and admin select/update.)

-- Admin policies for submission tables (profiles.role = 'admin')
DROP POLICY IF EXISTS "Admin can read consultation_requests" ON consultation_requests;
CREATE POLICY "Admin can read consultation_requests" ON consultation_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admin can update consultation_requests" ON consultation_requests;
CREATE POLICY "Admin can update consultation_requests" ON consultation_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admin can read puppy_inquiries" ON puppy_inquiries;
CREATE POLICY "Admin can read puppy_inquiries" ON puppy_inquiries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admin can update puppy_inquiries" ON puppy_inquiries;
CREATE POLICY "Admin can update puppy_inquiries" ON puppy_inquiries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admin can read contact_messages" ON contact_messages;
CREATE POLICY "Admin can read contact_messages" ON contact_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admin can update contact_messages" ON contact_messages;
CREATE POLICY "Admin can update contact_messages" ON contact_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Puppies: public sees only Available; admin sees all and can update
DROP POLICY IF EXISTS "Anyone can view puppies" ON puppies;
CREATE POLICY "Public can view available puppies only"
  ON puppies FOR SELECT TO anon, authenticated
  USING (status = 'Available');

DROP POLICY IF EXISTS "Admin can view all puppies" ON puppies;
CREATE POLICY "Admin can view all puppies"
  ON puppies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update puppies" ON puppies;
CREATE POLICY "Admin can update puppies"
  ON puppies FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Profiles: users can read own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

COMMENT ON TABLE profiles IS 'Links auth.users to role (admin | public). Create admin in Supabase Auth then INSERT into profiles (user_id, role) VALUES (auth_uid, ''admin'').';
