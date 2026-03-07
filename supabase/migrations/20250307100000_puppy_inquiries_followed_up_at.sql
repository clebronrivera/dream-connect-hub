-- When admin followed up with the puppy inquiry.
alter table public.puppy_inquiries
  add column if not exists followed_up_at timestamptz;
