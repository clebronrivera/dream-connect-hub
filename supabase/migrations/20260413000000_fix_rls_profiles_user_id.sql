-- ============================================================================
-- FIX: RLS admin policies — profiles.id → profiles.user_id
--
-- Bug: Migrations 20260410000000, 20260411000001-4 mistakenly used
--      profiles.id = auth.uid() instead of profiles.user_id = auth.uid()
--      in admin USING clauses. Since profiles.id is an auto-generated PK,
--      the check always failed and admins could not access protected rows.
-- ============================================================================

ALTER POLICY admin_all_testimonials ON testimonials
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY admin_delete_testimonial_photos ON storage.objects
  USING (
    bucket_id = 'testimonial-photos'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

ALTER POLICY admin_read_training ON training_plan_submissions
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY admin_read_audit_log ON agreement_audit_log
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY admin_all_faq ON faq_items
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY admin_all_deposit_agreements ON deposit_agreements
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY admin_all_final_sales ON final_sales
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY admin_all_payment_methods_config ON payment_methods_config
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
