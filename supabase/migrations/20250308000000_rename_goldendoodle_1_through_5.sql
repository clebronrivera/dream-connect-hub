-- Apply locked male names to the five Goldendoodle puppies (Golden Doodle 1 through 5).
-- Safe to run: only renames rows that currently have these exact names.
UPDATE puppies SET name = 'Teddy'  WHERE name = 'Golden Doodle 1';
UPDATE puppies SET name = 'Cooper' WHERE name = 'Golden Doodle 2';
UPDATE puppies SET name = 'Finn'   WHERE name = 'Golden Doodle 3';
UPDATE puppies SET name = 'Gus'    WHERE name = 'Golden Doodle 4';
UPDATE puppies SET name = 'Oliver' WHERE name = 'Golden Doodle 5';
