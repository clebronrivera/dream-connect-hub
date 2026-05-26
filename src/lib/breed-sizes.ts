/**
 * Typical adult-weight ranges (lbs) for the breeds we work with.
 * Used as a fallback on /our-dogs when a breeding dog has no per-dog
 * weight_lbs recorded. Update when a new breed is added to breeding_dogs.breed.
 */
export type BreedSizeRange = { minLb: number; maxLb: number };

const BREED_SIZES: Record<string, BreedSizeRange> = {
  'Goldendoodle': { minLb: 50, maxLb: 75 },
  'Mini Goldendoodle': { minLb: 15, maxLb: 35 },
  'Labradoodle': { minLb: 50, maxLb: 65 },
  'Mini Labradoodle': { minLb: 15, maxLb: 35 },
  'Toy Poodle': { minLb: 4, maxLb: 9 },
  'Mini Poodle': { minLb: 10, maxLb: 15 },
  'Standard Poodle': { minLb: 40, maxLb: 70 },
  'Shih Tzu': { minLb: 9, maxLb: 16 },
};

function normalize(breed: string): string {
  return breed.trim().toLowerCase();
}

const BREED_SIZES_NORMALIZED = Object.fromEntries(
  Object.entries(BREED_SIZES).map(([k, v]) => [normalize(k), v]),
);

export function getBreedSizeRange(breed: string | null | undefined): BreedSizeRange | null {
  if (!breed) return null;
  return BREED_SIZES_NORMALIZED[normalize(breed)] ?? null;
}

/**
 * Display string for the size column on a parent card.
 * Per-dog actual weight wins; otherwise show the breed's typical range.
 * Returns null when neither is known so the card can hide the row.
 */
export function formatDogSize(
  weightLbs: number | null | undefined,
  breed: string | null | undefined,
): string | null {
  if (typeof weightLbs === 'number' && weightLbs > 0) {
    const rounded = Math.round(weightLbs);
    return `~${rounded} lbs`;
  }
  const range = getBreedSizeRange(breed);
  if (range) return `${range.minLb}–${range.maxLb} lbs (typical)`;
  return null;
}
