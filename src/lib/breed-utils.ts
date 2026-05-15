/**
 * Canonical breed + gender values used across the public site, the admin
 * forms, and the breeder wizard. One source of truth so the inquiry form,
 * puppy create/edit form, upcoming-litter form, and the public filter pills
 * all agree on the same short names.
 */

export const MAIN_BREEDS = [
  'Goldendoodle',
  'Mini Goldendoodle',
  'Labradoodle',
  'Mini Labradoodle',
  'Toy Poodle',
  'Mini Poodle',
  'Standard Poodle',
  'Shih Tzu',
  'Maltese',
  'Pomeranian',
  'Yorkie',
  'Chihuahua',
] as const;

export type MainBreed = (typeof MAIN_BREEDS)[number];

/** Dropdown value when the admin/breeder selects "other" and types a custom breed. */
export const OTHER_BREED_OPTION = 'Unspecified / Other';

/** Map common variants / old records to canonical breed (key = lowercase, trimmed). */
const BREED_ALIASES: Record<string, MainBreed> = {
  // Goldendoodle (full-size / unspecified parent size)
  'goldendoodle': 'Goldendoodle',
  'goldendoodles': 'Goldendoodle',
  'golden doodle': 'Goldendoodle',
  'golden doodles': 'Goldendoodle',
  'f1 labradoodle x f1b goldendoodle': 'Goldendoodle',
  // Mini Goldendoodle — Goldendoodle crossed with a Mini/Toy Poodle. The
  // breeder's existing DB labels these as "F1B Goldendoodle x Miniature
  // Poodle" or "F1B Mini Goldendoodle x Miniature Poodle".
  'mini goldendoodle': 'Mini Goldendoodle',
  'f1b goldendoodle x miniature poodle': 'Mini Goldendoodle',
  'f1b mini goldendoodle x miniature poodle': 'Mini Goldendoodle',
  // Labradoodle family
  'labradoodle': 'Labradoodle',
  'labradoodles': 'Labradoodle',
  'mini labradoodle': 'Mini Labradoodle',
  // Poodle family
  'toy poodle': 'Toy Poodle',
  'akc toy poodle': 'Toy Poodle',
  'akc toy poodle x toy poodle': 'Toy Poodle',
  'mini poodle': 'Mini Poodle',
  'miniature poodle': 'Mini Poodle',
  'standard poodle': 'Standard Poodle',
  'poodle': 'Mini Poodle',
  // Other main breeds
  'shih tzu': 'Shih Tzu',
  'shihtzu': 'Shih Tzu',
  'shih-tzu': 'Shih Tzu',
  'maltese': 'Maltese',
  'pomeranian': 'Pomeranian',
  'yorkie': 'Yorkie',
  'yorkies': 'Yorkie',
  'yorkshire terrier': 'Yorkie',
  'chihuahua': 'Chihuahua',
};

/**
 * Normalize a breed string to the canonical MAIN_BREEDS value when possible,
 * so old records (parent-cross labels, plural spellings) match the main list.
 */
export function normalizeBreedToCanonical(breed: string): string {
  if (!breed?.trim()) return breed || '';
  const key = breed.trim().toLowerCase();
  const canonical =
    BREED_ALIASES[key] ?? MAIN_BREEDS.find((b) => b.toLowerCase() === key);
  return canonical ?? breed.trim();
}

/** Whether the breed is one of the canonical dropdown options (after normalization). */
export function isMainBreed(breed: string): boolean {
  if (!breed?.trim()) return false;
  const canonical = normalizeBreedToCanonical(breed);
  return MAIN_BREEDS.includes(canonical as MainBreed);
}

/** Known crossbreed display labels: key is "dam|sire" (order-independent, normalized). */
const CROSSBREED_DISPLAY: Record<string, MainBreed> = {
  'goldendoodle|poodle': 'Goldendoodle',
  'poodle|goldendoodle': 'Goldendoodle',
  'goldendoodle|mini poodle': 'Mini Goldendoodle',
  'mini poodle|goldendoodle': 'Mini Goldendoodle',
  'goldendoodle|miniature poodle': 'Mini Goldendoodle',
  'miniature poodle|goldendoodle': 'Mini Goldendoodle',
  'goldendoodle|toy poodle': 'Mini Goldendoodle',
  'toy poodle|goldendoodle': 'Mini Goldendoodle',
  'labradoodle|poodle': 'Labradoodle',
  'poodle|labradoodle': 'Labradoodle',
  'labradoodle|mini poodle': 'Mini Labradoodle',
  'mini poodle|labradoodle': 'Mini Labradoodle',
  'mini poodle|poodle': 'Mini Poodle',
  'poodle|mini poodle': 'Mini Poodle',
};

function normalizeKey(breed: string): string {
  return normalizeBreedToCanonical(breed).toLowerCase();
}

/**
 * Compute customer-facing display breed from dam and sire breeds.
 * Same breed -> that name; else known crossbreed label; else the dam breed
 * (since the dam is what most parent-cross conventions key on).
 */
export function getDisplayBreedFromParentBreeds(
  damBreed: string,
  sireBreed: string,
): string {
  const d = normalizeKey(damBreed);
  const s = normalizeKey(sireBreed);
  if (!d && !s) return '';
  if (!d) return normalizeBreedToCanonical(sireBreed);
  if (!s) return normalizeBreedToCanonical(damBreed);
  if (d === s) return normalizeBreedToCanonical(damBreed);
  const known = CROSSBREED_DISPLAY[`${d}|${s}`] ?? CROSSBREED_DISPLAY[`${s}|${d}`];
  if (known) return known;
  return normalizeBreedToCanonical(damBreed);
}

/** Gender canonical values used everywhere a puppy or parent dog has a gender input. */
export const PUPPY_GENDERS = ['Male', 'Female'] as const;
export type PuppyGender = (typeof PUPPY_GENDERS)[number];

/** Dropdown value that reveals a free-text input for the rare edge case. */
export const GENDER_OTHER_OPTION = 'Other (specify)';

/** Canonical color list for the breeder's puppy dropdown. Not exhaustive —
 *  designed to cover the common breeds Dream Puppies works with (poodle /
 *  doodle / shih tzu / pomeranian family). The puppies.color column is text,
 *  so other values stored historically still read through. */
export const PUPPY_COLORS = [
  'Black',
  'White',
  'Cream',
  'Apricot',
  'Red',
  'Tan',
  'Brown',
  'Chocolate',
  'Silver',
  'Gray',
  'Sable',
  'Merle',
  'Phantom',
  'Parti',
  'Brindle',
] as const;
export type PuppyColor = (typeof PUPPY_COLORS)[number];
