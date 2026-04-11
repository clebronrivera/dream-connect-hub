-- ============================================================================
-- AGREEMENT AUDIT TRAIL — IP, user agent, acknowledgments, arbitration
-- Per Master Reference Section 3.5 (Five-Layer E-Signature Audit Trail)
-- ============================================================================

-- Add audit columns to deposit_agreements
ALTER TABLE deposit_agreements
  ADD COLUMN IF NOT EXISTS buyer_ip_address       inet,
  ADD COLUMN IF NOT EXISTS buyer_user_agent        text,
  ADD COLUMN IF NOT EXISTS buyer_signed_server_ts  timestamptz,
  ADD COLUMN IF NOT EXISTS admin_ip_address        inet,
  ADD COLUMN IF NOT EXISTS admin_user_agent        text,
  ADD COLUMN IF NOT EXISTS admin_signed_server_ts  timestamptz;

-- 7 individual acknowledgment timestamps (Article IX)
ALTER TABLE deposit_agreements
  ADD COLUMN IF NOT EXISTS ack_full_agreement_at       timestamptz,
  ADD COLUMN IF NOT EXISTS ack_statutory_rights_at     timestamptz,
  ADD COLUMN IF NOT EXISTS ack_esign_valid_at          timestamptz,
  ADD COLUMN IF NOT EXISTS ack_genetic_disclaimer_at   timestamptz,
  ADD COLUMN IF NOT EXISTS ack_arbitration_at          timestamptz,
  ADD COLUMN IF NOT EXISTS ack_age_accuracy_at         timestamptz,
  ADD COLUMN IF NOT EXISTS ack_welfare_responsibility_at timestamptz;

-- Arbitration typed phrase
ALTER TABLE deposit_agreements
  ADD COLUMN IF NOT EXISTS arbitration_typed_phrase text,
  ADD COLUMN IF NOT EXISTS arbitration_typed_at     timestamptz;

-- Warranty expiry dates (computed from transfer)
ALTER TABLE deposit_agreements
  ADD COLUMN IF NOT EXISTS warranty_illness_expiry  timestamptz,
  ADD COLUMN IF NOT EXISTS warranty_genetic_expiry  timestamptz;

-- Signed PDF storage
ALTER TABLE deposit_agreements
  ADD COLUMN IF NOT EXISTS signed_pdf_storage_path     text,
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_email_opened_at timestamptz;

-- Vet visit acknowledgment
ALTER TABLE deposit_agreements
  ADD COLUMN IF NOT EXISTS vet_visit_acknowledged    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vet_visit_acknowledged_at timestamptz;

-- Trigger: auto-set buyer_signed_server_ts when buyer_signed_at changes from NULL
CREATE OR REPLACE FUNCTION stamp_buyer_signed_server_ts()
RETURNS trigger AS $$
BEGIN
  IF OLD.buyer_signed_at IS NULL AND NEW.buyer_signed_at IS NOT NULL THEN
    NEW.buyer_signed_server_ts := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stamp_buyer_signed
  BEFORE UPDATE ON deposit_agreements
  FOR EACH ROW EXECUTE PROCEDURE stamp_buyer_signed_server_ts();


-- ============================================================================
-- AGREEMENT AUDIT LOG — event-level trail for every significant action
-- ============================================================================

CREATE TABLE agreement_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id    uuid NOT NULL REFERENCES deposit_agreements(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  event_data      jsonb,
  ip_address      inet,
  user_agent      text,
  performed_by    text,          -- 'buyer', 'admin', 'system'
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agreement_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can read all audit logs
CREATE POLICY admin_read_audit_log ON agreement_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- System/edge functions can insert (service role bypasses RLS)
CREATE POLICY system_insert_audit_log ON agreement_audit_log
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_audit_log_agreement ON agreement_audit_log (agreement_id, created_at DESC);
CREATE INDEX idx_audit_log_event_type ON agreement_audit_log (event_type);
