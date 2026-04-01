import type { Puppy } from '@/lib/supabase';

export function getPuppyImage(puppy: Puppy): string | null {
  if (puppy.primary_photo) return puppy.primary_photo;
  if (puppy.photos && puppy.photos.length > 0) return puppy.photos[0];
  return null;
}

export function getDisplayPrice(puppy: Puppy): number | null {
  if (puppy.final_price) return puppy.final_price;
  if (puppy.base_price) return puppy.base_price;
  return null;
}

export function getSizeCategory(puppy: Puppy): 'small' | 'medium' | 'large' | null {
  const mom = puppy.mom_weight_approx ?? 0;
  const dad = puppy.dad_weight_approx ?? 0;
  const avg = mom && dad ? (mom + dad) / 2 : mom || dad;
  if (!avg) return null;
  if (avg < 15) return 'small';
  if (avg < 45) return 'medium';
  return 'large';
}

export function isPoodleOrDoodle(breed: string): boolean {
  const b = (breed || '').toLowerCase();
  return (
    b.includes('poodle') ||
    b.includes('doodle') ||
    b.includes('goldendoodle') ||
    b.includes('labradoodle')
  );
}

export function isSmallBreed(breed: string): boolean {
  const b = (breed || '').toLowerCase();
  return (
    b.includes('maltese') ||
    b.includes('chihuahua') ||
    b.includes('yorkshire') ||
    b.includes('toy') ||
    b.includes('mini') ||
    b.includes('shih tzu') ||
    b.includes('pomeranian') ||
    b.includes('papillon')
  );
}
