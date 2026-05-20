-- Add columns referenced in the admin PuppyForm save payload that were
-- never added to the puppies table, causing "column not found in schema cache"
-- errors when saving a puppy (microchipped, vaccinations, mom/dad weight).
ALTER TABLE puppies
  ADD COLUMN IF NOT EXISTS microchipped       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vaccinations       text,
  ADD COLUMN IF NOT EXISTS mom_weight_approx  numeric(6,2),
  ADD COLUMN IF NOT EXISTS dad_weight_approx  numeric(6,2);

COMMENT ON COLUMN puppies.microchipped      IS 'Whether the puppy has been microchipped.';
COMMENT ON COLUMN puppies.vaccinations      IS 'Vaccination notes, e.g. "First round included".';
COMMENT ON COLUMN puppies.mom_weight_approx IS 'Approximate weight of the dam in lbs.';
COMMENT ON COLUMN puppies.dad_weight_approx IS 'Approximate weight of the sire in lbs.';
