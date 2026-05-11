-- Breeder Tool — PR 11: propagate litter base_price to puppies.
--
-- Mirrors the propagate_litter_ready_date trigger (PR 1). When the
-- breeder sets a litter-wide price via /breeder/litters/:id/edit,
-- the change fans out to every puppy in that litter whose own
-- base_price hasn't been manually overridden.
--
-- Respects per-puppy overrides: a puppy whose base_price differs from
-- the litter's OLD value is treated as manually priced and is not
-- touched.

COMMENT ON COLUMN litters.base_price IS
  'Breeder-reported litter-wide price. Inherited by puppies on insert; a trigger propagates updates to all linked puppies that have not been manually overridden.';

CREATE OR REPLACE FUNCTION propagate_litter_base_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.base_price IS DISTINCT FROM OLD.base_price THEN
    UPDATE puppies
       SET base_price = NEW.base_price,
           updated_at = now()
     WHERE litter_id = NEW.id
       AND (
         base_price IS NULL
         OR base_price = OLD.base_price  -- only sweep along inherited values; respect per-puppy overrides
       );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_litter_base_price ON litters;
CREATE TRIGGER trg_propagate_litter_base_price
  AFTER UPDATE OF base_price ON litters
  FOR EACH ROW EXECUTE FUNCTION propagate_litter_base_price();
