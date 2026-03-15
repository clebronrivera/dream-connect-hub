/**
 * Puppy photo uploads via Supabase Storage.
 * Upload a file to the puppy-photos bucket and get a public URL to store in
 * puppies.primary_photo or puppies.photos so the site displays your image
 * using Supabase Storage.
 */

import { supabase } from './supabase';

const BUCKET = 'puppy-photos';

/**
 * Upload a puppy photo to Supabase Storage. Call this as an authenticated admin.
 * Returns the public URL to store in puppies.primary_photo or puppies.photos.
 */
export async function uploadPuppyPhoto(
  file: File,
  path?: string
): Promise<{ url: string; path: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safePath =
    path ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(safePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  return { url: publicUrl, path: data.path };
}

/**
 * Delete a puppy photo from Storage by path (the path segment of the URL).
 * Use when replacing or removing a photo.
 */
export async function deletePuppyPhoto(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/** Path prefix for breeding dog photos in the same bucket. */
export const BREEDING_DOGS_PREFIX = 'breeding-dogs';

/**
 * Upload a breeding dog photo. Call as authenticated admin.
 * Uses path: breeding-dogs/{breedingDogId}-{timestamp}.{ext}
 * Returns the storage path to store in breeding_dogs.photo_path.
 */
export async function uploadBreedingDogPhoto(
  file: File,
  breedingDogId: string
): Promise<{ url: string; path: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safePath = `${BREEDING_DOGS_PREFIX}/${breedingDogId}-${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(safePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  return { url: publicUrl, path: data.path };
}

/**
 * Get public URL for a breeding dog photo path (e.g. from breeding_dogs.photo_path).
 */
export function getBreedingDogPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
