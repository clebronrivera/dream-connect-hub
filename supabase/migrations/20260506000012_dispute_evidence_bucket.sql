-- Wave H phase 3 (H8): private bucket for dispute-evidence ZIP packets.
--
-- The generate-dispute-evidence-packet edge function (admin-only) builds
-- a single ZIP per agreement on demand and uploads it here. Each packet
-- contains:
--   - Signed deposit + purchase agreement PDFs (when Wave F unblocks)
--   - Signed pickup handover PDF (when Wave F unblocks)
--   - All payment evidence screenshots (H1 + H2)
--   - communications log export (agreement_communications rows + any
--     referenced attachment files)
--   - audit trail JSON (timestamps, IPs, signatures, mismatch flags)
--
-- The bucket is private. Admin reads via direct supabase-js storage
-- calls; the edge function uses service role for upload + signed-URL
-- minting. No public/buyer-token surface — these packets are sensitive
-- evidence files, not consumer downloads.

INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute-evidence', 'dispute-evidence', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY admin_all_dispute_evidence_objects ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'dispute-evidence'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
