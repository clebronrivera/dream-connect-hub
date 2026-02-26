-- Litters table: shared defaults for a litter of puppies
CREATE TABLE litters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed TEXT NOT NULL,
  listing_date DATE,
  date_of_birth DATE,
  ready_date DATE,
  base_price NUMERIC(10, 2) DEFAULT 0,
  mom_weight_lbs INTEGER,
  dad_weight_lbs INTEGER,
  vaccinations TEXT,
  health_certificate_default BOOLEAN DEFAULT false,
  microchipped_default BOOLEAN DEFAULT false,
  status_default TEXT DEFAULT 'Available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at on litters
CREATE OR REPLACE FUNCTION update_litters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_litters_updated_at
  BEFORE UPDATE ON litters
  FOR EACH ROW
  EXECUTE PROCEDURE update_litters_updated_at();

-- Add litter_id to puppies
ALTER TABLE puppies
  ADD COLUMN IF NOT EXISTS litter_id UUID REFERENCES litters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_puppies_litter_id ON puppies(litter_id);

-- RLS: same as puppies - admins only for write, read follows puppy policies
ALTER TABLE litters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view litters"
  ON litters FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert litters"
  ON litters FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update litters"
  ON litters FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete litters"
  ON litters FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE litters IS 'Shared defaults for a litter; puppies can reference via litter_id';
