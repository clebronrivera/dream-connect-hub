-- Align storage policies with profiles (source of truth for admin).
-- Earlier migrations 20250208100000 and 20250209180000 used user_roles.
-- This migration switches to profiles so all admin checks are consistent.

-- Puppy photos bucket: drop user_roles-based policies and create profiles-based ones
DROP POLICY IF EXISTS "Admins can upload puppy photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update puppy photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete puppy photos" ON storage.objects;

CREATE POLICY "Admins can upload puppy photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'puppy-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update puppy photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'puppy-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete puppy photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'puppy-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Site assets bucket: drop user_roles-based policies and create profiles-based ones
DROP POLICY IF EXISTS "Admins can upload site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete site assets" ON storage.objects;

CREATE POLICY "Admins can upload site assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update site assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete site assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
