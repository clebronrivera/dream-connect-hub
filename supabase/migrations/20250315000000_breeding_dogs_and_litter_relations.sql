-- Breeding dogs (adult sires/dams) and upcoming_litters relation.
-- breeding_dogs: name, role (Sire/Dam), breed, composition, color.
-- upcoming_litters: dam_id, sire_id (FK to breeding_dogs), breeding_date, expected_whelping_date, min/max expected puppies.

-- 1) breeding_dogs
create table if not exists public.breeding_dogs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('Sire', 'Dam')),
  breed text not null,
  composition text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_breeding_dogs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_breeding_dogs_updated_at on public.breeding_dogs;
create trigger trg_breeding_dogs_updated_at
before update on public.breeding_dogs
for each row execute procedure public.set_breeding_dogs_updated_at();

create index if not exists idx_breeding_dogs_role on public.breeding_dogs(role);

alter table public.breeding_dogs enable row level security;

create policy "breeding_dogs_admin_all"
on public.breeding_dogs for all to authenticated
using (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

-- 2) upcoming_litters: add dam_id, sire_id, expected_whelping_date, min/max expected puppies
alter table public.upcoming_litters
  add column if not exists dam_id uuid references public.breeding_dogs(id),
  add column if not exists sire_id uuid references public.breeding_dogs(id),
  add column if not exists expected_whelping_date date,
  add column if not exists min_expected_puppies integer,
  add column if not exists max_expected_puppies integer;

create index if not exists idx_upcoming_litters_dam_id on public.upcoming_litters(dam_id);
create index if not exists idx_upcoming_litters_sire_id on public.upcoming_litters(sire_id);
