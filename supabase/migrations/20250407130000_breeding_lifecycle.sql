-- 1. Global setting for previous litters visibility
CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  previous_litters_visibility text NOT NULL DEFAULT 'both' CHECK (previous_litters_visibility IN ('current_only', 'previous_only', 'both')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin update site_settings" ON public.site_settings;
CREATE POLICY "Admin update site_settings" ON public.site_settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
);

CREATE OR REPLACE FUNCTION public.set_site_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE PROCEDURE public.set_site_settings_updated_at();

-- 2. Add lifecycle fields to upcoming_litters
ALTER TABLE public.upcoming_litters
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'pre_birth' CHECK (lifecycle_status IN ('pre_birth', 'post_birth', 'previous')),
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS total_puppy_count integer;

-- Migrate existing active/inactive to lifecycle_status if needed
-- If it's not active, maybe it's previous? We'll leave it as pre_birth and let admin sort it out, or we can map inactive to previous.
UPDATE public.upcoming_litters SET lifecycle_status = 'previous' WHERE is_active = false AND lifecycle_status = 'pre_birth';

-- 3. Link puppies to upcoming_litters
ALTER TABLE public.puppies
  ADD COLUMN IF NOT EXISTS upcoming_litter_id uuid REFERENCES public.upcoming_litters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_puppies_upcoming_litter_id ON public.puppies(upcoming_litter_id);

-- 4. Update public read policy for upcoming_litters to respect site_settings
-- Drop the old policy
DROP POLICY IF EXISTS "upcoming_litters_public_read_active" ON public.upcoming_litters;

-- Create new policy
CREATE POLICY "upcoming_litters_public_read_active"
ON public.upcoming_litters FOR SELECT TO anon, authenticated
USING (
  is_active = true AND
  (
    (lifecycle_status IN ('pre_birth', 'post_birth') AND (SELECT previous_litters_visibility FROM public.site_settings WHERE id = 1) IN ('current_only', 'both'))
    OR
    (lifecycle_status = 'previous' AND (SELECT previous_litters_visibility FROM public.site_settings WHERE id = 1) IN ('previous_only', 'both'))
  )
);

