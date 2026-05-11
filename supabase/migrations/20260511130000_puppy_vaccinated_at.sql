-- Breeder Tool — PR 14: optional vaccinated_at date per puppy.
--
-- The existing puppies.vaccinations text column captures free-form vaccine
-- details (admin-managed). This new column captures the single most recent
-- "vaccinated as of" date the breeder updates from her phone — separate
-- field, separate UX, optional. Public site is free to surface either or
-- neither.

ALTER TABLE puppies
  ADD COLUMN IF NOT EXISTS vaccinated_at date;

COMMENT ON COLUMN puppies.vaccinated_at IS
  'Optional "most recent vaccination" date the breeder updates from /breeder. Distinct from the free-form vaccinations text column managed in /admin.';
