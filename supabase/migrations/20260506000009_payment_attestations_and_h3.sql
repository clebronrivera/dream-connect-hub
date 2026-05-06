-- Wave H phase 1: schema for the payment-time identity-capture flow.
--
-- Combines H1 (attestation table), H2 (confirmation capture columns on the
-- same row), and H3 (operator-verification columns on deposit_agreements).
-- Plus the private `payment-evidence` storage bucket that holds the buyer-
-- uploaded screenshots referenced by both H1 and H2.
--
-- Why one migration: the three are tightly coupled at the schema level —
-- mark-payment-sent's gate (Wave D D3) needs all of H1+H2 columns to
-- judge whether to accept the buyer's "I have sent payment" click, and
-- the admin "Confirm Payment" UI (H3) needs the H1 buyer_payment_handle
-- to compare against. Keeping them in one migration avoids three
-- partial-deploy windows where the gate would be inconsistent.

-- ── H1 + H2: payment_attestations table ───────────────────────────────
CREATE TABLE public.payment_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL
    REFERENCES public.deposit_agreements(id) ON DELETE CASCADE,
  attestation_status text NOT NULL DEFAULT 'draft'
    CHECK (attestation_status IN ('draft','signed')),

  -- H1 fields: buyer signs an attestation that they're sending payment from
  -- their own account; uploads a screenshot of their payment-app handle.
  payment_method_handle_to_use text NOT NULL,
  buyer_payment_handle text,
  buyer_payment_handle_screenshot_path text,
  buyer_phone_at_payment text,
  payment_attestation_text text,
  payment_attestation_signed_at timestamptz,
  payment_attestation_ip text,
  payment_attestation_user_agent text,
  payment_attestation_geolocation jsonb,

  -- H2 fields: after sending payment, buyer uploads the confirmation
  -- screenshot, transaction id, and the memo string they actually used.
  confirmation_screenshot_path text,
  transaction_reference_id text,
  payment_memo_used text,
  confirmation_captured_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_id)
);

COMMENT ON TABLE public.payment_attestations IS
  'Wave H phase 1 (H1+H2). One row per deposit_agreement. Buyer fills via /payment/<id>/<token>; mark-payment-sent edge function gates on attestation_status=signed AND screenshots/transaction_reference_id present.';

-- Index for the admin "look up by agreement_id" path.
CREATE INDEX idx_payment_attestations_agreement_id
  ON public.payment_attestations(agreement_id);

-- ── RLS on payment_attestations ───────────────────────────────────────
ALTER TABLE public.payment_attestations ENABLE ROW LEVEL SECURITY;

-- Buyer-token-scoped: row is reachable by an anonymous client when the
-- x-buyer-token header matches the parent agreement's token AND that
-- agreement's window hasn't expired. Mirrors public_read_via_buyer_token
-- on deposit_agreements (Wave D D1) — relies on the same PostgREST
-- header-passthrough confirmed by Wave D's P7 PoC.
--
-- DELETE is INTENTIONALLY NOT granted to the buyer-token path. Once a
-- buyer has submitted a payment attestation the row becomes evidence
-- for chargeback defense (Wave H8) and must not be deletable through
-- the public surface. Admin retains full DELETE via
-- admin_all_payment_attestations.
CREATE POLICY public_select_via_buyer_token ON public.payment_attestations
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deposit_agreements a
    WHERE a.id = payment_attestations.agreement_id
      AND a.buyer_access_token::text =
        current_setting('request.headers', true)::json->>'x-buyer-token'
      AND a.buyer_access_token_expires_at > now()
  ));

CREATE POLICY public_insert_via_buyer_token ON public.payment_attestations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deposit_agreements a
    WHERE a.id = payment_attestations.agreement_id
      AND a.buyer_access_token::text =
        current_setting('request.headers', true)::json->>'x-buyer-token'
      AND a.buyer_access_token_expires_at > now()
  ));

CREATE POLICY public_update_via_buyer_token ON public.payment_attestations
  FOR UPDATE
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deposit_agreements a
    WHERE a.id = payment_attestations.agreement_id
      AND a.buyer_access_token::text =
        current_setting('request.headers', true)::json->>'x-buyer-token'
      AND a.buyer_access_token_expires_at > now()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deposit_agreements a
    WHERE a.id = payment_attestations.agreement_id
      AND a.buyer_access_token::text =
        current_setting('request.headers', true)::json->>'x-buyer-token'
      AND a.buyer_access_token_expires_at > now()
  ));

-- Admin sees and modifies everything (including DELETE for audit cleanup
-- if ever needed).
CREATE POLICY admin_all_payment_attestations ON public.payment_attestations
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ── H3: operator-verification columns on deposit_agreements ───────────
ALTER TABLE public.deposit_agreements
  ADD COLUMN operator_verified_sender_handle text,
  ADD COLUMN operator_verified_sender_handle_at timestamptz,
  ADD COLUMN operator_handle_mismatch_flagged boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.deposit_agreements.operator_verified_sender_handle IS
  'H3: set by operator at /admin/agreements when confirming payment. Compared (case-insensitive, trim) against payment_attestations.buyer_payment_handle; mismatches flag operator_handle_mismatch_flagged but do not block.';

COMMENT ON COLUMN public.deposit_agreements.operator_handle_mismatch_flagged IS
  'H3: true when operator_verified_sender_handle disagreed with the buyer-attested handle. Recorded for the dispute-evidence packet (H8); does not block finalization.';

-- ── Storage bucket: payment-evidence (private) ────────────────────────
-- Buyer uploads/reads through an edge function (service role), not direct
-- supabase-js storage calls. The admin policy below grants direct admin
-- access; buyer signed URLs minted by the edge function bypass RLS.
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-evidence', 'payment-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Admin can do anything with files in payment-evidence.
CREATE POLICY admin_all_payment_evidence_objects ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'payment-evidence'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
