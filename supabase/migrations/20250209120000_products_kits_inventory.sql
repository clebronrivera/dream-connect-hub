-- Migration: Products, Kits, and Kit Items with Product Photos Storage
-- Creates inventory tables, product-photos bucket, and seed data (no photos initially)

-- ============================================================================
-- 1. PRODUCTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'food_nutrition',
    'bedding_comfort',
    'toys_play',
    'training_supplies',
    'grooming_care',
    'feeding_accessories'
  )),
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold_out', 'inactive')),
  photo TEXT,
  featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================================
-- 2. KITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold_out', 'inactive')),
  photo TEXT,
  badge TEXT,
  featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================================
-- 3. KIT_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_kits_updated_at ON kits;
CREATE TRIGGER update_kits_updated_at
  BEFORE UPDATE ON kits
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_items ENABLE ROW LEVEL SECURITY;

-- Products: public read; admin full CRUD
CREATE POLICY "Public can read products"
  ON products FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can insert products"
  ON products FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update products"
  ON products FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete products"
  ON products FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Kits: public read; admin full CRUD
CREATE POLICY "Public can read kits"
  ON kits FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can insert kits"
  ON kits FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update kits"
  ON kits FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete kits"
  ON kits FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Kit items: public read; admin full CRUD
CREATE POLICY "Public can read kit_items"
  ON kit_items FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can insert kit_items"
  ON kit_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update kit_items"
  ON kit_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete kit_items"
  ON kit_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_kits_display_order ON kits(display_order);
CREATE INDEX IF NOT EXISTS idx_kits_status ON kits(status);
CREATE INDEX IF NOT EXISTS idx_kit_items_kit_id ON kit_items(kit_id);

-- ============================================================================
-- 7. PRODUCT-PHOTOS STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

CREATE POLICY "Public read product photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-photos');

CREATE POLICY "Admin can upload product photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update product photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete product photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 8. SEED DATA (NO PHOTOS - upload via admin later)
-- Only insert if tables are empty (idempotent)
-- ============================================================================

INSERT INTO products (name, description, category, price, status, featured, display_order)
SELECT * FROM (VALUES
  ('Premium Puppy Food', 'High-quality nutrition for growing puppies', 'food_nutrition'::TEXT, 49.99, 'sold_out'::TEXT, true, 1),
  ('Cozy Cloud Bed', 'Ultra-soft orthopedic bed for comfort', 'bedding_comfort'::TEXT, 79.99, 'sold_out'::TEXT, true, 2),
  ('Interactive Puzzle Toy', 'Keeps your puppy mentally stimulated', 'toys_play'::TEXT, 24.99, 'sold_out'::TEXT, true, 3),
  ('Training Treat Bundle', 'Healthy treats for positive reinforcement', 'training_supplies'::TEXT, 19.99, 'sold_out'::TEXT, true, 4),
  ('Grooming Starter Set', 'Essential grooming tools for puppies', 'grooming_care'::TEXT, 34.99, 'sold_out'::TEXT, true, 5),
  ('Adjustable Puppy Collar', 'Comfortable and adjustable for growing pups', 'feeding_accessories'::TEXT, 15.99, 'sold_out'::TEXT, true, 6)
) AS v(name, description, category, price, status, featured, display_order)
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

INSERT INTO kits (name, description, price, status, badge, featured, display_order)
SELECT * FROM (VALUES
  ('Essential Kit', 'Everything a new puppy needs to get started', 79.99, 'available'::TEXT, NULL::TEXT, true, 1),
  ('Complete Kit', 'Comprehensive starter set for your new companion', 149.99, 'available'::TEXT, 'Most Popular'::TEXT, true, 2),
  ('Premium Deluxe Kit', 'The ultimate new puppy experience', 229.99, 'available'::TEXT, NULL::TEXT, true, 3)
) AS v(name, description, price, status, badge, featured, display_order)
WHERE NOT EXISTS (SELECT 1 FROM kits LIMIT 1);

-- Kit items for Essential Kit
INSERT INTO kit_items (kit_id, item_text, display_order)
SELECT k.id, item_text, row_number
FROM kits k
CROSS JOIN LATERAL (
  VALUES 
    ('Food bowl & water bowl', 1),
    ('Puppy bed', 2),
    ('Collar & leash', 3),
    ('Starter toy set', 4)
) AS items(item_text, row_number)
WHERE k.name = 'Essential Kit'
  AND NOT EXISTS (SELECT 1 FROM kit_items WHERE kit_id = k.id LIMIT 1);

-- Kit items for Complete Kit
INSERT INTO kit_items (kit_id, item_text, display_order)
SELECT k.id, item_text, row_number
FROM kits k
CROSS JOIN LATERAL (
  VALUES 
    ('Everything in Essential', 1),
    ('Premium food supply', 2),
    ('Grooming basics', 3),
    ('Training treats', 4),
    ('Crate pad', 5)
) AS items(item_text, row_number)
WHERE k.name = 'Complete Kit'
  AND NOT EXISTS (SELECT 1 FROM kit_items WHERE kit_id = k.id LIMIT 1);

-- Kit items for Premium Deluxe Kit
INSERT INTO kit_items (kit_id, item_text, display_order)
SELECT k.id, item_text, row_number
FROM kits k
CROSS JOIN LATERAL (
  VALUES 
    ('Everything in Complete', 1),
    ('Orthopedic bed', 2),
    ('Interactive toy bundle', 3),
    ('Full grooming set', 4),
    ('Training guide', 5)
) AS items(item_text, row_number)
WHERE k.name = 'Premium Deluxe Kit'
  AND NOT EXISTS (SELECT 1 FROM kit_items WHERE kit_id = k.id LIMIT 1);
