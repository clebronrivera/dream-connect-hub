-- OPD-02: phone required at intake and at the formal deposit agreement.
--
-- Both the Deposit PDF Section 1 and the Purchase Agreement Article X mark
-- phone as required (asterisk). Until now the schema and Zod schemas have
-- treated phone as optional. Resolution per OPD-02: enforce NOT NULL at the
-- DB level on both columns; tighten Zod validation in the matching forms.
--
-- Pre-flight live counts confirmed at migration-write time:
--   public.deposit_requests:    8 rows, 0 with NULL or empty phone
--   public.deposit_agreements:  0 rows
-- Both ALTER COLUMN ... SET NOT NULL apply without backfill.

ALTER TABLE public.deposit_requests
  ALTER COLUMN customer_phone SET NOT NULL;

ALTER TABLE public.deposit_agreements
  ALTER COLUMN buyer_phone SET NOT NULL;

COMMENT ON COLUMN public.deposit_requests.customer_phone IS
  'Required (OPD-02). Trigger normalizes to customer_phone_e164.';
COMMENT ON COLUMN public.deposit_agreements.buyer_phone IS
  'Required (OPD-02). Form-side Zod refine asks for 10 digits min.';
