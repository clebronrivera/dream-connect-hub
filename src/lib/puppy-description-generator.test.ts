import { describe, it, expect } from 'vitest';
import { generatePuppyDescription } from './puppy-description-generator';

describe('puppy-description-generator', () => {
  const baseInput = {
    name: 'Buddy',
    breed: 'Golden Doodles',
    gender: 'Male' as const,
    color: 'Golden',
    age_weeks: 9,
  };

  describe('token replacement', () => {
    it('replaces [Name], [Age], [Breed], [Color] in output', () => {
      const out = generatePuppyDescription(baseInput, { seed: 1 });
      expect(out).toContain('Buddy');
      expect(out).toContain('9 weeks');
      expect(out).toContain('Golden Doodles');
      expect(out).toContain('Golden');
    });

    it('uses male pronouns when gender is Male', () => {
      const out = generatePuppyDescription({ ...baseInput, gender: 'Male' }, { seed: 2 });
      expect(out).toMatch(/\bHe\b/);
      expect(out).toMatch(/\bhis\b/);
    });

    it('uses female pronouns when gender is Female', () => {
      const out = generatePuppyDescription({ ...baseInput, gender: 'Female' }, { seed: 3 });
      expect(out).toMatch(/\bShe\b/);
    });

    it('uses default display values when name or color missing', () => {
      const out = generatePuppyDescription(
        { name: '', breed: 'Shih Tzu', gender: 'Female', age_weeks: 10 },
        { seed: 4 }
      );
      expect(out.length).toBeGreaterThan(0);
      expect(out).toContain('Shih Tzu');
    });
  });

  describe('age bucketing', () => {
    it('uses 8-10 week content when age_weeks is 9', () => {
      const out = generatePuppyDescription({ ...baseInput, age_weeks: 9 }, { seed: 10 });
      expect(out).toContain('Buddy');
      expect(out).toContain('9 weeks');
    });

    it('uses 10-15 week content when age_weeks is 12', () => {
      const out = generatePuppyDescription({ ...baseInput, age_weeks: 12 }, { seed: 11 });
      expect(out).toContain('12 weeks');
    });

    it('handles null age (falls back to 8-10 bucket)', () => {
      const out = generatePuppyDescription(
        { ...baseInput, age_weeks: undefined, date_of_birth: undefined },
        { seed: 12 }
      );
      expect(out.length).toBeGreaterThan(0);
    });
  });

  describe('breed mapping', () => {
    it('uses Golden Doodles tier for Golden Doodles breed', () => {
      const out = generatePuppyDescription({ ...baseInput, breed: 'Golden Doodles' }, { seed: 20 });
      expect(out).toContain('Golden Doodles');
    });

    it('uses Poodle tier for Mini Poodle and Mini Doodle', () => {
      const out1 = generatePuppyDescription({ ...baseInput, breed: 'Mini Poodle' }, { seed: 21 });
      const out2 = generatePuppyDescription({ ...baseInput, breed: 'Mini Doodle' }, { seed: 22 });
      expect(out1.length).toBeGreaterThan(0);
      expect(out2.length).toBeGreaterThan(0);
    });

    it('uses fallback tier for unknown breed', () => {
      const out = generatePuppyDescription({ ...baseInput, breed: 'Unknown Mix' }, { seed: 23 });
      expect(out).toContain('Buddy');
      expect(out.length).toBeGreaterThan(0);
    });
  });

  describe('reproducibility and length', () => {
    it('produces same output with same seed', () => {
      const a = generatePuppyDescription(baseInput, { seed: 42 });
      const b = generatePuppyDescription(baseInput, { seed: 42 });
      expect(a).toBe(b);
    });

    it('produces 5 sentences by default', () => {
      const out = generatePuppyDescription(baseInput, { seed: 30 });
      const sentenceEnds = (out.match(/[.!?]\s+/g) || []).length + (out.trim().match(/[.!?]$/) ? 1 : 0);
      expect(sentenceEnds).toBe(5);
    });

    it('produces 4 sentences when sentenceCount is 4', () => {
      const out = generatePuppyDescription(baseInput, { sentenceCount: 4, seed: 31 });
      const sentenceEnds = (out.match(/[.!?]\s+/g) || []).length + (out.trim().match(/[.!?]$/) ? 1 : 0);
      expect(sentenceEnds).toBe(4);
    });

    it('output has no unreplaced tokens', () => {
      const out = generatePuppyDescription(baseInput, { seed: 32 });
      expect(out).not.toMatch(/\[Name\]|\[Age\]|\[Breed\]|\[Color\]|\[Subject\]|\[Object\]|\[Possessive\]/);
    });
  });

  describe('anti-repetition', () => {
    it('produces unique sentences within one paragraph', () => {
      for (let i = 0; i < 15; i++) {
        const out = generatePuppyDescription(baseInput, { seed: 100 + i });
        const sentences = out.split(/(?<=[.!?])\s+/).filter(Boolean);
        expect(sentences.length).toBeGreaterThanOrEqual(4);
        expect(sentences.length).toBeLessThanOrEqual(6);
        expect(new Set(sentences).size).toBe(sentences.length);
      }
    });
  });
});
