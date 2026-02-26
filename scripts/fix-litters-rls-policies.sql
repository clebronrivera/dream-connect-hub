-- Run this in Supabase SQL Editor to fix: "new row violates row-level security policy for table litters"
-- Your project uses the "profiles" table for admin (not user_roles). This updates litters policies to match.

DROP POLICY IF EXISTS "Admin can view litters" ON litters;
DROP POLICY IF EXISTS "Admin can insert litters" ON litters;
DROP POLICY IF EXISTS "Admin can update litters" ON litters;
DROP POLICY IF EXISTS "Admin can delete litters" ON litters;

CREATE POLICY "Admin can view litters"
  ON litters FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admin can insert litters"
  ON litters FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admin can update litters"
  ON litters FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admin can delete litters"
  ON litters FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );
