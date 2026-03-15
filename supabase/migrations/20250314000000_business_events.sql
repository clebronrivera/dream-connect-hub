-- Business events: log milestones (e.g. SEO launch, marketing campaigns) to correlate with traffic later.
-- Admin-only; no public access.

create table if not exists public.business_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  description text not null,
  category text,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_events_event_date on public.business_events(event_date desc);
create index if not exists idx_business_events_created_at on public.business_events(created_at desc);

alter table public.business_events enable row level security;

drop policy if exists "business_events_admin_select" on public.business_events;
create policy "business_events_admin_select"
on public.business_events for select to authenticated
using (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "business_events_admin_insert" on public.business_events;
create policy "business_events_admin_insert"
on public.business_events for insert to authenticated
with check (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "business_events_admin_update" on public.business_events;
create policy "business_events_admin_update"
on public.business_events for update to authenticated
using (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "business_events_admin_delete" on public.business_events;
create policy "business_events_admin_delete"
on public.business_events for delete to authenticated
using (exists (select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
