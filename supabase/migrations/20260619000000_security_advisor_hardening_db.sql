-- Security-advisor hardening (2026-06-19) — public schema
--
-- Closes findings from the Supabase security advisor that were verified safe by a
-- read-only, adversarially-checked investigation. Every change here is
-- behavior-preserving for the deployed application. See
-- docs/security/advisor-hardening-2026-06.md for the full rationale and the
-- items intentionally left alone.
--
-- Idempotent (DROP POLICY IF EXISTS / ALTER ... SET / REVOKE are all re-runnable).

-- ============================================================================
-- 1. Close the CAPTCHA-bypass hole on intake tables.
--
-- These three tables are written ONLY by captcha-gated, service-role edge
-- functions (service role bypasses RLS), so the permissive `WITH CHECK (true)`
-- anon INSERT policy is dead weight that let anyone POST directly to
-- /rest/v1/<table>, skipping the Turnstile check + server-side validation.
-- Verified: no client-side anon insert path exists for these tables, and
-- submit-contact-message / submit-puppy-inquiry / submit-testimonial are all
-- ACTIVE in production.
--
-- NOT dropped (these still have a direct anon insert / fallback in the app and
-- have no edge function yet): consultation_requests, product_inquiries,
-- training_plan_submissions.
-- ============================================================================
DROP POLICY IF EXISTS "Allow public insert on contact_messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow public insert on puppy_inquiries"  ON public.puppy_inquiries;
DROP POLICY IF EXISTS public_insert_testimonials                ON public.testimonials;

-- ============================================================================
-- 2. Pin search_path on functions flagged `function_search_path_mutable`.
--
-- All are SECURITY INVOKER. Bodies that reference no public objects get an empty
-- search_path; the two that read public tables (already schema-qualified) are
-- pinned to `pg_catalog, public`. pg_catalog is always implicitly searched, so
-- every identifier resolves to exactly the same object as before — verified per
-- function. This only removes the role-mutable search_path attack surface.
-- ============================================================================
ALTER FUNCTION public.compute_pickup_dates()                SET search_path = '';
ALTER FUNCTION public.enforce_deposit_request_transition()  SET search_path = '';
ALTER FUNCTION public.generate_agreement_number()           SET search_path = '';
ALTER FUNCTION public.normalize_deposit_request_phone()     SET search_path = '';
ALTER FUNCTION public.puppies_autoset_date_sold()           SET search_path = '';
ALTER FUNCTION public.puppies_enforce_visibility()          SET search_path = '';
ALTER FUNCTION public.set_breeding_dogs_updated_at()        SET search_path = '';
ALTER FUNCTION public.set_clients_updated_at()              SET search_path = '';
ALTER FUNCTION public.set_parent_dogs_updated_at()          SET search_path = '';
ALTER FUNCTION public.set_site_settings_updated_at()        SET search_path = '';
ALTER FUNCTION public.set_upcoming_litters_updated_at()     SET search_path = '';
ALTER FUNCTION public.set_updated_at()                      SET search_path = '';
ALTER FUNCTION public.stamp_buyer_signed_server_ts()        SET search_path = '';
ALTER FUNCTION public.update_litters_updated_at()           SET search_path = '';
ALTER FUNCTION public.update_puppies_updated_at()           SET search_path = '';
ALTER FUNCTION public.update_updated_at_column()            SET search_path = '';
ALTER FUNCTION public.get_aging_action_items()              SET search_path = pg_catalog, public;
ALTER FUNCTION public.sync_puppy_status_from_agreement()    SET search_path = pg_catalog, public;

-- ============================================================================
-- 3. Revoke unused EXECUTE on SECURITY DEFINER functions.
--
-- These run only as triggers (or are called internally by other definer
-- triggers). Triggers fire regardless of EXECUTE grants, trigger-returning
-- functions are not RPC-callable, and none are referenced in RLS policies — so
-- the anon/authenticated/PUBLIC EXECUTE grants are dead. Revoking closes the
-- `anon_security_definer_function_executable` finding.
--
-- LEFT ALONE on purpose: public.is_admin() (backs 8 RLS policies) and
-- public.log_agreement_event(...) (buyer-token entry point reserved for the
-- in-flight agreement workflow).
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.attach_customer_to_deposit_request()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.attach_customer_to_puppy_inquiry()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_deposit_agreement_to_request()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_customer_for_intake(text, text, text, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
