-- Upcoming Litters: public-facing "coming soon" cards (no relation to puppies/litters).
-- Contact form can store upcoming_litter_id on contact_messages.

-- 1) upcoming_litters
create table if not exists public.upcoming_litters (
  id uuid primary key default gen_random_uuid(),
  breed text not null,
  due_label text not null,
  price_label text,
  deposit_amount integer not null default 0,
  description text,
  placeholder_image_path text,
  deposit_link text,
  cta_contact_link text default '/contact',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_upcoming_litters_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_upcoming_litters_updated_at on public.upcoming_litters;
create trigger trg_upcoming_litters_updated_at
before update on public.upcoming_litters
for each row
execute procedure public.set_upcoming_litters_updated_at();

-- 2) Contact messages: add upcoming_litter_id
alter table public.contact_messages
add column if not exists upcoming_litter_id uuid references public.upcoming_litters(id);

-- Optional: preserve label at time of submission (see 20250225100000_contact_messages_upcoming_litter_label.sql)
-- alter table public.contact_messages add column if not exists upcoming_litter_label text;

-- 3) RLS
alter table public.upcoming_litters enable row level security;

-- Public read active only
drop policy if exists "upcoming_litters_public_read_active" on public.upcoming_litters;
create policy "upcoming_litters_public_read_active"
on public.upcoming_litters for select to anon, authenticated
using (is_active = true);

-- Admin read all
drop policy if exists "upcoming_litters_admin_read_all" on public.upcoming_litters;
create policy "upcoming_litters_admin_read_all"
on public.upcoming_litters for select to authenticated
using (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

-- Admin insert
drop policy if exists "upcoming_litters_admin_insert" on public.upcoming_litters;
create policy "upcoming_litters_admin_insert"
on public.upcoming_litters for insert to authenticated
with check (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

-- Admin update
drop policy if exists "upcoming_litters_admin_update" on public.upcoming_litters;
create policy "upcoming_litters_admin_update"
on public.upcoming_litters for update to authenticated
using (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

-- Admin delete
drop policy if exists "upcoming_litters_admin_delete" on public.upcoming_litters;
create policy "upcoming_litters_admin_delete"
on public.upcoming_litters for delete to authenticated
using (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
