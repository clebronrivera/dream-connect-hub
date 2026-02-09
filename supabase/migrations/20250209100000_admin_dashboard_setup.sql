-- Migration: Admin Dashboard Setup
-- Consolidates admin access to use profiles table instead of user_roles
-- Adds missing admin policies for product_inquiries
-- Updates puppies INSERT/DELETE and storage policies to use profiles

-- ============================================================================
-- 1. MIGRATE user_roles TO profiles (one-time migration)
-- ============================================================================

-- Migrate any existing admin users from user_roles to profiles
INSERT INTO profiles (user_id, role, created_at)
SELECT user_id, role, created_at 
FROM user_roles
WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 2. ADD ADMIN POLICIES FOR product_inquiries (using profiles)
-- ============================================================================

-- Admin can read product_inquiries
CREATE POLICY IF NOT EXISTS "Admin can read product_inquiries" 
ON product_inquiries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admin can update product_inquiries
CREATE POLICY IF NOT EXISTS "Admin can update product_inquiries" 
ON product_inquiries FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- 3. UPDATE PUPPIES INSERT/DELETE POLICIES TO USE profiles
-- ============================================================================

-- Drop old policies that reference user_roles
DROP POLICY IF EXISTS "Admins can insert puppies" ON puppies;
DROP POLICY IF EXISTS "Admins can delete puppies" ON puppies;

-- Create new policies using profiles
CREATE POLICY "Admin can insert puppies" 
ON puppies FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin can delete puppies" 
ON puppies FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- 4. UPDATE STORAGE POLICIES TO USE profiles
-- ============================================================================

-- Drop old storage policies that reference user_roles
DROP POLICY IF EXISTS "Admins can upload puppy photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update puppy photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete puppy photos" ON storage.objects;

-- Create new storage policies using profiles
CREATE POLICY "Admin can upload puppy photos" 
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'puppy-photos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin can update puppy photos" 
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'puppy-photos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin can delete puppy photos" 
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'puppy-photos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- 5. ADD INDEXES FOR PERFORMANCE (if not already exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_product_inquiries_status ON product_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_product_inquiries_created_at ON product_inquiries(created_at DESC);

COMMENT ON POLICY "Admin can read product_inquiries" ON product_inquiries IS 'Allows admins (via profiles.role) to read all product inquiries';
COMMENT ON POLICY "Admin can update product_inquiries" ON product_inquiries IS 'Allows admins (via profiles.role) to update product inquiry status and other fields';
