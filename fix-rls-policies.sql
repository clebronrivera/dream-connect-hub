-- Fix RLS Policies for Form Submissions
-- Run this SQL in your Supabase SQL Editor to fix form submission issues
-- This will drop and recreate the INSERT policies to allow public form submissions

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public insert on contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "Allow public insert on puppy_inquiries" ON puppy_inquiries;
DROP POLICY IF EXISTS "Allow public insert on consultation_requests" ON consultation_requests;
DROP POLICY IF EXISTS "Allow public insert on product_inquiries" ON product_inquiries;

-- Recreate policies: Allow public INSERT (form submissions) for anonymous and authenticated users
CREATE POLICY "Allow public insert on contact_messages"
  ON contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

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

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('contact_messages', 'puppy_inquiries', 'consultation_requests', 'product_inquiries')
ORDER BY tablename, policyname;

-- Fix RLS Policies for Form Submissions
-- Run this SQL in Supabase SQL Editor.

-- Make subject optional for common contact forms
ALTER TABLE IF EXISTS public.contact_messages
  ALTER COLUMN subject DROP NOT NULL;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.puppy_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_inquiries ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policies (avoid conflicts)
DROP POLICY IF EXISTS "Allow public insert on contact_messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow public insert on puppy_inquiries" ON public.puppy_inquiries;
DROP POLICY IF EXISTS "Allow public insert on consultation_requests" ON public.consultation_requests;
DROP POLICY IF EXISTS "Allow public insert on product_inquiries" ON public.product_inquiries;

-- Recreate INSERT policies for anon/authenticated
CREATE POLICY "Allow public insert on contact_messages"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert on puppy_inquiries"
  ON public.puppy_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert on consultation_requests"
  ON public.consultation_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert on product_inquiries"
  ON public.product_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure INSERT privileges exist
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT INSERT ON public.puppy_inquiries TO anon, authenticated;
GRANT INSERT ON public.consultation_requests TO anon, authenticated;
GRANT INSERT ON public.product_inquiries TO anon, authenticated;

-- Verify policies
SELECT schemaname, tablename, policyname, roles, cmd, permissive, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('contact_messages','puppy_inquiries','consultation_requests','product_inquiries')
ORDER BY tablename, policyname;