-- Migration: Fix invalid CREATE POLICY IF NOT EXISTS syntax in 20250209100000_admin_dashboard_setup.sql
--
-- PostgreSQL's CREATE POLICY does not support IF NOT EXISTS (PG14-PG17).
-- The original migration at lines 22 and 33 used that invalid syntax for two
-- product_inquiries admin policies, breaking fresh-DB applies. The original
-- file is intentionally left untouched per project convention (never edit
-- applied migrations).
--
-- This migration uses the DROP POLICY IF EXISTS + CREATE POLICY pattern that
-- the rest of the original migration already uses, making the result
-- idempotent: a no-op on environments where the policies somehow already
-- exist, and a clean create elsewhere.

-- Admin can read product_inquiries
DROP POLICY IF EXISTS "Admin can read product_inquiries" ON product_inquiries;
CREATE POLICY "Admin can read product_inquiries"
ON product_inquiries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admin can update product_inquiries
DROP POLICY IF EXISTS "Admin can update product_inquiries" ON product_inquiries;
CREATE POLICY "Admin can update product_inquiries"
ON product_inquiries FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

COMMENT ON POLICY "Admin can read product_inquiries" ON product_inquiries IS 'Allows admins (via profiles.role) to read all product inquiries';
COMMENT ON POLICY "Admin can update product_inquiries" ON product_inquiries IS 'Allows admins (via profiles.role) to update product inquiry status and other fields';
