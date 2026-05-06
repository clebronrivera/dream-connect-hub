-- Wave E E1: schema completeness for the deposit agreement.
--
-- Resolves several pending OPDs by adding the buyer-side fields that the PDF
-- spec requires but the current schema doesn't carry. All additions are
-- nullable so existing code keeps compiling while Wave E E2/E3 wire the
-- form. Where CHECK constraints apply, they allow NULL so partially-filled
-- rows are valid.
--
-- Touched OPDs: OPD-05 (address split), OPD-06 (how-heard merged list),
-- OPD-07 (Section 3 questionnaire), OPD-08 (pickup preferences),
-- and the H6 contract-clause acks (excluding ack_florida_venue_at, which
-- is held back pending attorney review per CLAUDE.md E3 / H6).
--
-- Safety: deposit_agreements row count = 0 at migration-write time. Adding
-- nullable columns and dropping the unused buyer_address blob is non-
-- destructive. The ack_age_accuracy_at → ack_age_attestation_at rename is
-- a no-op rename on the empty table.

-- ── OPD-05: structured buyer address ─────────────────────────────────
-- Replaces the single buyer_address text blob with four sub-fields. ZIP
-- is required for OPD-15 sales-tax estimation.
ALTER TABLE public.deposit_agreements
  ADD COLUMN buyer_street text,
  ADD COLUMN buyer_city   text,
  ADD COLUMN buyer_state  text,
  ADD COLUMN buyer_zip    text;

ALTER TABLE public.deposit_agreements DROP COLUMN buyer_address;

-- ── OPD-06: how-heard canonical fields ──────────────────────────────
-- The how_heard value is enforced by the merged canonical list at the
-- application layer (HOW_HEARD_OPTIONS constant). Free-form fallback in
-- how_heard_other_text when the buyer picks "other".
ALTER TABLE public.deposit_agreements
  ADD COLUMN how_heard               text,
  ADD COLUMN how_heard_referral_name text,
  ADD COLUMN how_heard_other_text    text;

-- ── OPD-08: pickup preferences ──────────────────────────────────────
-- Primary date stays on the existing proposed_pickup_date column. These
-- six fields capture the buyer's full preference set.
ALTER TABLE public.deposit_agreements
  ADD COLUMN pickup_time_preference text
    CHECK (pickup_time_preference IS NULL
           OR pickup_time_preference IN ('morning','afternoon','evening')),
  ADD COLUMN pickup_day_preference text
    CHECK (pickup_day_preference IS NULL
           OR pickup_day_preference IN ('weekday','weekend','either')),
  ADD COLUMN pickup_alt_date  date,
  ADD COLUMN pickup_alt_time  text
    CHECK (pickup_alt_time IS NULL
           OR pickup_alt_time IN ('morning','afternoon','evening')),
  ADD COLUMN pickup_alt_day   text
    CHECK (pickup_alt_day IS NULL
           OR pickup_alt_day IN ('weekday','weekend','either')),
  ADD COLUMN pickup_notes     text;

-- ── OPD-07: Section 3 questionnaire (all optional) ──────────────────
-- Free-form text for now. The form uses <Select> with curated options
-- but the column allows any string; OPD-07 explicitly opted for digital
-- + optional rather than a strict enum.
ALTER TABLE public.deposit_agreements
  ADD COLUMN q_first_dog            text,
  ADD COLUMN q_living_situation     text,
  ADD COLUMN q_hours_alone          text,
  ADD COLUMN q_household_members    text,
  ADD COLUMN q_puppy_goal           text,
  ADD COLUMN q_training_experience  text;

-- ── H6 contract clause acks (Wave E E3) ─────────────────────────────
-- Each new clause gets its own timestamp, mirroring the existing ack_*
-- pattern. ack_florida_venue_at is intentionally NOT added — held back
-- pending attorney review per CLAUDE.md.
ALTER TABLE public.deposit_agreements
  ADD COLUMN ack_payment_authorization_at timestamptz,
  ADD COLUMN ack_identity_attestation_at  timestamptz,
  ADD COLUMN ack_pre_dispute_contact_at   timestamptz,
  ADD COLUMN ack_pickup_acceptance_at     timestamptz;

-- ── Rename ack_age_accuracy_at → ack_age_attestation_at ─────────────
-- The old name was a literal "I am 18+ AND my info is accurate"; the
-- spec language is now "age attestation" per OPD-03 (DOB removed in
-- favor of the 18+ self-cert).
ALTER TABLE public.deposit_agreements
  RENAME COLUMN ack_age_accuracy_at TO ack_age_attestation_at;

-- ── COMMENTs for the new columns ────────────────────────────────────
COMMENT ON COLUMN public.deposit_agreements.buyer_street IS
  'OPD-05. Replaced the buyer_address blob.';
COMMENT ON COLUMN public.deposit_agreements.buyer_zip IS
  'OPD-05. Drives sales-tax jurisdiction for OPD-15.';
COMMENT ON COLUMN public.deposit_agreements.how_heard IS
  'OPD-06. Canonical list maintained at application layer (HOW_HEARD_OPTIONS).';
COMMENT ON COLUMN public.deposit_agreements.pickup_time_preference IS
  'OPD-08. CHECK enforces morning|afternoon|evening|NULL.';
COMMENT ON COLUMN public.deposit_agreements.pickup_day_preference IS
  'OPD-08. CHECK enforces weekday|weekend|either|NULL.';
COMMENT ON COLUMN public.deposit_agreements.q_first_dog IS
  'OPD-07. Section 3 questionnaire — all 6 questions optional.';
COMMENT ON COLUMN public.deposit_agreements.ack_age_attestation_at IS
  'Renamed from ack_age_accuracy_at. The 18+ attestation timestamp.';
COMMENT ON COLUMN public.deposit_agreements.ack_payment_authorization_at IS
  'H6 ack: payment authorization clause acknowledged.';
COMMENT ON COLUMN public.deposit_agreements.ack_identity_attestation_at IS
  'H6 ack: ID-matches-info clause acknowledged.';
COMMENT ON COLUMN public.deposit_agreements.ack_pre_dispute_contact_at IS
  'H6 ack: pre-dispute contact requirement acknowledged.';
COMMENT ON COLUMN public.deposit_agreements.ack_pickup_acceptance_at IS
  'H6 ack: pickup-handover signature constitutes final acceptance.';
