-- Supabase Database Schema for Puppy Heaven
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Puppy Inquiries Table
CREATE TABLE IF NOT EXISTS puppy_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Optional external id (e.g. from an import)
  puppy_id TEXT,

  -- Human-friendly label shown on site (keep for backwards compatibility)
  puppy_name TEXT,

  -- Normalized, stable identifier used across site and Supabase
  puppy_code TEXT,

  -- Snapshot of the display name at time of submission (optional)
  puppy_display_name TEXT,

  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,

  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultation Requests Table
CREATE TABLE IF NOT EXISTS consultation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Pet / consultation intake
  pet_name TEXT NOT NULL,
  pet_type TEXT NOT NULL,
  breed TEXT,
  age TEXT,
  behavioral_concerns TEXT[],
  goals TEXT,
  preferred_contact TEXT,
  availability TEXT,
  consent_to_contact BOOLEAN DEFAULT FALSE,

  -- Requestor
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state TEXT,

  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Inquiries Table
CREATE TABLE IF NOT EXISTS product_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (source of truth for admin; app uses profiles.role)
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('admin', 'public')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business events: admin-only log of milestones (SEO, marketing, etc.) to correlate with traffic
CREATE TABLE IF NOT EXISTS business_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_business_events_event_date ON business_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_business_events_created_at ON business_events(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE puppy_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_events ENABLE ROW LEVEL SECURITY;

-- Policies: Allow public INSERT (form submissions), but only admins can SELECT
-- Public can insert (submit forms)
CREATE POLICY "Allow public insert on puppy_inquiries"
  ON puppy_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert on consultation_requests"
  ON consultation_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert on product_inquiries"
  ON product_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert on contact_messages"
  ON contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Business events: admin-only (no public access)
CREATE POLICY "business_events_admin_select" ON business_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "business_events_admin_insert" ON business_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "business_events_admin_update" ON business_events FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "business_events_admin_delete" ON business_events FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Only admins can read (will be set up after admin users are created)
-- For now, you can manually grant access or create policies after setting up admin auth
-- Example policy (uncomment and adjust after admin setup):
-- CREATE POLICY "Allow admin read on puppy_inquiries"
--   ON puppy_inquiries FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.user_id = auth.uid()
--       AND profiles.role = 'admin'
--     )
--   );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_puppy_inquiries_status ON puppy_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_puppy_inquiries_created_at ON puppy_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_puppy_inquiries_puppy_code ON puppy_inquiries(puppy_code);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_status ON consultation_requests(status);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_created_at ON consultation_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_email ON consultation_requests(email);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_status_created_at ON consultation_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_inquiries_status ON product_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_product_inquiries_created_at ON product_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- Puppies table (idempotent base; subsequent migrations evolve the schema)
CREATE TABLE IF NOT EXISTS puppies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puppy_id TEXT UNIQUE,
  name TEXT NOT NULL,
  breed TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  color TEXT,
  date_of_birth DATE,
  age_weeks INTEGER,
  ready_date DATE,
  base_price DECIMAL(10, 2),
  discount_active BOOLEAN DEFAULT false,
  discount_amount DECIMAL(10, 2),
  discount_note TEXT,
  final_price DECIMAL(10, 2),
  status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Pending', 'Sold', 'Reserved')),
  photos TEXT[],
  primary_photo TEXT,
  description TEXT,
  mom_weight_approx INTEGER,
  dad_weight_approx INTEGER,
  vaccinations TEXT,
  health_certificate BOOLEAN DEFAULT false,
  microchipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_puppies_status ON puppies(status);
CREATE INDEX IF NOT EXISTS idx_puppies_breed ON puppies(breed);
CREATE INDEX IF NOT EXISTS idx_puppies_featured ON puppies(featured);
CREATE INDEX IF NOT EXISTS idx_puppies_display_order ON puppies(display_order);

ALTER TABLE puppies ENABLE ROW LEVEL SECURITY;

-- Anonymous users can view puppies on the public site
DROP POLICY IF EXISTS "Anyone can view puppies" ON puppies;
CREATE POLICY "Anyone can view puppies"
  ON puppies FOR SELECT
  USING (true);

-- Admin write access is granted by later migrations using profiles.role = 'admin'.

CREATE OR REPLACE FUNCTION update_puppies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_puppies_updated_at ON puppies;
CREATE TRIGGER set_puppies_updated_at
  BEFORE UPDATE ON puppies
  FOR EACH ROW
  EXECUTE FUNCTION update_puppies_updated_at();
