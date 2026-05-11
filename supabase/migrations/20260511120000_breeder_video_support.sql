-- Breeder Tool — PR 12: video support.
--
-- 1) puppies.video_path: nullable text storing the path inside the
--    puppy-videos bucket. Public site reads via the bucket's public URL.
-- 2) Flip puppy-videos to public read (same model as puppy-photos). The
--    breeder upload still goes through breeder-upload-video with the
--    service role; public read is anon-friendly so the public site can
--    embed the video without minting signed URLs.
--
-- Why public read instead of signed URLs: paths inside the bucket use
-- crypto.randomUUID() (see breeder-upload-photo path scheme), so the URL
-- is effectively unguessable. Matches the puppy-photos posture and
-- avoids per-render URL minting.

ALTER TABLE puppies
  ADD COLUMN IF NOT EXISTS video_path text;

COMMENT ON COLUMN puppies.video_path IS
  'Optional path inside the puppy-videos bucket. Breeder uploads via the breeder-upload-video edge function (service role); public site reads via the bucket public URL.';

-- Flip puppy-videos to public read so the buyer-facing detail modal can
-- embed a <video> element directly.
UPDATE storage.buckets SET public = true WHERE id = 'puppy-videos';

-- Replace the admin-only read policy with a public read policy.
DROP POLICY IF EXISTS "Admins can read puppy videos" ON storage.objects;

DROP POLICY IF EXISTS "Public read puppy videos" ON storage.objects;
CREATE POLICY "Public read puppy videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'puppy-videos');
