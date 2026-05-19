-- Reservation redesign PR 2: deposit-agreement wizard fields.
--
-- Adds the columns the 10-step buyer wizard collects beyond what the linear
-- form already captured:
--   * `buyer_initials` + `initials_adopted_at` — buyer adopts initials once
--     in the Adopt-Signature step, then the wizard stamps them next to each
--     of the 11 contract clauses. The per-clause `ack_*_at` timestamps that
--     already exist remain the source of truth for *when* a clause was
--     acknowledged; `buyer_initials` is just the displayed stamp.
--   * `care_comfort_*` — five 1–5 Likert ratings collected in the Care Guide
--     step. Labels live in the UI and may be adjusted; constraints here only
--     enforce the 1–5 range.
--   * `payment_mode` — selected in the Payment Choice step (Step 1). Drives
--     conditional wizard branching (deposit-only path skips the Final
--     Payment Plan step) and dictates which payment dashboard sections show
--     after submission.

ALTER TABLE public.deposit_agreements
  ADD COLUMN IF NOT EXISTS buyer_initials text
    CHECK (buyer_initials IS NULL OR char_length(btrim(buyer_initials)) BETWEEN 1 AND 6),
  ADD COLUMN IF NOT EXISTS initials_adopted_at timestamptz,
  ADD COLUMN IF NOT EXISTS care_comfort_potty smallint
    CHECK (care_comfort_potty IS NULL OR care_comfort_potty BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS care_comfort_grooming smallint
    CHECK (care_comfort_grooming IS NULL OR care_comfort_grooming BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS care_comfort_health smallint
    CHECK (care_comfort_health IS NULL OR care_comfort_health BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS care_comfort_social smallint
    CHECK (care_comfort_social IS NULL OR care_comfort_social BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS care_comfort_boundaries smallint
    CHECK (care_comfort_boundaries IS NULL OR care_comfort_boundaries BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS payment_mode text
    CHECK (payment_mode IS NULL OR payment_mode IN ('deposit_only', 'full_payment'));

COMMENT ON COLUMN public.deposit_agreements.buyer_initials IS
  'Initials the buyer adopted in the wizard Adopt-Signature step; stamped against each contract clause. Per-clause timestamps remain in ack_*_at columns.';
COMMENT ON COLUMN public.deposit_agreements.initials_adopted_at IS
  'When the buyer typed and adopted their initials in the wizard.';
COMMENT ON COLUMN public.deposit_agreements.care_comfort_potty IS
  '1–5 Likert: buyer comfort with potty training. Optional Care Guide step.';
COMMENT ON COLUMN public.deposit_agreements.care_comfort_grooming IS
  '1–5 Likert: buyer comfort with grooming. Optional Care Guide step.';
COMMENT ON COLUMN public.deposit_agreements.care_comfort_health IS
  '1–5 Likert: buyer comfort with vet visits / preventative health. Optional Care Guide step.';
COMMENT ON COLUMN public.deposit_agreements.care_comfort_social IS
  '1–5 Likert: buyer comfort with socialization. Optional Care Guide step.';
COMMENT ON COLUMN public.deposit_agreements.care_comfort_boundaries IS
  '1–5 Likert: buyer comfort with setting boundaries / training. Optional Care Guide step.';
COMMENT ON COLUMN public.deposit_agreements.payment_mode IS
  'Wizard Step 1 selection. ''deposit_only'' = pay deposit now, balance at/before pickup. ''full_payment'' = pay full purchase price up-front. Drives PaymentDashboard sections and Step 9 visibility.';
