-- Parent-based breed structure for upcoming litters.
-- dam_breed / sire_breed = breeding data; display_breed = customer-facing label (kept in sync with breed for backward compat).

alter table public.upcoming_litters
  add column if not exists dam_breed text,
  add column if not exists sire_breed text,
  add column if not exists display_breed text;

-- Backfill: existing rows get display_breed and parent breeds from current breed
update public.upcoming_litters
set
  display_breed = coalesce(display_breed, breed),
  dam_breed = coalesce(dam_breed, breed),
  sire_breed = coalesce(sire_breed, breed)
where display_breed is null or dam_breed is null or sire_breed is null;
