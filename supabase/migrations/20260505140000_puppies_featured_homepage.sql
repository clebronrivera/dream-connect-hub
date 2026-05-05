-- Featured flag for homepage preview (admin "Feature on homepage" on puppy form).
-- Only rows with status = 'Available' AND featured = true are shown on the public home grid.

ALTER TABLE public.puppies
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.puppies.featured IS 'When true and status is Available, puppy may appear in the homepage featured grid (ordered by display_order).';

CREATE INDEX IF NOT EXISTS idx_puppies_home_featured
  ON public.puppies (featured, status, display_order)
  WHERE featured = true AND status = 'Available';
