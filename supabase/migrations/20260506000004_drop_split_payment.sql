-- OPD-09: drop the `split` payment method option.
--
-- Source: docs/spec/dream-connect-hub.md §1 OPD-09 (resolved 2026-05-05).
-- Multi-method payment scenarios are rare and now handled manually by the
-- operator; the buyer-facing split UI and the per-row breakdown jsonb columns
-- are no longer used.
--
-- Affected:
--   * deposit_agreements.deposit_payment_method      CHECK rewrite (drop 'split')
--   * deposit_agreements.final_payment_method_intended CHECK rewrite (drop 'split')
--   * deposit_agreements.deposit_payment_detail (jsonb) — DROP COLUMN
--   * final_sales.final_payment_method               CHECK rewrite (drop 'split')
--   * final_sales.final_payment_detail (jsonb)       — DROP COLUMN
--
-- Safety: live row counts checked at migration-write time:
--   deposit_agreements:                 0 rows
--   deposit_agreements rows with split: 0
--   deposit_agreements rows w/ detail:  0
--   final_sales:                        0 rows
--   final_sales rows w/ detail:         0
-- Dropping the jsonb columns and tightening the CHECKs is non-destructive.

-- 1) Drop the now-unused jsonb breakdown columns.
ALTER TABLE public.deposit_agreements
  DROP COLUMN IF EXISTS deposit_payment_detail;

ALTER TABLE public.final_sales
  DROP COLUMN IF EXISTS final_payment_detail;

-- 2) Rewrite deposit_agreements.deposit_payment_method CHECK (drop 'split').
ALTER TABLE public.deposit_agreements
  DROP CONSTRAINT IF EXISTS deposit_agreements_deposit_payment_method_check;
ALTER TABLE public.deposit_agreements
  ADD CONSTRAINT deposit_agreements_deposit_payment_method_check
  CHECK (deposit_payment_method IN
    ('zelle','venmo','cashapp','apple_pay','square','cash'));

-- 3) Rewrite deposit_agreements.final_payment_method_intended CHECK (drop 'split').
--    Column is nullable, so the CHECK must allow NULL.
ALTER TABLE public.deposit_agreements
  DROP CONSTRAINT IF EXISTS deposit_agreements_final_payment_method_intended_check;
ALTER TABLE public.deposit_agreements
  ADD CONSTRAINT deposit_agreements_final_payment_method_intended_check
  CHECK (final_payment_method_intended IS NULL OR final_payment_method_intended IN
    ('zelle','venmo','cashapp','apple_pay','square','cash'));

-- 4) Rewrite final_sales.final_payment_method CHECK (drop 'split').
ALTER TABLE public.final_sales
  DROP CONSTRAINT IF EXISTS final_sales_final_payment_method_check;
ALTER TABLE public.final_sales
  ADD CONSTRAINT final_sales_final_payment_method_check
  CHECK (final_payment_method IN
    ('zelle','venmo','cashapp','apple_pay','square','cash'));
