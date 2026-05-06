-- Wave G partial: auto-sync puppies.status with deposit_agreements lifecycle.
--
-- Bug today: the operator's "Finalize Agreement" action transitions
-- deposit_agreements.agreement_status to 'admin_approved' but the linked
-- puppy stays 'Available' — meaning the same puppy can be deposited on a
-- second time through the public flow before the operator manually flips
-- the status. This DB trigger closes the loop, so every code path that
-- updates agreement_status (finalize-agreement today, the future Wave F
-- generate-agreement-pdf, ad-hoc admin SQL) gets the right transition for
-- free.
--
-- Transitions:
--   agreement_status enters {admin_approved, complete}
--     → UPDATE puppies SET status='Reserved' WHERE status='Available'
--   agreement_status enters {cancelled}
--     → UPDATE puppies SET status='Available' WHERE status='Reserved'
--
-- Idempotent: the WHERE-status guards make repeat triggers safe. Sold is
-- terminal and is never overwritten by either branch.
--
-- Pre-flight live counts:
--   puppies: 13 Available, 16 Sold, 0 Reserved (Reserved is in the CHECK
--   constraint allowlist already, just unused).
--   deposit_agreements: 0 rows; no historical agreements to retroactively
--   sync.

CREATE OR REPLACE FUNCTION public.sync_puppy_status_from_agreement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Available → Reserved when agreement reaches admin_approved or complete.
  IF NEW.agreement_status IN ('admin_approved', 'complete')
     AND COALESCE(OLD.agreement_status, '') NOT IN ('admin_approved', 'complete')
     AND NEW.puppy_id IS NOT NULL THEN
    UPDATE public.puppies
       SET status = 'Reserved'
     WHERE id = NEW.puppy_id
       AND status = 'Available';
  END IF;

  -- Reserved → Available when agreement is cancelled.
  IF NEW.agreement_status = 'cancelled'
     AND COALESCE(OLD.agreement_status, '') IN ('sent', 'admin_approved', 'complete')
     AND NEW.puppy_id IS NOT NULL THEN
    UPDATE public.puppies
       SET status = 'Available'
     WHERE id = NEW.puppy_id
       AND status = 'Reserved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_puppy_status_on_agreement_change
  ON public.deposit_agreements;

CREATE TRIGGER sync_puppy_status_on_agreement_change
AFTER UPDATE OF agreement_status ON public.deposit_agreements
FOR EACH ROW
EXECUTE FUNCTION public.sync_puppy_status_from_agreement();

COMMENT ON FUNCTION public.sync_puppy_status_from_agreement() IS
  'Wave G partial: keeps puppies.status in sync with agreement_status. Transitions: agreement → admin_approved/complete sets puppy Available→Reserved; agreement → cancelled sets puppy Reserved→Available. Sold is terminal and never touched.';
