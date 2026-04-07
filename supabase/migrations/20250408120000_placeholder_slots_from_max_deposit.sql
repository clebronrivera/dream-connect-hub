-- Public reservation puppy tiles: drive count from max_deposit_slots (manual admin control),
-- not from min/max expected puppies (previously capped at 6, which produced six tiles for many litters).

-- 1) New litter inserts: seed placeholders = max_deposit_slots (clamped 1–8).
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
  n := greatest(1, least(coalesce(new.max_deposit_slots, 4), 8));
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

-- 2) When max_deposit_slots changes, trim extras and insert any missing indices.
create or replace function public.sync_upcoming_litter_placeholders_for_row()
returns trigger
language plpgsql
as $$
declare
  n integer;
  lbl text;
  litter_id uuid;
begin
  if tg_op = 'INSERT' then
    return new;
  end if;

  if old.max_deposit_slots is not distinct from new.max_deposit_slots then
    return new;
  end if;

  litter_id := new.id;
  n := greatest(1, least(coalesce(new.max_deposit_slots, 4), 8));

  delete from public.upcoming_litter_puppy_placeholders p
  where p.upcoming_litter_id = litter_id
    and p.slot_index > n;

  lbl := coalesce(
    nullif(trim(new.display_breed), ''),
    nullif(trim(new.breed), ''),
    'Designer mix'
  );

  insert into public.upcoming_litter_puppy_placeholders (
    upcoming_litter_id,
    public_ref_code,
    slot_index,
    sex,
    offspring_breed_label,
    lifecycle_status
  )
  select
    litter_id,
    'UL-' || upper(substring(replace(litter_id::text, '-', ''), 1, 8)) || '-' || lpad(gs.i::text, 2, '0'),
    gs.i::integer,
    case when gs.i % 2 = 1 then 'Male' else 'Female' end,
    lbl,
    'expected'
  from generate_series(1, n) as gs(i)
  where not exists (
    select 1
    from public.upcoming_litter_puppy_placeholders p
    where p.upcoming_litter_id = litter_id
      and p.slot_index = gs.i
  );

  return new;
end;
$$;

drop trigger if exists trg_upcoming_litters_sync_placeholders on public.upcoming_litters;
create trigger trg_upcoming_litters_sync_placeholders
after update of max_deposit_slots on public.upcoming_litters
for each row
execute procedure public.sync_upcoming_litter_placeholders_for_row();

-- 3) One-time cleanup: remove tiles beyond each litter's max_deposit_slots; fill gaps up to that count.
delete from public.upcoming_litter_puppy_placeholders p
using public.upcoming_litters ul
where p.upcoming_litter_id = ul.id
  and p.slot_index > greatest(1, least(coalesce(ul.max_deposit_slots, 4), 8));

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
  greatest(1, least(coalesce(ul.max_deposit_slots, 4), 8))
) as gs(i)
where not exists (
  select 1
  from public.upcoming_litter_puppy_placeholders p
  where p.upcoming_litter_id = ul.id
    and p.slot_index = gs.i
);
