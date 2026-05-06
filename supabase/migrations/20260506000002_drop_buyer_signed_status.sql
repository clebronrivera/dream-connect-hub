-- Wave A5: remove the unused 'buyer_signed' value from agreement_status.
--
-- Background: the original deposit_workflow migration (20260410000000) defined
-- agreement_status as one of {sent, buyer_signed, admin_approved, complete,
-- cancelled}. The buyer-signed lifecycle marker is the buyer_signed_at
-- timestamp column — agreement_status is never transitioned to 'buyer_signed'
-- by any code path. The finalize-agreement edge function gates on
-- buyer_signed_at IS NOT NULL (see supabase/functions/finalize-agreement/index.ts:93)
-- and transitions status sent → admin_approved → complete.
--
-- The unused enum value was kept by the (now-dropped in A6) permissive
-- public_insert_deposit_agreements policy, which let a buyer insert a row
-- claiming agreement_status='buyer_signed'. With A6 closing that hole, the
-- value has no remaining justification.
--
-- Safety: a live row count on deposit_agreements returned 0 at the time of
-- this migration. No backfill needed.

ALTER TABLE public.deposit_agreements
  DROP CONSTRAINT IF EXISTS deposit_agreements_agreement_status_check;

ALTER TABLE public.deposit_agreements
  ADD CONSTRAINT deposit_agreements_agreement_status_check
  CHECK (agreement_status IN ('sent','admin_approved','complete','cancelled'));

COMMENT ON COLUMN public.deposit_agreements.agreement_status IS
  'Lifecycle: sent (initial; row created by buyer submission, buyer_signed_at set on insert) → admin_approved (finalize-agreement after buyer_signed_at + admin_signed_at + deposit_status=admin_confirmed) → complete (after generate-agreement-pdf, terminal happy path). cancelled is the operator-void terminal state. The legacy buyer_signed value was retired in this migration; use buyer_signed_at (timestamptz) for that lifecycle marker.';
