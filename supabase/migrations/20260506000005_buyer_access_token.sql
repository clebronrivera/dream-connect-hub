-- Wave D D1: buyer access token + token-scoped SELECT policy.
--
-- The deposit-form buyer is redirected to /payment/<agreement_id>/<buyer_token>
-- after submit. The page reads the agreement via PostgREST while sending the
-- token in an x-buyer-token header; the public_read_via_buyer_token policy
-- below matches that header against the row's token column AND the
-- non-expired window.
--
-- Token longevity: 30 days from agreement creation. After expiry, the buyer
-- contacts the operator to have a fresh row issued (or the operator
-- regenerates the token via SQL).
--
-- PostgREST header passthrough was verified by the Wave D P7 PoC against this
-- Supabase project on 2026-05-06.

ALTER TABLE public.deposit_agreements
  ADD COLUMN buyer_access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN buyer_access_token_expires_at timestamptz NOT NULL
    DEFAULT (now() + interval '30 days'),
  ADD COLUMN buyer_marked_payment_sent_at timestamptz;

CREATE INDEX idx_deposit_agreements_buyer_access_token
  ON public.deposit_agreements(buyer_access_token);

COMMENT ON COLUMN public.deposit_agreements.buyer_access_token IS
  'Per-agreement access token; gates the buyer-side payment dashboard at /payment/<id>/<token>. Independent from the request UUID used to gate /deposit (Wave B).';
COMMENT ON COLUMN public.deposit_agreements.buyer_access_token_expires_at IS
  'After this timestamp, public_read_via_buyer_token rejects the request. Default 30 days from creation.';
COMMENT ON COLUMN public.deposit_agreements.buyer_marked_payment_sent_at IS
  'Set by the mark-payment-sent edge function when the buyer clicks "I have sent payment" on the payment dashboard. Idempotent.';

-- Token-based public SELECT. Activates only when the x-buyer-token header is
-- present AND matches a non-expired token, so it does not broaden access for
-- callers that aren't passing the header.
CREATE POLICY public_read_via_buyer_token ON public.deposit_agreements
  FOR SELECT
  TO anon, authenticated
  USING (
    buyer_access_token::text =
      current_setting('request.headers', true)::json->>'x-buyer-token'
    AND buyer_access_token_expires_at > now()
  );
