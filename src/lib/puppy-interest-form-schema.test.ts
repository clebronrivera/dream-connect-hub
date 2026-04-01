import { describe, it, expect } from 'vitest';
import {
  puppyInterestFormSchema,
  formatUSPhone,
} from '@/lib/puppy-interest-form-schema';

/** A fully valid base submission — override individual fields to test failures. */
const validBase = {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '5551234567',
  city: 'Austin',
  state: 'TX',
  interestedSpecific: 'no' as const,
  sizePreference: 'Medium',
  breedPreference: ['Goldendoodle'],
  genderPreference: 'No Preference',
  timeline: 'Within 3 months',
  experience: 'First time owner',
  howHeard: 'Google',
};

describe('puppyInterestFormSchema', () => {
  it('accepts a fully valid submission', () => {
    expect(puppyInterestFormSchema.safeParse(validBase).success).toBe(true);
  });

  it('rejects empty first name', () => {
    const r = puppyInterestFormSchema.safeParse({ ...validBase, firstName: '' });
    expect(r.success).toBe(false);
  });

  it('rejects empty last name', () => {
    const r = puppyInterestFormSchema.safeParse({ ...validBase, lastName: '' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const r = puppyInterestFormSchema.safeParse({ ...validBase, email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('rejects phone with fewer than 10 digits', () => {
    const r = puppyInterestFormSchema.safeParse({ ...validBase, phone: '555123' });
    expect(r.success).toBe(false);
  });

  it('rejects empty breedPreference array', () => {
    const r = puppyInterestFormSchema.safeParse({ ...validBase, breedPreference: [] });
    expect(r.success).toBe(false);
  });

  it('requires selectedPuppyId when interestedSpecific is "yes"', () => {
    const r = puppyInterestFormSchema.safeParse({
      ...validBase,
      interestedSpecific: 'yes',
      selectedPuppyId: '',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('selectedPuppyId');
    }
  });

  it('passes when interestedSpecific is "yes" and selectedPuppyId is provided', () => {
    const r = puppyInterestFormSchema.safeParse({
      ...validBase,
      interestedSpecific: 'yes',
      selectedPuppyId: 'abc-123',
    });
    expect(r.success).toBe(true);
  });

  describe('consentCommunications tri-state', () => {
    it('accepts true (opt-in)', () => {
      const r = puppyInterestFormSchema.safeParse({
        ...validBase,
        consentCommunications: true,
      });
      expect(r.success).toBe(true);
      expect(r.data?.consentCommunications).toBe(true);
    });

    it('accepts false (inquiry-only — explicitly declined marketing)', () => {
      const r = puppyInterestFormSchema.safeParse({
        ...validBase,
        consentCommunications: false,
      });
      expect(r.success).toBe(true);
      expect(r.data?.consentCommunications).toBe(false);
    });

    it('accepts omitted consent (unspecified — schema maps to undefined, stored as null)', () => {
      const r = puppyInterestFormSchema.safeParse({ ...validBase });
      expect(r.success).toBe(true);
      // Schema uses z.boolean().optional() — omitted value is undefined, not false.
      expect(r.data?.consentCommunications).toBeUndefined();
    });
  });
});

describe('formatUSPhone', () => {
  it('formats 10 raw digits to (555) 123-4567', () => {
    expect(formatUSPhone('5551234567')).toBe('(555) 123-4567');
  });

  it('re-formats an already-formatted string identically', () => {
    expect(formatUSPhone('(555) 123-4567')).toBe('(555) 123-4567');
  });

  it('formats 3 digits as partial (555', () => {
    expect(formatUSPhone('555')).toBe('(555');
  });

  it('formats 6 digits as (555) 123', () => {
    expect(formatUSPhone('555123')).toBe('(555) 123');
  });

  it('returns empty string for empty input', () => {
    expect(formatUSPhone('')).toBe('');
  });
});
