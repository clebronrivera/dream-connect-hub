-- ============================================================================
-- DEPOSIT REQUESTS — approval workflow bridge between public inquiry
-- and the legal deposit agreement form.
--
-- A request is NOT a reservation. Once accepted, the admin sends a deposit
-- agreement link (email + SMS). When the customer completes the agreement,
-- the request is marked 'converted'. Payment confirmation continues to live
-- in deposit_agreements, not here.
-- ============================================================================

CREATE TABLE deposit_requests (
  id                                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer info
  customer_name                      text NOT NULL,
  customer_email                     text NOT NULL,
  customer_phone                     text,
  customer_phone_e164                text,            -- Normalized by trigger
  city                               text,
  state                              text,

  -- Litter / puppy context (snapshot labels preserved if source is deleted)
  upcoming_litter_id                 uuid REFERENCES upcoming_litters(id) ON DELETE SET NULL,
  upcoming_litter_label              text,
  upcoming_puppy_placeholder_id      uuid REFERENCES upcoming_litter_puppy_placeholders(id) ON DELETE SET NULL,
  upcoming_puppy_placeholder_summary text,

  -- Lifecycle
  request_status                     text NOT NULL DEFAULT 'pending'
    CHECK (request_status IN ('pending','accepted','deposit_link_sent','converted','declined')),
  origin                             text NOT NULL DEFAULT 'public_form'
    CHECK (origin IN ('public_form','admin_initiated')),

  -- Link + delivery (system + admin owned)
  deposit_link_url                   text,
  deposit_link_sent_at               timestamptz,
  deposit_link_sent_via              text[],
  email_sent_at                      timestamptz,
  sms_sent_at                        timestamptz,
  sms_delivery_status                text,

  -- Conversion (system owned, set on agreement submit)
  deposit_agreement_id               uuid,            -- FK added after deposit_agreements is altered below
  converted_at                       timestamptz,

  -- Admin workflow
  admin_notes                        text,
  admin_reviewed_at                  timestamptz,
  decline_reason                     text,

  created_at                         timestamptz NOT NULL DEFAULT now(),
  updated_at                         timestamptz NOT NULL DEFAULT now()
);

-- Add the FK column on deposit_agreements first
ALTER TABLE deposit_agreements
  ADD COLUMN deposit_request_id uuid REFERENCES deposit_requests(id) ON DELETE SET NULL;

-- Now that deposit_agreements has the column, wire the reciprocal FK on deposit_requests
ALTER TABLE deposit_requests
  ADD CONSTRAINT deposit_requests_agreement_fkey
  FOREIGN KEY (deposit_agreement_id) REFERENCES deposit_agreements(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_deposit_requests_status ON deposit_requests (request_status, created_at DESC);
CREATE INDEX idx_deposit_requests_litter ON deposit_requests (upcoming_litter_id);
CREATE INDEX idx_deposit_requests_email  ON deposit_requests (customer_email);

-- One-to-one linkage between a request and an agreement. Partial so nulls don't conflict.
CREATE UNIQUE INDEX idx_deposit_agreements_unique_request
  ON deposit_agreements (deposit_request_id)
  WHERE deposit_request_id IS NOT NULL;

CREATE UNIQUE INDEX idx_deposit_requests_unique_agreement
  ON deposit_requests (deposit_agreement_id)
  WHERE deposit_agreement_id IS NOT NULL;

-- ============================================================================
-- TRIGGER: updated_at
-- ============================================================================

CREATE TRIGGER set_updated_at_deposit_requests
  BEFORE UPDATE ON deposit_requests
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- TRIGGER: phone normalization → E.164
-- Strips non-digits; 10 digits → +1XXXXXXXXXX; 11 digits starting with 1 → +1XXXXXXXXXX.
-- Anything else leaves customer_phone_e164 NULL (SMS won't attempt; email still works).
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_deposit_request_phone()
RETURNS TRIGGER AS $$
DECLARE
  digits text;
BEGIN
  IF NEW.customer_phone IS NULL OR length(trim(NEW.customer_phone)) = 0 THEN
    NEW.customer_phone_e164 := NULL;
    RETURN NEW;
  END IF;

  digits := regexp_replace(NEW.customer_phone, '\D', '', 'g');

  IF length(digits) = 10 THEN
    NEW.customer_phone_e164 := '+1' || digits;
  ELSIF length(digits) = 11 AND left(digits, 1) = '1' THEN
    NEW.customer_phone_e164 := '+' || digits;
  ELSE
    NEW.customer_phone_e164 := NULL;  -- Malformed, don't use for SMS
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_phone_deposit_requests
  BEFORE INSERT OR UPDATE OF customer_phone ON deposit_requests
  FOR EACH ROW EXECUTE PROCEDURE normalize_deposit_request_phone();

-- ============================================================================
-- TRIGGER: state machine enforcement
-- Allows same-status updates (non-status field changes pass through).
-- Validates status transitions against the approved state machine.
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_deposit_request_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- No status change → allow any update (admin_notes, sms_delivery_status, etc.)
  IF OLD.request_status = NEW.request_status THEN
    RETURN NEW;
  END IF;

  -- Status changed → validate transition
  IF OLD.request_status = 'pending' AND NEW.request_status IN ('accepted','declined') THEN
    RETURN NEW;
  ELSIF OLD.request_status = 'accepted' AND NEW.request_status IN ('deposit_link_sent','declined') THEN
    RETURN NEW;
  ELSIF OLD.request_status = 'deposit_link_sent' AND NEW.request_status = 'converted' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid deposit_request status transition: % → %',
    OLD.request_status, NEW.request_status;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_transition_deposit_requests
  BEFORE UPDATE ON deposit_requests
  FOR EACH ROW EXECUTE PROCEDURE enforce_deposit_request_transition();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;

-- Public can insert ONLY with pending status, public_form origin, and no
-- system-/admin-managed fields populated. customer_phone_e164 is trigger-owned.
CREATE POLICY public_insert_deposit_requests ON deposit_requests
  FOR INSERT WITH CHECK (
    request_status = 'pending'
    AND origin = 'public_form'
    AND deposit_link_url IS NULL
    AND deposit_link_sent_at IS NULL
    AND deposit_link_sent_via IS NULL
    AND email_sent_at IS NULL
    AND sms_sent_at IS NULL
    AND sms_delivery_status IS NULL
    AND deposit_agreement_id IS NULL
    AND converted_at IS NULL
    AND admin_reviewed_at IS NULL
    AND admin_notes IS NULL
    AND decline_reason IS NULL
    AND customer_phone_e164 IS NULL
  );

-- Admin full access
CREATE POLICY admin_all_deposit_requests ON deposit_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin')
  );
