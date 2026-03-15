-- Allow deleting upcoming litters even when contact_messages reference them.
-- When a litter is deleted, contact_messages.upcoming_litter_id is set to NULL;
-- upcoming_litter_label (snapshot) is preserved for history.

alter table public.contact_messages
  drop constraint if exists contact_messages_upcoming_litter_id_fkey;

alter table public.contact_messages
  add constraint contact_messages_upcoming_litter_id_fkey
  foreign key (upcoming_litter_id)
  references public.upcoming_litters(id)
  on delete set null;
