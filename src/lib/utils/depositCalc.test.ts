import { describe, it, expect } from 'vitest';
import {
  getEarliestPickupDate,
  isValidPickupDate,
  resolveDepositAmount,
  generatePaymentMemo,
} from './depositCalc';
import { DEFAULT_DEPOSIT_AMOUNT } from '@/lib/constants/deposit';

const addDays = (d: Date, n: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

describe('getEarliestPickupDate', () => {
  it('returns DOB + 56 days when puppy has a DOB', () => {
    const dob = new Date('2026-03-01');
    const earliest = getEarliestPickupDate(dob);
    expect(earliest).toEqual(addDays(dob, 56));
  });

  it('falls back to expected whelping date + 56 days when DOB is null', () => {
    const whelping = new Date('2026-05-01');
    const earliest = getEarliestPickupDate(null, whelping);
    expect(earliest).toEqual(addDays(whelping, 56));
  });

  it('prefers DOB over whelping date when both are provided', () => {
    const dob = new Date('2026-03-01');
    const whelping = new Date('2026-05-01');
    const earliest = getEarliestPickupDate(dob, whelping);
    expect(earliest).toEqual(addDays(dob, 56));
  });

  it('returns null when no birth reference is known', () => {
    expect(getEarliestPickupDate(null)).toBeNull();
    expect(getEarliestPickupDate(null, null)).toBeNull();
    expect(getEarliestPickupDate(null, undefined)).toBeNull();
  });

  it('does not mutate the input date', () => {
    const dob = new Date('2026-03-01');
    const snapshot = dob.getTime();
    getEarliestPickupDate(dob);
    expect(dob.getTime()).toBe(snapshot);
  });
});

describe('isValidPickupDate', () => {
  it('rejects dates before DOB + 56 days', () => {
    const dob = new Date('2026-03-01');
    expect(isValidPickupDate(addDays(dob, 55), dob)).toBe(false);
  });

  it('accepts DOB + 56 days exactly', () => {
    const dob = new Date('2026-03-01');
    expect(isValidPickupDate(addDays(dob, 56), dob)).toBe(true);
  });

  it('accepts dates after DOB + 56 days', () => {
    const dob = new Date('2026-03-01');
    expect(isValidPickupDate(addDays(dob, 120), dob)).toBe(true);
  });

  it('uses expected whelping date when DOB is null', () => {
    const whelping = new Date('2026-05-01');
    expect(isValidPickupDate(addDays(whelping, 55), null, whelping)).toBe(false);
    expect(isValidPickupDate(addDays(whelping, 56), null, whelping)).toBe(true);
  });

  it('accepts any proposed date when no birth reference is known', () => {
    const farPast = new Date('2000-01-01');
    const farFuture = new Date('2099-12-31');
    expect(isValidPickupDate(farPast, null)).toBe(true);
    expect(isValidPickupDate(farFuture, null)).toBe(true);
  });
});

describe('resolveDepositAmount', () => {
  it('returns DEFAULT_DEPOSIT_AMOUNT when no override is provided', () => {
    expect(resolveDepositAmount({})).toBe(DEFAULT_DEPOSIT_AMOUNT);
    expect(resolveDepositAmount({ puppyOverride: null })).toBe(DEFAULT_DEPOSIT_AMOUNT);
    expect(resolveDepositAmount({ puppyOverride: undefined })).toBe(DEFAULT_DEPOSIT_AMOUNT);
  });

  it('returns the puppy override when it is a positive number', () => {
    expect(resolveDepositAmount({ puppyOverride: 500 })).toBe(500);
    expect(resolveDepositAmount({ puppyOverride: 1 })).toBe(1);
    expect(resolveDepositAmount({ puppyOverride: 1234.56 })).toBe(1234.56);
  });

  it('falls back to the default for non-positive overrides', () => {
    expect(resolveDepositAmount({ puppyOverride: 0 })).toBe(DEFAULT_DEPOSIT_AMOUNT);
    expect(resolveDepositAmount({ puppyOverride: -50 })).toBe(DEFAULT_DEPOSIT_AMOUNT);
  });
});

describe('generatePaymentMemo', () => {
  it('formats name + phone + Deposit by default', () => {
    expect(generatePaymentMemo('Maria Gonzalez', '(321) 555-0100')).toBe(
      'Maria Gonzalez · (321) 555-0100 · Deposit'
    );
  });

  it('omits the phone segment when phone is missing', () => {
    expect(generatePaymentMemo('Maria Gonzalez')).toBe('Maria Gonzalez · Deposit');
    expect(generatePaymentMemo('Maria Gonzalez', null)).toBe('Maria Gonzalez · Deposit');
    expect(generatePaymentMemo('Maria Gonzalez', '')).toBe('Maria Gonzalez · Deposit');
    expect(generatePaymentMemo('Maria Gonzalez', '   ')).toBe('Maria Gonzalez · Deposit');
  });

  it('trims surrounding whitespace from phone', () => {
    expect(generatePaymentMemo('Maria Gonzalez', '  (321) 555-0100  ')).toBe(
      'Maria Gonzalez · (321) 555-0100 · Deposit'
    );
  });

  it('supports Final Payment and Full Payment suffixes', () => {
    expect(generatePaymentMemo('John Smith', '4075551212', 'Final Payment')).toBe(
      'John Smith · 4075551212 · Final Payment'
    );
    expect(generatePaymentMemo('John Smith', '4075551212', 'Full Payment')).toBe(
      'John Smith · 4075551212 · Full Payment'
    );
  });
});
