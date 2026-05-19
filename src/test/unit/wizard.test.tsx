// src/test/unit/wizard.test.tsx — PR 7
//
// Pure-logic unit tests for wizard-layer utilities. These tests do not mount
// React components — they verify the constants, math, and derived-value logic
// that drive UI behaviour. This keeps the suite fast and dependency-free.

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// StepAgreementTerms — CLAUSE_KEYS count
// ---------------------------------------------------------------------------

import { CLAUSE_KEYS } from '@/components/wizard/StepAgreementTerms';

describe('StepAgreementTerms CLAUSE_KEYS', () => {
  it('exports exactly 11 clause keys (5 legacy + 4 Wave-E3 chargeback clauses + age_attestation + arbitration)', () => {
    expect(CLAUSE_KEYS).toHaveLength(11);
  });

  it('includes the four Wave E3 / H6 chargeback-defense clauses', () => {
    expect(CLAUSE_KEYS).toContain('payment_authorization');
    expect(CLAUSE_KEYS).toContain('identity_attestation');
    expect(CLAUSE_KEYS).toContain('pre_dispute_contact');
    expect(CLAUSE_KEYS).toContain('pickup_acceptance');
  });

  it('includes the core agreement clauses', () => {
    expect(CLAUSE_KEYS).toContain('full_agreement');
    expect(CLAUSE_KEYS).toContain('statutory_rights');
    expect(CLAUSE_KEYS).toContain('esign_valid');
    expect(CLAUSE_KEYS).toContain('genetic_disclaimer');
    expect(CLAUSE_KEYS).toContain('arbitration');
    expect(CLAUSE_KEYS).toContain('age_attestation');
    expect(CLAUSE_KEYS).toContain('welfare_responsibility');
  });

  it('contains no duplicate keys', () => {
    const unique = new Set(CLAUSE_KEYS);
    expect(unique.size).toBe(CLAUSE_KEYS.length);
  });
});

// ---------------------------------------------------------------------------
// WizardShell — progressPct math
// ---------------------------------------------------------------------------
// The formula is `Math.round((currentStep / totalSteps) * 100)`.
// Inlining it here so the tests document the contract without importing JSX.

function progressPct(currentStep: number, totalSteps: number): number {
  return Math.round((currentStep / totalSteps) * 100);
}

describe('WizardShell progressPct', () => {
  it('step 1 of 5 → 20%', () => expect(progressPct(1, 5)).toBe(20));
  it('step 3 of 5 → 60%', () => expect(progressPct(3, 5)).toBe(60));
  it('step 5 of 5 → 100%', () => expect(progressPct(5, 5)).toBe(100));
  it('step 1 of 8 → 13% (rounds 12.5 up)', () => expect(progressPct(1, 8)).toBe(13));
  it('step 4 of 8 → 50%', () => expect(progressPct(4, 8)).toBe(50));
  it('step 8 of 8 → 100%', () => expect(progressPct(8, 8)).toBe(100));
});

// ---------------------------------------------------------------------------
// StepAdoptSignature — initials auto-derivation logic
// ---------------------------------------------------------------------------
// Mirrors the useEffect in StepAdoptSignature.tsx:
//   buyerName.split(/\s+/).filter(Boolean).map(p => p[0]?.toUpperCase() ?? '').join('').slice(0,4)

function deriveInitials(buyerName: string): string {
  return buyerName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 4);
}

describe('StepAdoptSignature: auto-derive initials from buyer_name', () => {
  it('two-word name → two uppercase initials', () => {
    expect(deriveInitials('Ana Lima')).toBe('AL');
  });

  it('three-word name → three uppercase initials', () => {
    expect(deriveInitials('Carlos Eduardo Rivera')).toBe('CER');
  });

  it('five-word name → caps at 4 initials', () => {
    expect(deriveInitials('Mary Ann Beth Sullivan Kim')).toBe('MABS');
  });

  it('leading / trailing / extra internal whitespace is ignored', () => {
    expect(deriveInitials('  Maria   Santos  ')).toBe('MS');
  });

  it('single name → one initial', () => {
    expect(deriveInitials('Cher')).toBe('C');
  });

  it('empty string → empty string', () => {
    expect(deriveInitials('')).toBe('');
  });

  it('mixed-case input → initials are always uppercased', () => {
    expect(deriveInitials('john doe')).toBe('JD');
  });
});

// ---------------------------------------------------------------------------
// reservations-service — statusFromAgreement / statusFromRequest bucket logic
// ---------------------------------------------------------------------------
// These private functions are not exported, so we inline the logic here.
// If either function changes, update this test to match and document the
// delta in the PR description.

type AgreementStatus = 'sent' | 'admin_approved' | 'complete' | 'cancelled';
type DepositStatus = 'pending' | 'admin_confirmed' | 'rejected' | 'refunded';
type ReservationStatus =
  | 'needs_countersign'
  | 'awaiting_payment'
  | 'payment_confirmed'
  | 'picked_up'
  | 'cancelled';
type RequestStatus = 'pending' | 'accepted' | 'deposit_link_sent' | 'converted' | 'declined';

function statusFromAgreement(
  agreement_status: AgreementStatus,
  deposit_status: DepositStatus
): ReservationStatus {
  if (
    agreement_status === 'cancelled' ||
    deposit_status === 'rejected' ||
    deposit_status === 'refunded'
  )
    return 'cancelled';
  if (agreement_status === 'complete') return 'picked_up';
  if (agreement_status === 'admin_approved')
    return deposit_status === 'admin_confirmed' ? 'payment_confirmed' : 'awaiting_payment';
  // status === 'sent'
  return 'needs_countersign';
}

function statusFromRequest(
  request_status: RequestStatus
): ReservationStatus | 'awaiting_review' | 'link_ready' | 'link_sent' {
  if (request_status === 'declined') return 'cancelled';
  if (request_status === 'deposit_link_sent') return 'link_sent';
  if (request_status === 'accepted') return 'link_ready';
  // 'pending' or 'converted' (converted rows are excluded from the list by the caller)
  return 'awaiting_review';
}

describe('statusFromAgreement', () => {
  it("sent + pending → needs_countersign (admin has not yet countersigned)", () => {
    expect(statusFromAgreement('sent', 'pending')).toBe('needs_countersign');
  });

  it("admin_approved + pending → awaiting_payment (admin countersigned; deposit outstanding)", () => {
    expect(statusFromAgreement('admin_approved', 'pending')).toBe('awaiting_payment');
  });

  it("admin_approved + admin_confirmed → payment_confirmed", () => {
    expect(statusFromAgreement('admin_approved', 'admin_confirmed')).toBe('payment_confirmed');
  });

  it("complete + any deposit_status → picked_up (handover finalised)", () => {
    expect(statusFromAgreement('complete', 'admin_confirmed')).toBe('picked_up');
    expect(statusFromAgreement('complete', 'pending')).toBe('picked_up');
  });

  it("cancelled agreement_status → cancelled regardless of deposit_status", () => {
    expect(statusFromAgreement('cancelled', 'pending')).toBe('cancelled');
    expect(statusFromAgreement('cancelled', 'admin_confirmed')).toBe('cancelled');
  });

  it("rejected deposit → cancelled regardless of agreement_status", () => {
    expect(statusFromAgreement('sent', 'rejected')).toBe('cancelled');
    expect(statusFromAgreement('admin_approved', 'rejected')).toBe('cancelled');
  });

  it("refunded deposit → cancelled", () => {
    expect(statusFromAgreement('admin_approved', 'refunded')).toBe('cancelled');
  });
});

describe('statusFromRequest', () => {
  it("pending → awaiting_review", () => {
    expect(statusFromRequest('pending')).toBe('awaiting_review');
  });

  it("accepted → link_ready (review done; link not yet sent)", () => {
    expect(statusFromRequest('accepted')).toBe('link_ready');
  });

  it("deposit_link_sent → link_sent (buyer has not yet completed wizard)", () => {
    expect(statusFromRequest('deposit_link_sent')).toBe('link_sent');
  });

  it("declined → cancelled (terminal)", () => {
    expect(statusFromRequest('declined')).toBe('cancelled');
  });

  it("converted → awaiting_review (caller excludes these; falls through gracefully)", () => {
    expect(statusFromRequest('converted')).toBe('awaiting_review');
  });
});
