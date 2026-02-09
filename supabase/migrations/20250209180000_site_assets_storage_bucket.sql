-- Public bucket for site assets (banner, etc.) — no local files needed.
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Anyone can read
CREATE POLICY "Public read site assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'site-assets');

-- Authenticated admins can upload/update/delete (same pattern as puppy-photos)
CREATE POLICY "Admins can upload site assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update site assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete site assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
