/**
 * Product photo uploads via Supabase Storage.
 * Used for both products and kits. Upload to product-photos bucket and store
 * the returned URL in products.photo or kits.photo.
 */

import { supabase } from './supabase';

/**
 * Upload a photo to the product-photos bucket.
 * Returns the public URL to store in products.photo or kits.photo.
 */
export async function uploadProductPhoto(
  file: File,
  productId?: string
): Promise<{ url: string; path: string } | null> {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = productId
      ? `${productId}-${Date.now()}.${fileExt}`
      : `${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('product-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from('product-photos').getPublicUrl(data.path);

    return { url: publicUrl, path: data.path };
  } catch (error) {
    console.error('Error uploading product photo:', error);
    return null;
  }
}

/**
 * Delete a photo from the product-photos bucket by storage path.
 */
export async function deleteProductPhoto(storagePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('product-photos')
      .remove([storagePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product photo:', error);
    return false;
  }
}

/**
 * Replace an existing photo: delete old from storage, upload new.
 * Extracts storage path from Supabase URL using split('/product-photos/')[1].
 */
export async function replaceProductPhoto(
  file: File,
  oldPhotoUrl: string | null,
  productId?: string
): Promise<{ url: string; path: string } | null> {
  if (oldPhotoUrl) {
    const urlParts = oldPhotoUrl.split('/product-photos/');
    if (urlParts.length === 2) {
      const oldPath = urlParts[1];
      if (oldPath) {
        await deleteProductPhoto(oldPath);
      }
    }
  }

  return uploadProductPhoto(file, productId);
}
