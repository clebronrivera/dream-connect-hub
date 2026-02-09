-- Create puppies table in Supabase
-- Puppies table for managing available puppies

-- Drop table if exists (for clean reinstall)
DROP TABLE IF EXISTS puppies CASCADE;

-- Create puppies table
CREATE TABLE puppies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  puppy_id TEXT UNIQUE, -- Optional custom ID (like "PH001")
  name TEXT NOT NULL,
  breed TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  color TEXT,
  
  -- Age Information
  date_of_birth DATE,
  age_weeks INTEGER,
  ready_date DATE,
  
  -- Pricing
  base_price DECIMAL(10, 2),
  discount_active BOOLEAN DEFAULT false,
  discount_amount DECIMAL(10, 2),
  discount_note TEXT,
  final_price DECIMAL(10, 2),
  
  -- Status
  status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Pending', 'Sold', 'Reserved')),
  
  -- Images (stored as array of URLs)
  photos TEXT[], -- Array of image URLs
  primary_photo TEXT, -- Main display photo
  
  -- Details
  description TEXT,
  
  -- Parent Information
  mom_weight_approx INTEGER, -- in pounds
  dad_weight_approx INTEGER, -- in pounds
  
  -- Health & Care
  vaccinations TEXT,
  health_certificate BOOLEAN DEFAULT false,
  microchipped BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Featured/Priority
  featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0
);

-- Create index for faster queries
CREATE INDEX idx_puppies_status ON puppies(status);
CREATE INDEX idx_puppies_breed ON puppies(breed);
CREATE INDEX idx_puppies_featured ON puppies(featured);
CREATE INDEX idx_puppies_display_order ON puppies(display_order);

-- Enable Row Level Security
ALTER TABLE puppies ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view available puppies
CREATE POLICY "Anyone can view puppies"
  ON puppies
  FOR SELECT
  USING (true);

-- Policy: Only authenticated admins can insert puppies
CREATE POLICY "Admins can insert puppies"
  ON puppies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only authenticated admins can update puppies
CREATE POLICY "Admins can update puppies"
  ON puppies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only authenticated admins can delete puppies
CREATE POLICY "Admins can delete puppies"
  ON puppies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_puppies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before update
CREATE TRIGGER set_puppies_updated_at
  BEFORE UPDATE ON puppies
  FOR EACH ROW
  EXECUTE FUNCTION update_puppies_updated_at();

-- Insert sample data (optional - remove if you don't want sample data)
INSERT INTO puppies (
  name, breed, gender, color, age_weeks, base_price, final_price, 
  status, description, primary_photo, featured
) VALUES
  ('Bella', 'Golden Retriever', 'Female', 'Golden', 8, 1200.00, 1200.00, 'Available', 
   'Sweet and playful Golden Retriever puppy. Great with kids!', 
   'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800', true),
  
  ('Max', 'Labrador', 'Male', 'Yellow', 10, 1000.00, 1000.00, 'Available',
   'Energetic and friendly Lab puppy. Loves to play fetch!',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800', true),
  
  ('Luna', 'French Bulldog', 'Female', 'Fawn', 9, 3000.00, 2700.00, 'Available',
   'Adorable French Bulldog with a great personality.',
   'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800', false);

COMMENT ON TABLE puppies IS 'Stores information about available puppies for sale';
COMMENT ON COLUMN puppies.photos IS 'Array of image URLs for the puppy';
COMMENT ON COLUMN puppies.status IS 'Current availability status of the puppy';
COMMENT ON COLUMN puppies.featured IS 'Whether to feature this puppy prominently on the site';
