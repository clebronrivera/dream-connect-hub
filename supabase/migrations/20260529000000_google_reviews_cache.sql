-- Google Reviews cache
--
-- Single-row cache for the public Google Places (New) "Place Details" response
-- for the Dream Puppies business listing. The `fetch-google-reviews` edge
-- function reads/writes this row using the service role; it refreshes from the
-- Google Places API at most once per TTL window (see the edge function) and
-- serves the cached copy in between. This keeps the public site fast and keeps
-- Google API calls to a trickle (effectively free under the Maps Platform free
-- tier).
--
-- No public RLS policy is created: the browser never reads this table directly.
-- It calls the edge function, which runs as service role and bypasses RLS.

create table if not exists public.google_reviews_cache (
  id                 integer primary key default 1,
  place_id           text,
  rating             numeric(2, 1),
  user_ratings_total integer,
  google_maps_uri    text,
  reviews            jsonb       not null default '[]'::jsonb,
  fetched_at         timestamptz not null default now(),
  -- Enforce a single cache row.
  constraint google_reviews_cache_single_row check (id = 1)
);

alter table public.google_reviews_cache enable row level security;

comment on table public.google_reviews_cache is
  'Single-row (id=1) cache of the public Google Places listing rating + reviews. Written by the fetch-google-reviews edge function (service role). No public RLS policy by design.';
