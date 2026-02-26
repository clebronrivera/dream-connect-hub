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
