-- ============================================================================
-- DREAMY REVIEWS — Customer testimonials with photo uploads
-- ============================================================================

CREATE TABLE testimonials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name   text NOT NULL,
  puppy_name      text,
  breed           text,
  message         text NOT NULL,
  photo_path      text,          -- Supabase Storage path in testimonial-photos bucket
  city            text,
  state           text,
  is_approved     boolean NOT NULL DEFAULT false,
  is_featured     boolean NOT NULL DEFAULT false,
  display_order   int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_testimonials
  BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Public can read approved testimonials
CREATE POLICY public_read_approved_testimonials ON testimonials
  FOR SELECT USING (is_approved = true);

-- Public can submit testimonials (insert only)
CREATE POLICY public_insert_testimonials ON testimonials
  FOR INSERT WITH CHECK (true);

-- Admin full CRUD
CREATE POLICY admin_all_testimonials ON testimonials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Indexes
CREATE INDEX idx_testimonials_approved ON testimonials (is_approved, display_order);
CREATE INDEX idx_testimonials_featured ON testimonials (is_featured) WHERE is_featured = true;

-- Storage bucket for testimonial photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonial-photos', 'testimonial-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can upload, admin can delete
CREATE POLICY public_upload_testimonial_photos ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'testimonial-photos');

CREATE POLICY public_read_testimonial_photos ON storage.objects
  FOR SELECT USING (bucket_id = 'testimonial-photos');

CREATE POLICY admin_delete_testimonial_photos ON storage.objects
  FOR DELETE USING (
    bucket_id = 'testimonial-photos'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
