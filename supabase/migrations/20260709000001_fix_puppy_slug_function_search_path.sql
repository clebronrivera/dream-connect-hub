-- Follow-up to 20260709000000_puppy_slugs_and_generation.sql: the Supabase
-- security advisor flags SECURITY-relevant functions with a mutable
-- search_path (the function body can be hijacked by a session that's
-- prepended something malicious to its search_path). Pin it explicitly.
CREATE OR REPLACE FUNCTION generate_puppy_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := trim(both '-' from regexp_replace(lower(NEW.name), '[^a-z0-9]+', '-', 'g')) || '-' || left(NEW.id::text, 6);
  END IF;
  RETURN NEW;
END;
$$;
