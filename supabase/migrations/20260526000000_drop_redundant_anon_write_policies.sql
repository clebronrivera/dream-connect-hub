-- Security hardening — audit Phase 1.
--
-- Removes redundant `anon` write policies that are bypassable via PostgREST with
-- the public anon key, which defeats the Turnstile-gated, service-role edge
-- functions that are the intended write path. Legitimate writes are unaffected
-- because they go through service-role edge functions (which bypass RLS):
--   - testimonials          -> submit-testimonial
--   - contact_messages      -> submit-contact-message
--   - puppy_inquiries       -> submit-puppy-inquiry
--   - payment_attestations  -> submit-payment-attestation
-- Admin reads/updates use the admin_* policies; public testimonial display
-- keeps public_read_approved_testimonials; buyer reads keep
-- public_select_via_buyer_token.

-- M1 — intake + testimonial tables: drop open anon INSERT.
-- (testimonials INSERT had WITH CHECK (true), letting anon self-publish a row
-- with is_approved=true straight to the public site; contact_messages and
-- puppy_inquiries let anon spam past Turnstile.)
DROP POLICY IF EXISTS public_insert_testimonials ON public.testimonials;
DROP POLICY IF EXISTS "Allow public insert on contact_messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow public insert on puppy_inquiries" ON public.puppy_inquiries;

-- M2 — payment_attestations: drop anon INSERT/UPDATE. Their WITH CHECK only
-- verified the buyer token, not the field values, so a buyer-token holder could
-- forge server-captured evidence (attestation_status, IP/UA, screenshots,
-- transaction_reference_id) and self-satisfy the mark-payment-sent gate.
-- public_select_via_buyer_token is retained so the buyer can still read the row.
DROP POLICY IF EXISTS public_insert_via_buyer_token ON public.payment_attestations;
DROP POLICY IF EXISTS public_update_via_buyer_token ON public.payment_attestations;

-- L3 — version-control the security-critical is_admin() so a fresh DB rebuild
-- reproduces it identically (it currently exists only in the live DB / archived
-- base schema). Mirrors the live definition verbatim.
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;
