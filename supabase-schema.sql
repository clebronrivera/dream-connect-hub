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

-- User Roles Table (for admin authentication)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE puppy_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

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

-- Only admins can read (will be set up after admin users are created)
-- For now, you can manually grant access or create policies after setting up admin auth
-- Example policy (uncomment and adjust after admin setup):
-- CREATE POLICY "Allow admin read on puppy_inquiries"
--   ON puppy_inquiries FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_roles
--       WHERE user_roles.user_id = auth.uid()
--       AND user_roles.role = 'admin'
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
