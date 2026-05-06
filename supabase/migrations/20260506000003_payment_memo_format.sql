-- Align deposit_agreements.payment_memo with the PDF spec.
--
-- Spec source: docs/spec/dream-connect-hub.md §3 (Anchor A) — sourced from
-- Deposit Agreement PDF Section 6:
--   [Full Legal Name] · [Phone Number] · [Deposit / Final Payment / Full Payment]
-- Example: Maria Gonzalez · (321) 555-0100 · Deposit
--
-- The original generated expression (from 20260410000000_deposit_workflow.sql)
-- used `buyer_name || ' - ' || puppy_name`, which omitted the phone (the
-- operator's cross-reference key when matching incoming personal Zelle/Cash
-- App / Apple Pay payments) and the payment-type suffix (which lets the
-- operator distinguish a deposit transfer from a later final-payment transfer
-- in the same buyer's bank statement).
--
-- The phone segment is omitted when buyer_phone is NULL (until OPD-02 makes
-- buyer_phone NOT NULL). The payment-type suffix branches on full_pay_flow:
--   full_pay_flow = true  → "· Full Payment"
--   full_pay_flow = false → "· Deposit"
-- (Final Payment memos are produced separately in the final_sales flow.)

ALTER TABLE public.deposit_agreements
  DROP COLUMN payment_memo;

ALTER TABLE public.deposit_agreements
  ADD COLUMN payment_memo text GENERATED ALWAYS AS (
    buyer_name
      || COALESCE(' · ' || NULLIF(buyer_phone, ''), '')
      || ' · '
      || CASE WHEN full_pay_flow THEN 'Full Payment' ELSE 'Deposit' END
  ) STORED;

COMMENT ON COLUMN public.deposit_agreements.payment_memo IS
  'Generated. Spec format (PDF §6): "[Full Legal Name] · [Phone Number] · [Deposit / Full Payment]". Phone segment omitted when buyer_phone is NULL/empty. Payment-type suffix branches on full_pay_flow.';
