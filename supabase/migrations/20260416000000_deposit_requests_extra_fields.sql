-- ============================================================================
-- DEPOSIT REQUESTS — extra fields for richer request form + slot hold logic
-- ============================================================================

-- 1. New columns on deposit_requests for payment preference, attribution, etc.
ALTER TABLE deposit_requests ADD COLUMN puppy_id uuid REFERENCES puppies(id) ON DELETE SET NULL;
ALTER TABLE deposit_requests ADD COLUMN puppy_name text;
ALTER TABLE deposit_requests ADD COLUMN preferred_payment_method text;
ALTER TABLE deposit_requests ADD COLUMN proposed_pickup_date date;
ALTER TABLE deposit_requests ADD COLUMN spoke_with text;
ALTER TABLE deposit_requests ADD COLUMN how_heard text;
ALTER TABLE deposit_requests ADD COLUMN how_heard_referral_name text;

-- 2. Slot hold columns on upcoming_litter_puppy_placeholders
ALTER TABLE upcoming_litter_puppy_placeholders
  ADD COLUMN hold_deposit_request_id uuid REFERENCES deposit_requests(id) ON DELETE SET NULL,
  ADD COLUMN hold_expires_at timestamptz;

CREATE INDEX idx_placeholders_hold ON upcoming_litter_puppy_placeholders (hold_expires_at)
  WHERE hold_expires_at IS NOT NULL;

-- 3. Trigger: when a deposit_request is inserted with a placeholder ID, set the 48hr hold
CREATE OR REPLACE FUNCTION set_placeholder_hold_on_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.upcoming_puppy_placeholder_id IS NOT NULL THEN
    UPDATE upcoming_litter_puppy_placeholders
    SET hold_deposit_request_id = NEW.id,
        hold_expires_at = now() + interval '48 hours'
    WHERE id = NEW.upcoming_puppy_placeholder_id
      AND (hold_deposit_request_id IS NULL OR hold_expires_at < now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_hold_on_deposit_request
  AFTER INSERT ON deposit_requests
  FOR EACH ROW EXECUTE PROCEDURE set_placeholder_hold_on_request();

-- 4. Trigger: when request is accepted → permanent hold; declined → release hold
CREATE OR REPLACE FUNCTION update_placeholder_hold_on_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.request_status = NEW.request_status THEN
    RETURN NEW;
  END IF;

  -- Accepted: make hold permanent (clear expiry)
  IF NEW.request_status = 'accepted' AND NEW.upcoming_puppy_placeholder_id IS NOT NULL THEN
    UPDATE upcoming_litter_puppy_placeholders
    SET hold_expires_at = NULL
    WHERE id = NEW.upcoming_puppy_placeholder_id
      AND hold_deposit_request_id = NEW.id;
  END IF;

  -- Declined: release hold
  IF NEW.request_status = 'declined' AND NEW.upcoming_puppy_placeholder_id IS NOT NULL THEN
    UPDATE upcoming_litter_puppy_placeholders
    SET hold_deposit_request_id = NULL,
        hold_expires_at = NULL
    WHERE id = NEW.upcoming_puppy_placeholder_id
      AND hold_deposit_request_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hold_on_request_status
  AFTER UPDATE ON deposit_requests
  FOR EACH ROW EXECUTE PROCEDURE update_placeholder_hold_on_status();

-- 5. Update the public INSERT RLS policy to allow the new customer-provided fields
DROP POLICY IF EXISTS public_insert_deposit_requests ON deposit_requests;

CREATE POLICY public_insert_deposit_requests ON deposit_requests
  FOR INSERT WITH CHECK (
    request_status = 'pending'
    AND origin = 'public_form'
    -- Link / sending metadata (admin + system owned)
    AND deposit_link_url IS NULL
    AND deposit_link_sent_at IS NULL
    AND deposit_link_sent_via IS NULL
    AND email_sent_at IS NULL
    AND sms_sent_at IS NULL
    AND sms_delivery_status IS NULL
    -- Conversion (system owned)
    AND deposit_agreement_id IS NULL
    AND converted_at IS NULL
    -- Admin workflow fields
    AND admin_reviewed_at IS NULL
    AND admin_notes IS NULL
    AND decline_reason IS NULL
    -- Normalized phone is trigger-owned
    AND customer_phone_e164 IS NULL
    -- New customer-provided fields are ALLOWED (puppy_id, puppy_name,
    -- preferred_payment_method, proposed_pickup_date, spoke_with,
    -- how_heard, how_heard_referral_name) — no restrictions needed
  );
