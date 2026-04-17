/**
 * Builds a default display name for a freshly-created puppy row in a litter.
 *
 * Preference order:
 *   1. "{damName} x {sireName} #{index}" — e.g. "Star x Bruno #1"
 *   2. "{parent} #{index}" — when only one parent's name is known
 *   3. "Puppy {index}" — fallback when no parent names are available
 *
 * `index` is 1-based. Whitespace-only names are treated as missing.
 */
export function buildDefaultPuppyName(params: {
  damName?: string | null;
  sireName?: string | null;
  index: number;
}): string {
  const dam = params.damName?.trim() || '';
  const sire = params.sireName?.trim() || '';
  const n = params.index;

  if (dam && sire) return `${dam} x ${sire} #${n}`;
  if (dam) return `${dam} #${n}`;
  if (sire) return `${sire} #${n}`;
  return `Puppy ${n}`;
}
