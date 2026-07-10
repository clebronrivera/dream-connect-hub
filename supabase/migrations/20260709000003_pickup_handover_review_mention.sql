-- Phase 5.4: review-request step in pickup handover. Records that the
-- operator mentioned the Google review ask in person, separate from the
-- automated CTA on the welcome-home email (pickupCompleteBuyer template).
ALTER TABLE pickup_handovers
  ADD COLUMN review_request_mentioned_at timestamptz;

COMMENT ON COLUMN pickup_handovers.review_request_mentioned_at IS
  'Set when the operator confirms they verbally asked the buyer for a Google review during handover. Optional — not required to finalize.';
