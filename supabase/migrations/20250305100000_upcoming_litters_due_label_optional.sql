-- Make due_label optional; it can be derived from breeding_date in the app.
alter table public.upcoming_litters
  alter column due_label drop not null;
