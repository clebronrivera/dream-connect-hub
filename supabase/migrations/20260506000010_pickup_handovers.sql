-- Wave H phase 2 (H4): pickup-day handover module.
--
-- One row per deposit_agreement, written by the operator at /admin/pickup
-- on a tablet at the moment the buyer takes physical delivery. Captures
-- the chain-of-custody evidence that completes chargeback defense:
--   - Two required photos (buyer with puppy, buyer holding ID near face)
--   - One optional photo (location context)
--   - Buyer ID type + last-4 + state/country + expiration confirmation
--     (NEVER full DL number — Wave H non-goal)
--   - Buyer signature (canvas), staff initials + signature timestamp
--   - Health acknowledgment + vet certificate handover ack
--
-- Plus the private `pickup-evidence` storage bucket. Admin-only — there
-- is intentionally no buyer-token write path (H4 is operator-driven, the
-- buyer is physically present, no remote-form attack surface to model).
--
-- The `finalize-pickup-handover` edge function (next phase) flips
-- handover_status to 'in_person_verified', sends the welcome email, and
-- transitions puppies.status from 'Reserved' to 'Sold'. PDF generation
-- is deferred until Wave F unblocks.

-- ── H4: pickup_handovers table ────────────────────────────────────────
CREATE TABLE public.pickup_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL UNIQUE
    REFERENCES public.deposit_agreements(id) ON DELETE RESTRICT,
  handover_status text NOT NULL DEFAULT 'scheduled'
    CHECK (handover_status IN ('scheduled','in_person_verified')),
  pickup_date date NOT NULL,

  -- Optional GPS capture from the operator's tablet at handover time.
  pickup_lat numeric(9,6),
  pickup_lng numeric(9,6),

  -- Buyer signature on the in-person handover form.
  buyer_signature_canvas text,            -- base64 PNG from signature pad
  buyer_signature_at timestamptz,

  -- ID verification: last-4 + state + expiration confirmation only.
  -- Never collect the full DL number (Wave H non-goal, P4 compromise).
  buyer_id_type text
    CHECK (buyer_id_type IN ('drivers_license','passport','state_id','other')),
  buyer_id_last_four text
    CHECK (buyer_id_last_four ~ '^\d{4}$'),
  buyer_id_state_or_country text,
  buyer_id_expiration_verified boolean,

  -- Operator/staff sign-off.
  staff_member_initials text,
  staff_signature_at timestamptz,

  -- Photo evidence. Both buyer photos are required; location is optional.
  photo_buyer_with_puppy_path text,
  photo_buyer_with_id_path text,
  photo_pickup_location_path text,

  -- Acknowledgments.
  health_acknowledgment_signed_at timestamptz,
  vet_certificate_handed_over boolean DEFAULT false,
  vet_certificate_acknowledged_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pickup_handovers IS
  'Wave H phase 2 (H4). One row per deposit_agreement, written by the operator at pickup time. handover_status flips to in_person_verified once finalize-pickup-handover succeeds; that transition also moves puppies.status to Sold.';

COMMENT ON COLUMN public.pickup_handovers.buyer_id_last_four IS
  'Last 4 digits of buyer ID only (drivers license / passport / state ID). Full numbers are intentionally never collected (Wave H non-goal).';

-- updated_at trigger
CREATE TRIGGER set_updated_at_pickup_handovers
  BEFORE UPDATE ON public.pickup_handovers
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ── RLS on pickup_handovers ───────────────────────────────────────────
-- Admin-only. Unlike payment_attestations there is no buyer-token surface:
-- H4 is exclusively operator-driven (tablet at the kennel), and the buyer
-- is physically present, so there's no remote write path to model.
ALTER TABLE public.pickup_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_pickup_handovers ON public.pickup_handovers
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ── Storage bucket: pickup-evidence (private) ─────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('pickup-evidence', 'pickup-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Admin can do anything with files in pickup-evidence. The edge function
-- (`finalize-pickup-handover`) uses service role for uploads and signed-URL
-- minting, bypassing RLS. No public/anon path.
CREATE POLICY admin_all_pickup_evidence_objects ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'pickup-evidence'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
