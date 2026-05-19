-- PR 5: Simplify pickup handover — photos now optional, add inspection and bill-of-sale timestamps.
-- photo_buyer_with_puppy_path and photo_buyer_with_id_path had NOT NULL constraints
-- in the original schema; the simplified 3-step flow (payment / inspection / bill of sale)
-- removes the photo requirement. visual_inspection_acknowledged_at and bill_of_sale_signed_at
-- become the primary required timestamps for finalize-pickup-handover.

ALTER TABLE public.pickup_handovers
  ALTER COLUMN photo_buyer_with_puppy_path DROP NOT NULL,
  ALTER COLUMN photo_buyer_with_id_path DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS visual_inspection_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS bill_of_sale_signed_at timestamptz;

COMMENT ON COLUMN public.pickup_handovers.visual_inspection_acknowledged_at IS
  'Set when the operator taps "Buyer accepts delivery" in step 2 of the pickup flow.';
COMMENT ON COLUMN public.pickup_handovers.bill_of_sale_signed_at IS
  'Set when the buyer types their signature on the in-app bill of sale (step 3).';
