-- Security-advisor hardening (2026-06-19) — storage buckets
--
-- Stops anonymous LISTING of public storage buckets
-- (`public_bucket_allows_listing`). Public object READS are unaffected: all five
-- buckets are public=true, so the app's getPublicUrl() reads go through the
-- public CDN object path (/storage/v1/object/public/...), which does NOT evaluate
-- these SELECT policies. Verified the app never calls the storage .list() API on
-- any of these buckets. Admin INSERT/UPDATE/DELETE policies and the
-- testimonial-photos public *upload* policy are intentionally left intact.
--
-- Isolated into its own migration so a storage-privilege issue can't roll back
-- the public-schema hardening. Idempotent.

DROP POLICY IF EXISTS "Public read product photos"    ON storage.objects;
DROP POLICY IF EXISTS "Public read puppy photos"      ON storage.objects;
DROP POLICY IF EXISTS "Public read puppy videos"      ON storage.objects;
DROP POLICY IF EXISTS "Public read site assets"       ON storage.objects;
DROP POLICY IF EXISTS public_read_testimonial_photos  ON storage.objects;
