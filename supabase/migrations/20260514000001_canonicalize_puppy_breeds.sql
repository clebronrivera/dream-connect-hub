-- Wave 3: rewrite legacy puppies.breed strings to the canonical short names
-- defined in src/lib/breed-utils.ts (MAIN_BREEDS). Verified DB values before
-- migration:
--   AKC Toy Poodle x Toy Poodle
--   F1 Labradoodle x F1B Goldendoodle
--   F1B Goldendoodle x Miniature Poodle
--   F1B Mini Goldendoodle x Miniature Poodle
--   Golden Doodles
--   Pomeranian
--   Shih Tzu

DO $$
DECLARE v_count integer;
BEGIN
  UPDATE puppies SET breed = 'Goldendoodle', updated_at = now()
  WHERE breed IN ('Golden Doodles', 'F1 Labradoodle x F1B Goldendoodle');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Canonicalized Goldendoodle rows: %', v_count;

  UPDATE puppies SET breed = 'Mini Goldendoodle', updated_at = now()
  WHERE breed IN (
    'F1B Goldendoodle x Miniature Poodle',
    'F1B Mini Goldendoodle x Miniature Poodle'
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Canonicalized Mini Goldendoodle rows: %', v_count;

  UPDATE puppies SET breed = 'Toy Poodle', updated_at = now()
  WHERE breed = 'AKC Toy Poodle x Toy Poodle';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Canonicalized Toy Poodle rows: %', v_count;
END $$;

COMMENT ON COLUMN puppies.breed IS
  'Canonical short breed name from MAIN_BREEDS in src/lib/breed-utils.ts. '
  'Free-text Other allowed via OTHER_BREED_OPTION escape hatch in PuppyForm.';
