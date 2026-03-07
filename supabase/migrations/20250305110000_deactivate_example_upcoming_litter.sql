-- Deactivate any placeholder/example upcoming litter so it no longer appears on the public page.
-- Safe no-op if no such row exists.
update public.upcoming_litters
set is_active = false
where is_active = true
  and (
    breed ilike '%example%'
    or description ilike '%example%'
    or breed ilike '%placeholder%'
    or description ilike '%placeholder%'
  );
