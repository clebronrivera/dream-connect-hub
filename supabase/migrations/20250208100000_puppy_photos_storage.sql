-- Migration: Puppy photos storage bucket
-- Enables uploading puppy images to Supabase Storage so the site can display them
-- for puppy images. The puppies.primary_photo and puppies.photos columns
-- store URLs; use these to store Supabase Storage public URLs after upload.

-- Create a public bucket for puppy photos (anyone can view, only admins can upload/delete)
-- Restrict file types/size in your app or via Dashboard (Bucket settings) if desired
INSERT INTO storage.buckets (id, name, public)
VALUES ('puppy-photos', 'puppy-photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Allow anyone to read (SELECT) objects in puppy-photos (public bucket)
CREATE POLICY "Public read puppy photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'puppy-photos');

-- Allow authenticated admins to upload (INSERT) to puppy-photos
CREATE POLICY "Admins can upload puppy photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'puppy-photos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow authenticated admins to update objects in puppy-photos
CREATE POLICY "Admins can update puppy photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'puppy-photos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow authenticated admins to delete objects in puppy-photos
CREATE POLICY "Admins can delete puppy photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'puppy-photos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
