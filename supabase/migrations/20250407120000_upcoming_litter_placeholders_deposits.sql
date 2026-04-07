-- Upcoming litter puppy placeholders (pre-birth reservation slots), deposit slot counts,
-- and optional link from contact_messages to a selected placeholder.

-- 1) Litter-level deposit urgency (public site shows "X of 4" reserved; only four deposit
-- slots are offered per litter so we can manage smaller litters or unexpected outcomes).
alter table public.upcoming_litters
  add column if not exists deposits_reserved_count integer not null default 2,
  add column if not exists max_deposit_slots integer not null default 4;

alter table public.upcoming_litters
  drop constraint if exists upcoming_litters_deposit_slots_reasonable;

alter table public.upcoming_litters
  add constraint upcoming_litters_deposit_slots_reasonable
  check (
    max_deposit_slots > 0
    and max_deposit_slots <= 8
    and deposits_reserved_count >= 0
    and deposits_reserved_count <= max_deposit_slots
  );

comment on column public.upcoming_litters.deposits_reserved_count is
  'How many of max_deposit_slots are shown as filled on the public site (illustrative / marketing).';
comment on column public.upcoming_litters.max_deposit_slots is
  'Maximum concurrent deposit reservations offered for this litter (typically 4).';

-- 2) Placeholder rows per puppy "slot" before birth (unique ref code, sex, expected lineage label).
create table if not exists public.upcoming_litter_puppy_placeholders (
  id uuid primary key default gen_random_uuid(),
  upcoming_litter_id uuid not null references public.upcoming_litters(id) on delete cascade,
  public_ref_code text not null,
  slot_index integer not null,
  sex text not null check (sex in ('Male', 'Female')),
  offspring_breed_label text not null,
  lifecycle_status text not null default 'expected'
    check (lifecycle_status in ('expected', 'born')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (public_ref_code),
  unique (upcoming_litter_id, slot_index)
);

create index if not exists idx_upcoming_puppy_ph_litter
  on public.upcoming_litter_puppy_placeholders(upcoming_litter_id);

create or replace function public.set_upcoming_litter_puppy_placeholders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_upcoming_litter_puppy_placeholders_updated_at
  on public.upcoming_litter_puppy_placeholders;
create trigger trg_upcoming_litter_puppy_placeholders_updated_at
before update on public.upcoming_litter_puppy_placeholders
for each row execute procedure public.set_upcoming_litter_puppy_placeholders_updated_at();

comment on table public.upcoming_litter_puppy_placeholders is
  'Pre-birth puppy placeholders for an upcoming litter (reservation / waitlist UI).';

-- 3) After a new upcoming litter row is inserted, create placeholder slots from expected count.
create or replace function public.seed_placeholders_for_new_upcoming_litter()
returns trigger
language plpgsql
as $$
declare
  n integer;
  i integer;
  lbl text;
  sex_val text;
begin
  n := least(
    greatest(coalesce(new.max_expected_puppies, new.min_expected_puppies, 4), 1),
    6
  );
  lbl := coalesce(
    nullif(trim(new.display_breed), ''),
    nullif(trim(new.breed), ''),
    'Designer mix'
  );
  for i in 1..n loop
    sex_val := case when i % 2 = 1 then 'Male' else 'Female' end;
    insert into public.upcoming_litter_puppy_placeholders (
      upcoming_litter_id,
      public_ref_code,
      slot_index,
      sex,
      offspring_breed_label,
      lifecycle_status
    ) values (
      new.id,
      'UL-' || upper(substring(replace(new.id::text, '-', ''), 1, 8)) || '-' || lpad(i::text, 2, '0'),
      i,
      sex_val,
      lbl,
      'expected'
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_upcoming_litters_seed_placeholders on public.upcoming_litters;
create trigger trg_upcoming_litters_seed_placeholders
after insert on public.upcoming_litters
for each row execute procedure public.seed_placeholders_for_new_upcoming_litter();

-- 4) One-time backfill: litters with no placeholders yet
insert into public.upcoming_litter_puppy_placeholders (
  upcoming_litter_id,
  public_ref_code,
  slot_index,
  sex,
  offspring_breed_label,
  lifecycle_status
)
select
  ul.id,
  'UL-' || upper(substring(replace(ul.id::text, '-', ''), 1, 8)) || '-' || lpad(gs.i::text, 2, '0'),
  gs.i::integer,
  case when gs.i % 2 = 1 then 'Male' else 'Female' end,
  coalesce(
    nullif(trim(ul.display_breed), ''),
    nullif(trim(ul.breed), ''),
    'Designer mix'
  ),
  'expected'
from public.upcoming_litters ul
cross join lateral generate_series(
  1,
  least(
    greatest(coalesce(ul.max_expected_puppies, ul.min_expected_puppies, 4), 1),
    6
  )
) as gs(i)
where not exists (
  select 1
  from public.upcoming_litter_puppy_placeholders p
  where p.upcoming_litter_id = ul.id
);

-- 5) contact_messages: optional selected placeholder
alter table public.contact_messages
  add column if not exists upcoming_puppy_placeholder_id uuid
    references public.upcoming_litter_puppy_placeholders(id) on delete set null;

alter table public.contact_messages
  add column if not exists upcoming_puppy_placeholder_summary text;

-- 6) RLS
alter table public.upcoming_litter_puppy_placeholders enable row level security;

drop policy if exists "upcoming_litter_puppy_placeholders_public_read" on public.upcoming_litter_puppy_placeholders;
create policy "upcoming_litter_puppy_placeholders_public_read"
on public.upcoming_litter_puppy_placeholders for select
to anon, authenticated
using (
  exists (
    select 1
    from public.upcoming_litters ul
    where ul.id = upcoming_litter_puppy_placeholders.upcoming_litter_id
      and ul.is_active = true
  )
);

drop policy if exists "upcoming_litter_puppy_placeholders_admin_all" on public.upcoming_litter_puppy_placeholders;
create policy "upcoming_litter_puppy_placeholders_admin_all"
on public.upcoming_litter_puppy_placeholders for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid() and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid() and profiles.role = 'admin'
  )
);
