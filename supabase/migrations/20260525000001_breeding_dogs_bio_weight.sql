-- Adds public-facing fields shown on /our-dogs:
--   bio        — short personality blurb (optional)
--   weight_lbs — actual adult weight (optional). When NULL the UI falls back to
--                the breed's typical range from src/lib/breed-sizes.ts.
ALTER TABLE public.breeding_dogs
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS weight_lbs numeric(5,1);

ALTER TABLE public.breeding_dogs
  ADD CONSTRAINT breeding_dogs_weight_lbs_check
  CHECK (weight_lbs IS NULL OR (weight_lbs > 0 AND weight_lbs < 300));
