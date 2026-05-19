-- PR 4: tie buyer_access_token_expires_at to puppies.ready_date + 7 days,
-- add extended_until for manual operator extension.
--
-- Token policy (evaluated by verifyBuyerToken):
--   now() <= GREATEST(buyer_access_token_expires_at,
--                     COALESCE(extended_until, '-infinity'::timestamptz))
--
-- Default fallback stays now() + 30 days for agreements not linked to a puppy
-- with a known ready_date. The trigger fires on INSERT and on UPDATE OF puppy_id
-- so that setting the puppy after initial insert also re-computes the window.

ALTER TABLE public.deposit_agreements
  ADD COLUMN IF NOT EXISTS extended_until timestamptz;

COMMENT ON COLUMN public.deposit_agreements.extended_until IS
  'Manual operator extension for late pickups. verifyBuyerToken accepts the token
   when now() <= GREATEST(buyer_access_token_expires_at, COALESCE(extended_until, -infinity)).
   Set by the admin "Extend link" action; clears on a new buyer_access_token rotation.';

-- Trigger function: compute expiry from the linked puppy's ready_date.
CREATE OR REPLACE FUNCTION public.set_buyer_token_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ready_date date;
BEGIN
  IF NEW.puppy_id IS NOT NULL THEN
    SELECT ready_date INTO v_ready_date
    FROM public.puppies
    WHERE id = NEW.puppy_id;
  END IF;

  IF v_ready_date IS NOT NULL THEN
    NEW.buyer_access_token_expires_at :=
      (v_ready_date + interval '7 days')::timestamptz;
  ELSE
    -- No ready_date: use now() + 30 days on INSERT; leave existing value on UPDATE.
    IF TG_OP = 'INSERT' THEN
      NEW.buyer_access_token_expires_at := now() + interval '30 days';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_buyer_token_expiry
  BEFORE INSERT OR UPDATE OF puppy_id
  ON public.deposit_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_buyer_token_expiry();

COMMENT ON FUNCTION public.set_buyer_token_expiry() IS
  'Computes buyer_access_token_expires_at from puppies.ready_date + 7 days.
   Falls back to now() + 30 days on INSERT when ready_date is unknown.';
