/**
 * Curated puppy names for auto-fill in admin. Gender-based; duplicate-aware picker.
 * Edit these arrays to add or change names (40 male / 40 female).
 */

export const MALE_PUPPY_NAMES = [
  'Max', 'Buddy', 'Charlie', 'Cooper', 'Bear', 'Teddy', 'Tucker', 'Duke',
  'Oliver', 'Jack', 'Bentley', 'Milo', 'Leo', 'Rocky', 'Zeus', 'Hunter',
  'Finn', 'Lucky', 'Oscar', 'Riley', 'Winston', 'Jasper', 'Louie', 'Hank',
  'Gus', 'Buster', 'Sam', 'Rocco', 'Bruno', 'Murphy', 'Rex', 'Tank',
  'Bandit', 'Bo', 'Cash', 'Chester', 'Frankie', 'Harley', 'King', 'Moose',
] as const;

export const FEMALE_PUPPY_NAMES = [
  'Bella', 'Luna', 'Daisy', 'Lucy', 'Sadie', 'Molly', 'Lily', 'Zoe',
  'Chloe', 'Stella', 'Maggie', 'Sophie', 'Penny', 'Nala', 'Ruby', 'Ellie',
  'Roxy', 'Gracie', 'Millie', 'Piper', 'Willow', 'Lola', 'Maya', 'Rosie',
  'Abby', 'Coco', 'Emma', 'Hazel', 'Ivy', 'Juno', 'Kona', 'Lulu',
  'Mocha', 'Nova', 'Olive', 'Pepper', 'Quinn', 'Riley', 'Sasha', 'Tilly',
] as const;

export type PuppyGender = 'Male' | 'Female';

const maleList = [...MALE_PUPPY_NAMES];
const femaleList = [...FEMALE_PUPPY_NAMES];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick a puppy name by gender, avoiding any names in excludeNames.
 * If all names in the pool are excluded, returns "Name 1", "Name 2", etc. using the first name in the pool as base.
 */
export function getSuggestedPuppyName(
  gender: PuppyGender,
  excludeNames: string[] = []
): string {
  const pool = gender === 'Male' ? shuffle(maleList) : shuffle(femaleList);
  const excludeSet = new Set(excludeNames.map((n) => n.trim().toLowerCase()));
  const available = pool.filter((name) => !excludeSet.has(name.toLowerCase()));
  if (available.length > 0) {
    return available[0];
  }
  const base = pool[0];
  let suffix = 1;
  while (excludeSet.has(`${base} ${suffix}`.toLowerCase())) suffix++;
  return `${base} ${suffix}`;
}
