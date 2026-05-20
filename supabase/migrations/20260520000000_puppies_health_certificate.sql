-- Add health_certificate column to puppies.
-- This column tracks whether a health certificate has been issued for the puppy.
-- The litters table already has health_certificate_default (added 20250224);
-- this column allows per-puppy override and is what the admin PuppyForm saves.
ALTER TABLE puppies
  ADD COLUMN IF NOT EXISTS health_certificate boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN puppies.health_certificate IS
  'Whether a health certificate has been issued for this puppy. Inherited from litters.health_certificate_default when a puppy is seeded from a litter; can be overridden per-puppy in the admin form.';
