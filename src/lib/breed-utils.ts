/** Canonical list of main breeds we sell (used in admin form and filters). */
export const MAIN_BREEDS = [
  'Shih Tzu',
  'Golden Doodles',
  'Labradoodles',
  'Maltese',
  'Poodle',
  'Mini Poodle',
  'Mini Doodle',
  'Chihuahua',
  'Yorkies',
] as const;

export type MainBreed = (typeof MAIN_BREEDS)[number];

/** Dropdown value when user selects "other" and types a custom breed (puppies + upcoming litters). */
export const OTHER_BREED_OPTION = 'Unspecified / Other';

/** Map common variants / old records to canonical breed (key = lowercase). */
const BREED_ALIASES: Record<string, MainBreed> = {
  'shih tzu': 'Shih Tzu',
  'shihtzu': 'Shih Tzu',
  'shih-tzu': 'Shih Tzu',
  'golden doodle': 'Golden Doodles',
  'golden doodles': 'Golden Doodles',
  'labradoodle': 'Labradoodles',
  'labradoodles': 'Labradoodles',
  'maltese': 'Maltese',
  'poodle': 'Poodle',
  'mini poodle': 'Mini Poodle',
  'mini doodle': 'Mini Doodle',
  'mini doodles': 'Mini Doodle',
  'chihuahua': 'Chihuahua',
  'yorkie': 'Yorkies',
  'yorkies': 'Yorkies',
};

/**
 * Normalize a breed string to the canonical MAIN_BREEDS value when possible,
 * so old records (e.g. "Golden Doodle", "Yorkie") match the main breeds list.
 */
export function normalizeBreedToCanonical(breed: string): string {
  if (!breed?.trim()) return breed || '';
  const key = breed.trim().toLowerCase();
  const canonical = BREED_ALIASES[key] ?? MAIN_BREEDS.find((b) => b.toLowerCase() === key);
  return canonical ?? breed.trim();
}

/** Whether the breed is one of the main dropdown options (after normalization). */
export function isMainBreed(breed: string): boolean {
  if (!breed?.trim()) return false;
  const canonical = normalizeBreedToCanonical(breed);
  return MAIN_BREEDS.includes(canonical as MainBreed);
}

/** Known crossbreed display labels: key is "dam|sire" (order-independent, normalized). */
const CROSSBREED_DISPLAY: Record<string, string> = {
  'golden doodles|poodle': 'Goldendoodle',
  'poodle|golden doodles': 'Goldendoodle',
  'labradoodles|poodle': 'Labradoodle',
  'poodle|labradoodles': 'Labradoodle',
  'mini doodle|poodle': 'Mini Doodle',
  'poodle|mini doodle': 'Mini Doodle',
  'mini poodle|poodle': 'Mini Poodle',
  'poodle|mini poodle': 'Mini Poodle',
};

function normalizeKey(breed: string): string {
  return (breed || '').trim().toLowerCase();
}

/**
 * Compute customer-facing display breed from dam and sire breeds.
 * Same breed -> that name; else known crossbreed label; else "DamBreed x SireBreed".
 */
export function getDisplayBreedFromParentBreeds(damBreed: string, sireBreed: string): string {
  const d = normalizeKey(damBreed);
  const s = normalizeKey(sireBreed);
  if (!d && !s) return '';
  if (!d) return sireBreed.trim();
  if (!s) return damBreed.trim();
  if (d === s) return damBreed.trim();
  const key1 = `${d}|${s}`;
  const key2 = `${s}|${d}`;
  const known = CROSSBREED_DISPLAY[key1] ?? CROSSBREED_DISPLAY[key2];
  if (known) return known;
  return `${damBreed.trim()} x ${sireBreed.trim()}`;
}
