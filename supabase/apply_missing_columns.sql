-- Run this in Supabase Dashboard → SQL Editor if you see:
-- "Could not find the 'breeding_date' column of 'upcoming_litters' in the schema cache"
-- This applies the same changes as the migrations that add breeding_date and related columns.

-- 1) Parents + breeding_date (from 20250305000000)
ALTER TABLE public.upcoming_litters
  ADD COLUMN IF NOT EXISTS dam_name text,
  ADD COLUMN IF NOT EXISTS sire_name text,
  ADD COLUMN IF NOT EXISTS dam_photo_path text,
  ADD COLUMN IF NOT EXISTS sire_photo_path text,
  ADD COLUMN IF NOT EXISTS example_puppy_image_paths text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS breeding_date date;

-- 2) Due label optional (from 20250305100000)
ALTER TABLE public.upcoming_litters
  ALTER COLUMN due_label DROP NOT NULL;

-- 3) Parent breeds + display breed (from 20250306000000)
ALTER TABLE public.upcoming_litters
  ADD COLUMN IF NOT EXISTS dam_breed text,
  ADD COLUMN IF NOT EXISTS sire_breed text,
  ADD COLUMN IF NOT EXISTS display_breed text;

UPDATE public.upcoming_litters
SET
  display_breed = COALESCE(display_breed, breed),
  dam_breed = COALESCE(dam_breed, breed),
  sire_breed = COALESCE(sire_breed, breed)
WHERE display_breed IS NULL OR dam_breed IS NULL OR sire_breed IS NULL;

-- 4) Upcoming Litter inquiry flow (from 20250306110000)
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS interest_options text[];
