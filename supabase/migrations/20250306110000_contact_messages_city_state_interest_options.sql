-- Upcoming Litter inquiry flow: store city, state, and selected interest options.
alter table public.contact_messages
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists interest_options text[];
