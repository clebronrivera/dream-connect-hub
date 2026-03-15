-- Add optional refundable deposit amount for upcoming litters.
-- Display note: "Refundable up to the date of birth."
alter table public.upcoming_litters
  add column if not exists refundable_deposit_amount integer;

comment on column public.upcoming_litters.refundable_deposit_amount is 'Optional refundable deposit amount (e.g. same as deposit_amount). Refundable up to the date of birth.';
