-- ============================================================================
-- Fix public deposit submission + lock down audit-log inserts
-- Migration: 20260422000000_fix_deposit_and_audit_rls.sql
--
-- Two fixes surfaced by the 2026-04-22 audit:
--
--   1. deposit_agreements had only an admin FOR ALL policy, so anon buyers
--      submitting the public deposit form were silently rejected by RLS.
--      Add a narrow public INSERT policy scoped to the initial agreement
--      state, with every admin/system-controlled field required to be
--      NULL/default. Mirrors the shape of public_insert_deposit_requests
--      in 20260414000000_deposit_requests.sql.
--
--   2. agreement_audit_log had FOR INSERT WITH CHECK (true), letting any
--      anonymous caller forge audit events against real agreement_ids.
--      The audit log is written by edge functions using the service role
--      (which bypasses RLS), so the permissive public policy is not needed.
--      Drop it.
--
--   3. Client-side "close the loop" UPDATE on deposit_requests
--      (deposit_link_sent -> converted) also hits admin-only RLS and fails
--      silently. Replace it with an AFTER INSERT trigger on
--      deposit_agreements that performs the link server-side.
-- ============================================================================


-- 1. Lock down agreement_audit_log: only service role may insert.
DROP POLICY IF EXISTS system_insert_audit_log ON agreement_audit_log;


-- 2. Public INSERT policy for deposit_agreements.
CREATE POLICY public_insert_deposit_agreement ON deposit_agreements
  FOR INSERT WITH CHECK (
    -- Must be the initial buyer-submitted state.
    agreement_status = 'sent'
    AND deposit_status = 'pending'

    -- Admin-controlled signature/approval fields must be empty.
    AND admin_signature_svg IS NULL
    AND admin_signature_name IS NULL
    AND admin_signed_at IS NULL
    AND admin_approved_at IS NULL
    AND payment_confirmed_at IS NULL
    AND admin_ip_address IS NULL
    AND admin_user_agent IS NULL
    AND admin_signed_server_ts IS NULL

    -- Admin-only workflow fields must be empty or at defaults.
    AND confirmed_pickup_date IS NULL
    AND reminder_last_sent_at IS NULL
    AND reminder_count = 0
    AND requires_manual_review = false
    AND rejection_reason IS NULL
    AND rejection_is_within_window IS NULL
    AND notes IS NULL

    -- PDF/email fields are populated by edge functions only.
    AND signed_pdf_storage_path IS NULL
    AND confirmation_email_sent_at IS NULL
    AND confirmation_email_opened_at IS NULL

    -- Warranty dates are computed server-side after admin approval.
    AND warranty_illness_expiry IS NULL
    AND warranty_genetic_expiry IS NULL

    -- Vet visit ack is flipped later in the flow.
    AND vet_visit_acknowledged = false
    AND vet_visit_acknowledged_at IS NULL
  );


-- 3. Server-side link from deposit_agreements -> deposit_requests on insert.
--    This replaces a client-side UPDATE that can't succeed under RLS (admin-only).
--    Runs with definer rights so it can update deposit_requests without a
--    public UPDATE policy. Only transitions valid deposit_link_sent requests.
CREATE OR REPLACE FUNCTION link_deposit_agreement_to_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.deposit_request_id IS NOT NULL THEN
    UPDATE deposit_requests
       SET request_status = 'converted',
           deposit_agreement_id = NEW.id,
           converted_at = now()
     WHERE id = NEW.deposit_request_id
       AND request_status = 'deposit_link_sent'
       AND deposit_agreement_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_link_deposit_agreement_to_request
  AFTER INSERT ON deposit_agreements
  FOR EACH ROW EXECUTE PROCEDURE link_deposit_agreement_to_request();
