-- Add optional photo for breeding dogs (stored in puppy-photos bucket, path stored here).
alter table public.breeding_dogs
  add column if not exists photo_path text;

comment on column public.breeding_dogs.photo_path is 'Storage path in puppy-photos bucket for the dog photo (e.g. breeding-dogs/<id>-<ts>.jpg)';
