-- Rename puppies spelled "Golden Doddle" (one d) to locked names.
-- The earlier migration only matched "Golden Doodle" (two d's); these rows were unchanged.
UPDATE puppies SET name = 'Teddy'  WHERE name = 'Golden Doddle 1';
UPDATE puppies SET name = 'Cooper' WHERE name = 'Golden Doddle 2';
UPDATE puppies SET name = 'Finn'   WHERE name = 'Golden Doddle 3';
UPDATE puppies SET name = 'Gus'    WHERE name = 'Golden Doddle 4';
UPDATE puppies SET name = 'Oliver' WHERE name = 'Golden Doddle 5';
