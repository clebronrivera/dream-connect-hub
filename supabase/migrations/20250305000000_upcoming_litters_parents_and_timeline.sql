-- Upcoming litters: parents (dam/sire), optional photos, example puppy images, breeding date.
-- Birth window (60–67 days) and go-home window (+56 days) are computed in app from breeding_date.

alter table public.upcoming_litters
  add column if not exists dam_name text,
  add column if not exists sire_name text,
  add column if not exists dam_photo_path text,
  add column if not exists sire_photo_path text,
  add column if not exists example_puppy_image_paths text[] default '{}',
  add column if not exists breeding_date date;
