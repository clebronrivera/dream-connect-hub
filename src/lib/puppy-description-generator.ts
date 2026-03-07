/**
 * Pure puppy description generator: assembles 4–5 sentences from the tiered content bank
 * using puppy attributes, with token replacement and anti-repetition rules.
 */

import { normalizeBreedToCanonical } from '@/lib/breed-utils';
import { getAgeWeeks } from '@/lib/puppy-utils';
import {
  TIER1_INTRODUCTIONS,
  TIER2_BY_AGE,
  TIER3_BY_BREED,
  BREED_TO_TIER3_KEY,
  TIER4_QUIRKS,
  TIER5_CLOSINGS,
  type ContentLine,
} from '@/lib/puppy-description-content-bank';

export type PuppyDescriptionInput = {
  name: string;
  breed: string;
  gender?: 'Male' | 'Female';
  color?: string;
  date_of_birth?: string | null;
  age_weeks?: number | null;
};

export type GeneratePuppyDescriptionOptions = {
  /** Number of sentences (4 or 5). Default 5. */
  sentenceCount?: 4 | 5;
  /** Optional seed for reproducible output. */
  seed?: number;
};

const AGE_BUCKET_8_10 = '8-10';
const AGE_BUCKET_10_15 = '10-15';

function getPronouns(gender?: 'Male' | 'Female'): { subject: string; object: string; possessive: string } {
  if (gender === 'Male') return { subject: 'He', object: 'him', possessive: 'his' };
  if (gender === 'Female') return { subject: 'She', object: 'her', possessive: 'her' };
  return { subject: 'They', object: 'them', possessive: 'their' };
}

/** Resolve age in weeks from DOB or explicit age_weeks; return display string e.g. "9 weeks". */
function resolveAgeDisplay(input: PuppyDescriptionInput): { ageWeeks: number | null; ageDisplay: string } {
  let weeks: number | null = null;
  if (input.date_of_birth) {
    weeks = getAgeWeeks(input.date_of_birth);
  }
  if (weeks == null && input.age_weeks != null && input.age_weeks >= 0) {
    weeks = input.age_weeks;
  }
  const ageDisplay = weeks != null ? `${weeks} weeks` : '';
  return { ageWeeks: weeks, ageDisplay };
}

/** Map age in weeks to Tier 2 bucket. Outside range uses nearest bucket. */
function getAgeBucket(ageWeeks: number | null): '8-10' | '10-15' {
  if (ageWeeks == null || ageWeeks < 10) return AGE_BUCKET_8_10;
  return AGE_BUCKET_10_15;
}

/** Resolve Tier 3 breed key from canonical breed; use fallback when not in map. */
function getTier3BreedKey(breed: string): string {
  const normalized = normalizeBreedToCanonical(breed);
  const key = BREED_TO_TIER3_KEY[normalized];
  return key ?? 'fallback';
}

/** Seeded RNG for reproducible picks when seed is provided. */
function createSeededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function pickOne<T>(arr: T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}

/** Pick one line from pool, optionally avoiding lines whose idea tag was already used. */
function pickOneAvoidingIdeas(
  pool: ContentLine[],
  usedIdeas: Set<string>,
  random: () => number
): ContentLine {
  const withNewIdea = pool.filter((line) => !line.idea || !usedIdeas.has(line.idea));
  const candidates = withNewIdea.length > 0 ? withNewIdea : pool;
  return pickOne(candidates, random);
}

/** Replace all tokens in a template string. */
function replaceTokens(
  text: string,
  tokens: Record<string, string>
): string {
  let out = text;
  for (const [key, value] of Object.entries(tokens)) {
    const placeholder = `[${key}]`;
    out = out.split(placeholder).join(value || '');
  }
  return out;
}

/** Normalize sentence for "same pattern" check: strip tokens and collapse spaces to detect repetitive structure. */
function patternKey(line: ContentLine): string {
  return line.text
    .replace(/\[Name\]|\[Age\]|\[Breed\]|\[Color\]|\[Subject\]|\[Object\]|\[Possessive\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

/**
 * Generate a 4- or 5-sentence puppy description from the content bank.
 * Uses Tier1 -> Tier2 (age) -> Tier3 (breed) -> Tier4 -> Tier5 when sentenceCount is 5;
 * for 4 sentences, omits Tier4.
 */
export function generatePuppyDescription(
  input: PuppyDescriptionInput,
  opts: GeneratePuppyDescriptionOptions = {}
): string {
  const sentenceCount = opts.sentenceCount ?? 5;
  const random = opts.seed != null ? createSeededRandom(opts.seed) : Math.random;

  const name = (input.name || 'This puppy').trim();
  const breed = (input.breed || '').trim() || 'puppy';
  const color = (input.color || '').trim() || 'lovely';
  const pronouns = getPronouns(input.gender);
  const { ageWeeks, ageDisplay } = resolveAgeDisplay(input);
  const ageBucket = getAgeBucket(ageWeeks);
  const tier3Key = getTier3BreedKey(breed);

  const tokens: Record<string, string> = {
    Name: name,
    Age: ageDisplay,
    Breed: breed,
    Color: color,
    Subject: pronouns.subject,
    Object: pronouns.object,
    Possessive: pronouns.possessive,
  };

  const tier2Pool = TIER2_BY_AGE[ageBucket] ?? TIER2_BY_AGE[AGE_BUCKET_8_10];
  const tier3Pool = TIER3_BY_BREED[tier3Key] ?? TIER3_BY_BREED.fallback;

  const usedIds = new Set<string>();
  const usedIdeas = new Set<string>();
  const usedPatterns: string[] = [];

  function pickAndTrack(pool: ContentLine[], avoidIdeas: boolean): ContentLine {
    let candidates = pool.filter((line) => !usedIds.has(line.id));
    if (candidates.length === 0) candidates = [...pool];

    let chosen: ContentLine;
    if (avoidIdeas) {
      chosen = pickOneAvoidingIdeas(candidates, usedIdeas, random);
    } else {
      chosen = pickOne(candidates, random);
    }

    usedIds.add(chosen.id);
    if (chosen.idea) usedIdeas.add(chosen.idea);

    const pk = patternKey(chosen);
    if (usedPatterns.includes(pk)) {
      const withoutPattern = candidates.filter((c) => patternKey(c) !== pk);
      if (withoutPattern.length > 0) {
        const alt = avoidIdeas
          ? pickOneAvoidingIdeas(withoutPattern, usedIdeas, random)
          : pickOne(withoutPattern, random);
        usedIds.add(alt.id);
        if (alt.idea) usedIdeas.add(alt.idea);
        usedPatterns.push(patternKey(alt));
        return alt;
      }
    }
    usedPatterns.push(pk);
    return chosen;
  }

  const parts: ContentLine[] = [];
  parts.push(pickAndTrack(TIER1_INTRODUCTIONS, false));
  parts.push(pickAndTrack(tier2Pool, true));
  parts.push(pickAndTrack(tier3Pool, true));
  if (sentenceCount >= 5) {
    parts.push(pickAndTrack(TIER4_QUIRKS, true));
  }
  parts.push(pickAndTrack(TIER5_CLOSINGS, true));

  const sentences = parts.map((line) => {
    let s = replaceTokens(line.text, tokens);
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length > 0 && !/[.!?]$/.test(s)) s += '.';
    return s;
  });

  return sentences.join(' ');
}
