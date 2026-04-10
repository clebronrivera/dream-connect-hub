// src/lib/utils/depositCalc.ts
// All deposit math goes through this file. No inline calculations elsewhere.

import { DEPOSIT_TIERS, PUPPY_GO_HOME_AGE_DAYS } from '@/lib/constants/deposit';

/**
 * Determines which deposit tier applies based on puppy DOB.
 * If puppyDob is null (litter not yet born), defaults to PRE_8_WEEKS.
 */
export function getDepositTier(puppyDob: Date | null): typeof DEPOSIT_TIERS[keyof typeof DEPOSIT_TIERS] {
  if (!puppyDob) return DEPOSIT_TIERS.PRE_8_WEEKS;
  const goHomeDate = new Date(puppyDob);
  goHomeDate.setDate(goHomeDate.getDate() + PUPPY_GO_HOME_AGE_DAYS);
  return new Date() < goHomeDate ? DEPOSIT_TIERS.PRE_8_WEEKS : DEPOSIT_TIERS.POST_8_WEEKS;
}

/**
 * Calculates deposit amount. Rounds to nearest cent.
 */
export function calculateDepositAmount(purchasePrice: number, puppyDob: Date | null): number {
  const tier = getDepositTier(puppyDob);
  return Math.round(purchasePrice * tier.fraction * 100) / 100;
}

/**
 * Returns the balance due after deposit is applied.
 */
export function calculateBalanceDue(purchasePrice: number, depositAmount: number): number {
  return Math.round((purchasePrice - depositAmount) * 100) / 100;
}

/**
 * Returns the earliest valid pickup date (puppy must be >= 8 weeks old).
 * If puppyDob is null, returns today + 56 days as a conservative minimum.
 */
export function getEarliestPickupDate(puppyDob: Date | null): Date {
  const base = puppyDob ? new Date(puppyDob) : new Date();
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
 */
export function isValidPickupDate(proposedDate: Date, puppyDob: Date | null): boolean {
  return proposedDate >= getEarliestPickupDate(puppyDob);
}

/**
 * Generates a deposit explanation string for display in UI.
 * Example: "1/4 of $2,000 = $500 deposit (early reservation rate)"
 */
export function getDepositExplanation(purchasePrice: number, puppyDob: Date | null): string {
  const tier = getDepositTier(puppyDob);
  const amount = calculateDepositAmount(purchasePrice, puppyDob);
  const fractionLabel = tier === DEPOSIT_TIERS.PRE_8_WEEKS ? '1/4' : '1/3';
  return `${fractionLabel} of $${purchasePrice.toLocaleString()} = $${amount.toFixed(2)} deposit — ${tier.label}`;
}

/**
 * Generates the required payment memo string.
 * Example: "Jane Smith - Luna"
 */
export function generatePaymentMemo(buyerName: string, puppyName: string): string {
  return `${buyerName} - ${puppyName || 'Undecided'}`;
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
