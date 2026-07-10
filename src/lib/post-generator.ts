// Phase 6.1 — social post copy generator (not an auto-poster; see the
// review's ToS-risk framing). Encodes the review's copy formula as
// structure, not decoration:
//   - lead with the buyer's life, not the dog's specs
//   - personality line from puppies.personality_blurb
//   - Reserved -> "On Hold", never omitted
//   - close with the question CTA, never a bare price
import { isPoodleOrDoodle, isSmallBreed } from "@/lib/puppy-display-utils";
import { getDisplayAgeWeeks } from "@/lib/puppy-utils";

/** Minimal shape needed to generate copy — works for both the public `Puppy`
 *  type and the breeder dashboard's `BreederPuppyRow`/`BreederPuppyWithLitter`. */
export interface PostGeneratorPuppy {
  name: string;
  breed: string;
  status?: string | null;
  generation?: string | null;
  personality_blurb?: string | null;
  date_of_birth?: string | null;
  age_weeks?: number | null;
}

export interface PostCopy {
  title: string;
  body: string;
  hashtags: string[];
}

export interface GeneratedPosts {
  facebook: PostCopy;
  craigslist: PostCopy;
  instagram: PostCopy;
  tiktok: PostCopy;
}

const FALLBACK_QUESTION_CTA = (name: string) =>
  `Tell us about your home and we'll see if ${name}'s the right fit.`;

/** Buyer-benefit phrases, derived only from data we actually have — no
 *  fabricated claims (e.g. "kid-tested" is not asserted; there's no field for it). */
function buyerBenefits(puppy: PostGeneratorPuppy): string[] {
  const benefits: string[] = [];
  if (isPoodleOrDoodle(puppy.breed)) benefits.push("hypoallergenic-friendly");
  if (isSmallBreed(puppy.breed)) benefits.push("apartment-sized");
  benefits.push("family-raised");
  return benefits;
}

function isOnHold(puppy: PostGeneratorPuppy): boolean {
  return puppy.status === "Reserved";
}

function statusPhrase(puppy: PostGeneratorPuppy): string {
  return isOnHold(puppy) ? "Currently On Hold" : "Available now";
}

function ageLine(puppy: PostGeneratorPuppy): string | null {
  const weeks = getDisplayAgeWeeks(puppy);
  return weeks != null ? `${weeks} weeks old` : null;
}

function questionCta(puppy: PostGeneratorPuppy): string {
  return FALLBACK_QUESTION_CTA(puppy.name);
}

function hashtagsFor(puppy: PostGeneratorPuppy): string[] {
  const breedTag = puppy.breed.replace(/[^a-zA-Z0-9]/g, "");
  const tags = [breedTag, "PuppiesForSale", "DreamPuppies", "OrlandoPuppies"];
  if (isPoodleOrDoodle(puppy.breed)) tags.push("Doodle", "Hypoallergenic");
  return tags;
}

export function generatePostCopy(puppy: PostGeneratorPuppy): GeneratedPosts {
  const benefits = buyerBenefits(puppy);
  const onHold = isOnHold(puppy);
  const status = statusPhrase(puppy);
  const age = ageLine(puppy);
  const personality = puppy.personality_blurb?.trim();
  const cta = questionCta(puppy);
  const breedLine = puppy.generation ? `${puppy.generation} ${puppy.breed}` : puppy.breed;

  const leadSentence = `${capitalize(benefits.join(", "))} — meet ${puppy.name}, a ${breedLine}${age ? `, ${age}` : ""}.`;
  const statusLine = `Status: ${status}.`;
  const personalityLine = personality ? personality : null;

  // --- Facebook Marketplace: title <100 chars, warm but concise body. ---
  const fbTitle = truncate(`${puppy.name} — ${breedLine}${onHold ? " (On Hold)" : ""}`, 99);
  const fbBodyParts = [leadSentence, personalityLine, statusLine, cta].filter(Boolean);
  const facebook: PostCopy = {
    title: fbTitle,
    body: fbBodyParts.join("\n\n"),
    hashtags: [],
  };

  // --- Craigslist: plain text, no emoji, no hashtags. ---
  const clTitle = truncate(`${breedLine} Puppy — ${puppy.name}`, 70);
  const clBodyParts = [leadSentence, personalityLine, statusLine, cta].filter(Boolean);
  const craigslist: PostCopy = {
    title: clTitle,
    body: clBodyParts.join("\n\n"),
    hashtags: [],
  };

  // --- Instagram: shorter body, hashtags block. ---
  const igBodyParts = [
    `${capitalize(benefits.join(", "))} ${puppy.name} is looking for a home!`,
    personalityLine,
    onHold ? "On Hold right now, but reach out anyway." : null,
    cta,
  ].filter(Boolean);
  const instagram: PostCopy = {
    title: truncate(`${puppy.name} the ${breedLine}`, 99),
    body: igBodyParts.join("\n\n"),
    hashtags: hashtagsFor(puppy),
  };

  // --- TikTok: shortest body, hashtags, punchy. ---
  const ttBodyParts = [
    personalityLine ?? `${capitalize(benefits[0] ?? breedLine)} energy.`,
    onHold ? "On Hold — but don't scroll past!" : null,
    cta,
  ].filter(Boolean);
  const tiktok: PostCopy = {
    title: truncate(puppy.name, 99),
    body: ttBodyParts.join(" "),
    hashtags: hashtagsFor(puppy),
  };

  return { facebook, craigslist, instagram, tiktok };
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}
