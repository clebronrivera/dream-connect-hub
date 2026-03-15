-- Allow public read of breeding_dogs so the Upcoming Litters page can show dam/sire
-- photos via join (single source of truth: photo on the dog, not duplicated on the litter).
create policy "breeding_dogs_public_read"
on public.breeding_dogs for select
to anon, authenticated
using (true);
