-- Add email + email_consent to testimonials so we can notify customers
-- when their review is approved and so admins can reply to submissions.
-- Both columns are nullable — existing rows remain valid. New submissions
-- from the public form should begin collecting these values.

alter table public.testimonials
  add column if not exists email text,
  add column if not exists email_consent boolean default false;

comment on column public.testimonials.email is
  'Optional customer email captured at testimonial submission. Used for approval notification only.';
comment on column public.testimonials.email_consent is
  'True when the customer opted in to receive an email when their review is approved.';

-- Case-insensitive index for duplicate-lookup use cases (admin search).
create index if not exists testimonials_email_lower_idx
  on public.testimonials (lower(email))
  where email is not null;
