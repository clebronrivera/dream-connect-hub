-- Wave H phase 3 (H5): communication archive.
--
-- Every interaction with a buyer about a specific agreement gets a row
-- here. Used to assemble the dispute-evidence packet (Wave H8) and to
-- give operators a single timeline view in the admin agreement detail
-- panel.
--
-- Auto-logged: every successful Resend email send via
--   supabase/functions/_shared/email/send.ts
-- whenever the caller passes an agreement_id (the H5 client patch wires
-- this through every existing send-* edge function in the same wave).
--
-- Manually logged: operator-driven entries for SMS, phone calls, and
-- in-person notes via a "Log communication" form in
-- src/pages/admin/AgreementDetailPanel.tsx.

CREATE TABLE public.agreement_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL
    REFERENCES public.deposit_agreements(id) ON DELETE CASCADE,
  direction text NOT NULL
    CHECK (direction IN ('inbound','outbound')),
  channel text NOT NULL
    CHECK (channel IN ('email','sms','phone','in_person_note')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  summary text NOT NULL,
  attachment_paths text[],
  -- Outbound auto-logs from the system (no human author) leave this NULL.
  -- Manual logs from the admin UI populate it from auth.uid().
  recorded_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agreement_communications IS
  'Wave H phase 3 (H5). Append-only timeline of all communications about a deposit agreement. Auto-populated for outbound emails by _shared/email/send.ts; manually populated for SMS/phone/in-person notes by operators in AgreementDetailPanel.';

-- Hot read path: admin opens the panel and lists this agreement's
-- communications newest-first.
CREATE INDEX idx_agreement_communications_agreement
  ON public.agreement_communications(agreement_id, occurred_at DESC);

-- RLS: admin reads/writes everything; service-role (used by edge
-- functions for auto-log) bypasses RLS entirely. There is no public
-- surface — buyers do NOT see the communications log.
ALTER TABLE public.agreement_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_agreement_communications
  ON public.agreement_communications
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));
