-- Breeder Tool — PR 15: surface the dam's photo on the breeder Home tile.
--
-- Adds dam_photo_path (and sire_photo_path for symmetry; cheap and may help
-- a later "parents" widget) to breeder_litter_summary. DROP + CREATE because
-- Postgres rejects column-shape changes via CREATE OR REPLACE VIEW.

DROP VIEW IF EXISTS breeder_litter_summary;
CREATE VIEW breeder_litter_summary
  WITH (security_invoker = on) AS
SELECT
  ul.id AS upcoming_litter_id,
  ul.breed,
  ul.lifecycle_status,
  ul.expected_whelping_date,
  ul.date_of_birth AS upcoming_date_of_birth,
  ul.male_puppy_count,
  ul.female_puppy_count,
  ul.total_puppy_count,
  d.name AS dam_name,
  d.photo_path AS dam_photo_path,
  s.name AS sire_name,
  s.photo_path AS sire_photo_path,
  l.id AS litter_id,
  l.date_of_birth AS litter_date_of_birth,
  l.ready_date,
  l.base_price AS litter_base_price,
  COUNT(p.id)::int AS total_puppies,
  COUNT(p.id) FILTER (
    WHERE COALESCE(array_length(p.photos, 1), 0) = 0 AND p.primary_photo IS NULL
  )::int AS puppies_missing_photos,
  MAX(p.updated_at) AS last_puppy_update
FROM upcoming_litters ul
LEFT JOIN breeding_dogs d ON d.id = ul.dam_id
LEFT JOIN breeding_dogs s ON s.id = ul.sire_id
LEFT JOIN litters l ON l.id = ul.id
LEFT JOIN puppies p ON p.upcoming_litter_id = ul.id
GROUP BY ul.id, d.name, d.photo_path, s.name, s.photo_path, l.id, l.date_of_birth, l.ready_date, l.base_price;

COMMENT ON VIEW breeder_litter_summary IS
  'Read model for the breeder Home screen. Joins upcoming_litters → litters on shared UUID. The breeder client SELECTs this through breeder-write (op=loadHome).';
