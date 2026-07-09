-- Phase 3.1: per-puppy slugs for /puppies/:slug + generation tracking.
--
-- slug backs the standalone puppy detail page + prerendered sitemap entries
-- (see src/pages/PuppyDetail.tsx and scripts/postbuild-seo.tsx). generation
-- is surfaced as an optional field in the breeder puppy editor — F1b commands
-- a premium and was previously never recorded anywhere.
ALTER TABLE puppies ADD COLUMN slug text;
ALTER TABLE puppies ADD COLUMN generation text
  CHECK (generation IS NULL OR generation IN ('F1', 'F1b', 'F2', 'F2b', 'multigen'));

-- Backfill: lowercase name, non-alphanumeric runs collapsed to a single
-- hyphen, leading/trailing hyphens trimmed, suffixed with the first 6 chars
-- of the puppy's uuid (always hex digits — the first hyphen in a uuid is at
-- position 9, so this can't collide with the id's own hyphen). The suffix
-- guarantees uniqueness without any collision-retry logic.
UPDATE puppies
SET slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 6)
WHERE slug IS NULL;

ALTER TABLE puppies ALTER COLUMN slug SET NOT NULL;
ALTER TABLE puppies ADD CONSTRAINT puppies_slug_key UNIQUE (slug);

CREATE OR REPLACE FUNCTION generate_puppy_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := trim(both '-' from regexp_replace(lower(NEW.name), '[^a-z0-9]+', '-', 'g')) || '-' || left(NEW.id::text, 6);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_puppies_generate_slug
BEFORE INSERT ON puppies
FOR EACH ROW EXECUTE FUNCTION generate_puppy_slug();

COMMENT ON COLUMN puppies.slug IS
  'URL slug for /puppies/:slug, e.g. biscuit-a3f2c1. Auto-generated on insert by trg_puppies_generate_slug when not provided explicitly.';
COMMENT ON COLUMN puppies.generation IS
  'Optional doodle/poodle-mix generation (F1, F1b, F2, F2b, multigen). Set in the breeder puppy editor.';
