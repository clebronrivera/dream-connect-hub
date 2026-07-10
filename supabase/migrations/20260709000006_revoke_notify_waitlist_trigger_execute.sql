-- Trigger-only function; fires on UPDATE regardless of EXECUTE grants, and
-- isn't referenced in any RLS policy, so the anon/authenticated/PUBLIC
-- EXECUTE grants are dead surface area (same class as the other
-- trigger-only SECURITY DEFINER functions revoked in the June 2026
-- advisor-hardening migration).
REVOKE EXECUTE ON FUNCTION public.notify_waitlist_on_puppy_available() FROM PUBLIC, anon, authenticated;
