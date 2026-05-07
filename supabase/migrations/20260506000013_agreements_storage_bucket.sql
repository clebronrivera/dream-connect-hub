-- Wave F4 — Agreements storage bucket
-- Stores generated, flattened deposit agreement PDFs.
-- Admin can read/write directly.
-- Buyers download via short-lived signed URLs minted by the
-- agreement-download-url edge function (Wave F6) — no public SELECT policy.

INSERT INTO storage.buckets (id, name, public)
VALUES ('agreements', 'agreements', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_agreements_storage"
ON storage.objects FOR ALL
USING (
  bucket_id = 'agreements'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'agreements'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
