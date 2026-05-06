// src/lib/utils/depositCalc.ts
// All deposit math goes through this file. No inline calculations elsewhere.

import { DEFAULT_DEPOSIT_AMOUNT, PUPPY_GO_HOME_AGE_DAYS } from '@/lib/constants/deposit';

/**
 * Resolves the deposit amount: per-puppy override falls back to flat default.
 * Litter-level overrides were retired in 2026-05 along with the slot machinery.
 */
export function resolveDepositAmount(opts: { puppyOverride?: number | null }): number {
  const override = opts.puppyOverride;
  if (typeof override === 'number' && override > 0) return override;
  return DEFAULT_DEPOSIT_AMOUNT;
}

/**
 * Returns the balance due after deposit is applied.
 */
export function calculateBalanceDue(purchasePrice: number, depositAmount: number): number {
  return Math.round((purchasePrice - depositAmount) * 100) / 100;
}

/**
 * Returns the earliest valid pickup date: birth-reference + 8 weeks.
 *
 * Preference order for the birth reference:
 *   1. `puppyDob` — actual date of birth (post-birth litters, available puppies)
 *   2. `expectedWhelpingDate` — upcoming litter's projected whelping date
 *
 * If neither is provided, returns null: no minimum is enforceable yet and the
 * caller should not reject any user-picked date on the ground of being too early.
 */
export function getEarliestPickupDate(
  puppyDob: Date | null,
  expectedWhelpingDate?: Date | null
): Date | null {
  const ref = puppyDob ?? expectedWhelpingDate ?? null;
  if (!ref) return null;
  const base = new Date(ref);
  base.setDate(base.getDate() + PUPPY_GO_HOME_AGE_DAYS);
  return base;
}

/**
 * Returns the date when the 14-day purchase completion clock starts.
 * RULE: If deposit was made before puppy reached 8 weeks, clock starts at 8-week date.
 *       If deposit was made after 8 weeks, clock starts at deposit confirmation date.
 */
export function getPickupClockStart(puppyDob: Date | null, depositCreatedAt: Date): Date {
  if (!puppyDob) return depositCreatedAt;
  const goHomeDate = new Date(puppyDob);
  goHomeDate.setDate(goHomeDate.getDate() + PUPPY_GO_HOME_AGE_DAYS);
  return depositCreatedAt < goHomeDate ? goHomeDate : depositCreatedAt;
}

/**
 * Returns the pickup deadline (clockStart + 14 days).
 */
export function getPickupDeadline(clockStart: Date): Date {
  const deadline = new Date(clockStart);
  deadline.setDate(deadline.getDate() + 14);
  return deadline;
}

/**
 * Returns true if the proposed pickup date is valid (>= earliest pickup date).
 * When no birth reference is known, no lower bound is enforceable → always true.
 */
export function isValidPickupDate(
  proposedDate: Date,
  puppyDob: Date | null,
  expectedWhelpingDate?: Date | null
): boolean {
  const earliest = getEarliestPickupDate(puppyDob, expectedWhelpingDate);
  if (!earliest) return true;
  return proposedDate >= earliest;
}

export type PaymentType = 'Deposit' | 'Final Payment' | 'Full Payment';

/**
 * Generates the canonical payment memo string for the buyer to include in
 * their Zelle / Venmo / Cash App / Apple Pay note.
 *
 * Spec format (Deposit Agreement PDF §6 — see docs/spec/dream-connect-hub.md
 * Anchor A):
 *   "[Full Legal Name] · [Phone Number] · [Deposit / Final Payment / Full Payment]"
 *
 * The phone segment is omitted when no phone is provided (matches the SQL
 * generated column on deposit_agreements, which uses
 * `COALESCE(' · ' || NULLIF(buyer_phone,''), '')`).
 *
 * Example: "Maria Gonzalez · (321) 555-0100 · Deposit"
 *          "Maria Gonzalez · Deposit"             (when phone is omitted)
 */
export function generatePaymentMemo(
  buyerName: string,
  buyerPhone?: string | null,
  paymentType: PaymentType = 'Deposit'
): string {
  const phoneSegment = buyerPhone && buyerPhone.trim().length > 0
    ? ` · ${buyerPhone.trim()}`
    : '';
  return `${buyerName}${phoneSegment} · ${paymentType}`;
}

/**
 * Generates an agreement number in DP-YYYY-XXXX format.
 * Use server-side version (SQL function) as source of truth; this is for preview only.
 */
export function generateAgreementNumberPreview(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `DP-${new Date().getFullYear()}-${rand}`;
}
