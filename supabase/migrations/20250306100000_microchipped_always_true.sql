-- Standardize microchipping as always included: set column defaults to true and backfill existing rows.

-- Puppies: default true, backfill any false/NULL to true
ALTER TABLE puppies
  ALTER COLUMN microchipped SET DEFAULT true;

UPDATE puppies
  SET microchipped = true
  WHERE microchipped IS NULL OR microchipped = false;

-- Litters: default true for new litters, backfill
ALTER TABLE litters
  ALTER COLUMN microchipped_default SET DEFAULT true;

UPDATE litters
  SET microchipped_default = true
  WHERE microchipped_default IS NULL OR microchipped_default = false;
