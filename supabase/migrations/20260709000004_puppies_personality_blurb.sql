-- Phase 6.1: post generator. Personality-led copy (per the business review's
-- framing formula: lead with the buyer's life, not the dog's specs) needs a
-- short, punchy line distinct from the longer public-facing `description`.
ALTER TABLE puppies ADD COLUMN personality_blurb text;
COMMENT ON COLUMN puppies.personality_blurb IS
  'Short, punchy personality line (one sentence) used by the post-generator (src/lib/post-generator.ts) to lead with the puppy''s character rather than specs. Optional -- set in the breeder puppy editor.';
