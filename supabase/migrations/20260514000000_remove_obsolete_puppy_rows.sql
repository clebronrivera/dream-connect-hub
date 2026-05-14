-- Wave 2: clean obsolete puppy media and rows.
--
-- 1) Remove Gus's "available picture coming soon" placeholder graphic so the
--    2-photo layout doesn't waste a slot on a placeholder.
-- 2) Hard-delete Star x Koko #7 (verified prior to migration: no
--    puppy_inquiries reference its id; the DO block re-asserts at apply time).
-- 3) Trim trailing whitespace on `puppies.breed` so the canonical
--    normalization in the next migration matches cleanly.

-- 1) Gus placeholder cleanup
UPDATE puppies
SET
  photos = COALESCE(
    ARRAY(
      SELECT p
      FROM unnest(photos) AS p
      WHERE p NOT LIKE '%1772148079246-g7z94i7.png%'
    ),
    ARRAY[]::text[]
  ),
  primary_photo = CASE
    WHEN primary_photo LIKE '%1772148079246-g7z94i7.png%'
      THEN '1771986670365-8sn24m8.jpg'
    ELSE primary_photo
  END,
  updated_at = now()
WHERE id = '6980d673-9d12-4673-b7f5-183193bd5481';

-- 2) Star x Koko #7 deletion (guarded)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM puppy_inquiries
    WHERE puppy_id = '7f2195c3-6f49-445f-84c1-cda4e3a4341b'
  ) THEN
    RAISE EXCEPTION
      'Cannot delete Star x Koko #7: % puppy_inquiries reference its id',
      (
        SELECT count(*) FROM puppy_inquiries
        WHERE puppy_id = '7f2195c3-6f49-445f-84c1-cda4e3a4341b'
      );
  END IF;
END $$;

DELETE FROM puppies
WHERE id = '7f2195c3-6f49-445f-84c1-cda4e3a4341b';

-- 3) Trim trailing whitespace on breed values
UPDATE puppies
SET breed = TRIM(breed), updated_at = now()
WHERE breed <> TRIM(breed);
