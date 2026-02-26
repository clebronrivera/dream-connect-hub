-- Preserve which upcoming litter the contact selected (survives if litter is later deleted)
alter table public.contact_messages
add column if not exists upcoming_litter_label text;
