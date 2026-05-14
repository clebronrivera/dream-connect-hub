/**
 * Shared fixture for deposit agreement PDF fill tests.
 * Import into test-fill.ts and any future fill-verification scripts.
 */

import type { DepositAgreementRow } from "../depositAgreementFieldMap.ts";

const T_BUYER_SIGNED  = "2026-05-07T14:00:00.000Z";
const T_ADMIN_APPROVE = "2026-05-07T15:30:00.000Z";
const T_ACK_BASE      = "2026-05-07T13:50:00.000Z";

function ackAt(offsetMinutes: number): string {
  return new Date(
    new Date(T_ACK_BASE).getTime() + offsetMinutes * 60_000
  ).toISOString();
}

/** Exercises every code branch in fillDepositAgreement. See comments inline. */
export const depositAgreementFixture: DepositAgreementRow = {
  // ── Agreement metadata ─────────────────────────────────────────────────
  agreement_number:  "DP-2026-TEST-001",
  buyer_signed_at:   T_BUYER_SIGNED,
  admin_approved_at: T_ADMIN_APPROVE,

  // ── Buyer identity ─────────────────────────────────────────────────────
  buyer_name:   "Carlos Lebron Rivera", // compound surname → initials CLR (not CR)
  buyer_email:  "carlos@example.com",
  buyer_phone:  "(321) 555-0100",
  buyer_street: "1234 Palm Tree Lane",
  buyer_city:   "Orlando",
  buyer_state:  "FL",
  buyer_zip:    "32801",

  // ── How heard — referral with named referrer ───────────────────────────
  // Tests: findReferral checked, referredBy text populated,
  //        all other how-heard boxes unchecked, howFindOther empty.
  how_heard:               "referral",
  how_heard_other_text:    null,
  how_heard_referral_name: "Maria Rodriguez",

  // ── Questionnaire ──────────────────────────────────────────────────────
  q_first_dog:           "yes_first_breed",    // pcq1 — first time this breed
  q_housing:             "house",              // pcq2 — House
  q_hours_alone:         "3to5",              // pcq3 — 3–5 hours
  q_household_members:   "young_children,dogs", // pcq4 — multi-select: 2 checked
  q_puppy_goal:          "companion",          // pcq5 — Companion
  q_training_experience: "some_basics",        // pcq6 — Some Basics

  // ── Puppy / transaction ────────────────────────────────────────────────
  puppy_name:             "Bella",
  breed:                  "Golden Retriever / Poodle (F1)",
  puppy_dob:              "2026-03-01",
  purchase_price:         2500,
  deposit_amount:         300,
  deposit_payment_method: "zelle",

  // ── Pickup — primary AND alt both fully populated ──────────────────────
  proposed_pickup_date:   "2026-05-24",
  pickup_time_preference: "morning",
  pickup_day_preference:  "weekend",
  pickup_alt_date:        "2026-05-31",
  pickup_alt_time:        "afternoon",
  pickup_alt_day:         "either",
  pickup_notes:           "Will bring car seat for puppy. Gate code: 4812.",

  // ── Authorized seller ──────────────────────────────────────────────────
  // authorizedSeller_CLR checked; sellerSignature = "Carlos Lebron Rivera"
  authorized_seller: "carlos_lebron_rivera",

  // ── Acknowledgments — all 7 signed ────────────────────────────────────
  // ack1 — full agreement
  ack_full_agreement_at:        ackAt(0),
  // ack2 — non-refundable / payment authorization
  ack_payment_authorization_at: ackAt(1),
  // ack3 — pickup policy
  ack_pickup_acceptance_at:     ackAt(2),
  // ack4 + ack5 — no dedicated DB columns; fall through to buyer_signed_at
  // ack6 — 18+ age attestation
  ack_age_attestation_at:       ackAt(3),
  // ack7 — e-signature validity
  ack_esign_valid_at:           ackAt(4),

  // ── Buyer signature ────────────────────────────────────────────────────
  buyer_signature_text: "Carlos Lebron Rivera",
};
