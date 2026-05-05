-- Simplify upcoming litters by removing reservation/deposit slot mechanics.
-- Also add explicit puppy visibility/deceased booleans for public listing control.

-- 1) Expand puppies visibility contract
ALTER TABLE public.puppies
  ADD COLUMN IF NOT EXISTS is_publicly_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deceased boolean NOT NULL DEFAULT false;

UPDATE public.puppies
SET
  is_publicly_visible = CASE WHEN status = 'Available' THEN true ELSE false END,
  is_deceased = COALESCE(is_deceased, false)
WHERE is_publicly_visible IS DISTINCT FROM CASE WHEN status = 'Available' THEN true ELSE false END
   OR is_deceased IS NULL;

CREATE INDEX IF NOT EXISTS idx_puppies_public_visible
  ON public.puppies (is_publicly_visible, is_deceased, status, display_order, created_at)
  WHERE is_publicly_visible = true AND is_deceased = false;

-- Replace legacy public SELECT policies with explicit boolean guard.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'puppies'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.puppies', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY puppies_public_read_visible
ON public.puppies
FOR SELECT
TO anon, authenticated
USING (is_publicly_visible = true AND is_deceased = false AND status = 'Available');

-- 2) Expand upcoming_litters with explicit born counts
ALTER TABLE public.upcoming_litters
  ADD COLUMN IF NOT EXISTS male_puppy_count integer,
  ADD COLUMN IF NOT EXISTS female_puppy_count integer,
  ADD COLUMN IF NOT EXISTS total_puppy_count integer;

ALTER TABLE public.upcoming_litters
  DROP CONSTRAINT IF EXISTS upcoming_litters_puppy_counts_nonnegative;

ALTER TABLE public.upcoming_litters
  ADD CONSTRAINT upcoming_litters_puppy_counts_nonnegative
  CHECK (
    COALESCE(male_puppy_count, 0) >= 0
    AND COALESCE(female_puppy_count, 0) >= 0
    AND COALESCE(total_puppy_count, 0) >= 0
  );

-- 3) Retire placeholder-slot infrastructure safely
DROP TRIGGER IF EXISTS set_hold_on_deposit_request ON public.deposit_requests;
DROP TRIGGER IF EXISTS update_hold_on_request_status ON public.deposit_requests;
DROP FUNCTION IF EXISTS public.set_placeholder_hold_on_request();
DROP FUNCTION IF EXISTS public.update_placeholder_hold_on_status();

DROP TRIGGER IF EXISTS trg_upcoming_litters_sync_placeholders ON public.upcoming_litters;
DROP TRIGGER IF EXISTS trg_upcoming_litters_seed_placeholders ON public.upcoming_litters;
DROP FUNCTION IF EXISTS public.sync_upcoming_litter_placeholders_for_row();
DROP FUNCTION IF EXISTS public.seed_placeholders_for_new_upcoming_litter();
DROP TRIGGER IF EXISTS trg_upcoming_litter_puppy_placeholders_updated_at ON public.upcoming_litter_puppy_placeholders;
DROP FUNCTION IF EXISTS public.set_upcoming_litter_puppy_placeholders_updated_at();

ALTER TABLE IF EXISTS public.deposit_requests
  DROP CONSTRAINT IF EXISTS deposit_requests_upcoming_puppy_placeholder_id_fkey;
ALTER TABLE IF EXISTS public.contact_messages
  DROP CONSTRAINT IF EXISTS contact_messages_upcoming_puppy_placeholder_id_fkey;

DROP INDEX IF EXISTS public.idx_upcoming_puppy_ph_litter;
DROP INDEX IF EXISTS public.idx_placeholders_hold;

DROP POLICY IF EXISTS upcoming_litter_puppy_placeholders_public_read ON public.upcoming_litter_puppy_placeholders;
DROP POLICY IF EXISTS upcoming_litter_puppy_placeholders_admin_all ON public.upcoming_litter_puppy_placeholders;

DROP TABLE IF EXISTS public.upcoming_litter_puppy_placeholders;

-- 4) Contract upcoming_litters schema (remove deposit/slot-era fields)
ALTER TABLE public.upcoming_litters
  DROP COLUMN IF EXISTS deposit_amount,
  DROP COLUMN IF EXISTS refundable_deposit_amount,
  DROP COLUMN IF EXISTS deposits_reserved_count,
  DROP COLUMN IF EXISTS max_deposit_slots,
  DROP COLUMN IF EXISTS deposit_link,
  DROP COLUMN IF EXISTS cta_contact_link,
  DROP COLUMN IF EXISTS placeholder_image_path,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS sort_order;
