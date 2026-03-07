-- When admin followed up with the contact (e.g. called/emailed).
alter table public.contact_messages
  add column if not exists followed_up_at timestamptz;
