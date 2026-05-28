-- Security hardening — audit Phase 2 (L4).
--
-- The testimonial-photos bucket is public-read with anon INSERT (the public
-- review form uploads a photo client-side, then submit-testimonial stores the
-- path). That open INSERT had no type/size constraint, so it could be abused to
-- host arbitrary files (HTML/JS/PDF/executables) on a public, business-branded
-- origin. Constrain it to image uploads under 10 MB. Legitimate photo uploads
-- (jpeg/png/webp/gif/heic) are unaffected; non-image content is rejected at the
-- storage layer.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/*'],
    file_size_limit = 10485760  -- 10 MB
WHERE id = 'testimonial-photos';
