-- Wave A2: retire fractional deposit tiers; standardize on flat $300 default
-- with optional per-puppy override.
--
-- Background: deposit_agreements.deposit_tier (pre_8_weeks=1/4, post_8_weeks=1/3)
-- was the original tiered model. Replaced with a flat default ($300, defined in
-- src/lib/constants/deposit.ts as DEFAULT_DEPOSIT_AMOUNT) overridable on a
-- per-puppy basis via puppies.deposit_amount (set by the operator when accepting
-- a deposit request — see Wave C OperatorReviewForm).
--
-- upcoming_litters.deposit_amount was dropped on 2026-05-05 in
-- 20260505065200_upcoming_litters_simplify_remove_slots_add_visibility_flags.sql
-- as part of the slot-machinery dissolution; we are NOT re-adding it.
--
-- Safety: deposit_agreements has 0 rows at the time of this migration; dropping
-- the deposit_tier column requires no backfill.

ALTER TABLE public.deposit_agreements DROP COLUMN IF EXISTS deposit_tier;

COMMENT ON COLUMN public.deposit_agreements.deposit_amount IS
  'Flat $300 default (DEFAULT_DEPOSIT_AMOUNT in src/lib/constants/deposit.ts); overridden per-puppy via puppies.deposit_amount when the operator sets a custom amount in OperatorReviewForm.';

ALTER TABLE public.puppies
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2);

COMMENT ON COLUMN public.puppies.deposit_amount IS
  'Per-puppy deposit override. NULL means use DEFAULT_DEPOSIT_AMOUNT ($300) defined in src/lib/constants/deposit.ts. Set by the operator when accepting a deposit request via OperatorReviewForm (Wave C).';
