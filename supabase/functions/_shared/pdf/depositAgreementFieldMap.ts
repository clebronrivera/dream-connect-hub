/**
 * depositAgreementFieldMap.ts — Wave F2
 *
 * Maps deposit_agreements DB row values to PDF AcroForm field names.
 * Field names match the actual AcroForm T values in deposit_agreement_template.pdf.
 * See docs/spec/pdf-acroform-fields.md and docs/spec/pdf-field-disambiguation.md.
 *
 * Usage:
 *   const doc = await PDFDocument.load(templateBytes);
 *   const form = doc.getForm();
 *   assertAllFieldsPresent(form);
 *   fillDepositAgreement(form, row, puppy);
 *   form.flatten();
 */

import type { PDFForm } from "https://esm.sh/pdf-lib@1.17.1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DepositAgreementRow {
  agreement_number: string;
  buyer_signed_at: string | null;
  admin_approved_at: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_street: string;
  buyer_city: string;
  buyer_state: string;
  buyer_zip: string;
  // How heard
  how_heard: string | null;
  how_heard_other_text: string | null;
  how_heard_referral_name: string | null;
  // Questionnaire
  q_first_dog: string | null;
  q_housing: string | null;
  q_hours_alone: string | null;
  q_household_members: string | null; // comma-separated or JSON array
  q_puppy_goal: string | null;
  q_training_experience: string | null;
  // Puppy / transaction
  puppy_name: string | null;
  breed: string | null;
  puppy_dob: string | null;
  purchase_price: number;
  deposit_amount: number;
  deposit_payment_method: string;
  proposed_pickup_date: string | null;
  pickup_time_preference: string | null;
  pickup_day_preference: string | null;
  pickup_alt_date: string | null;
  pickup_alt_time: string | null;
  pickup_alt_day: string | null;
  pickup_notes: string | null;
  // Seller
  authorized_seller: string;
  // Ack timestamps
  ack_full_agreement_at: string | null;
  ack_payment_authorization_at: string | null;
  ack_pickup_acceptance_at: string | null;
  ack_age_attestation_at: string | null;
  ack_esign_valid_at: string | null;
  // Signatures
  buyer_signature_text: string;
}

export interface PuppyJoinData {
  sex: string | null;
  litter: {
    dam_name: string | null;
    sire_name: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All text field names in deposit_agreement_template.pdf */
export const TEXT_FIELDS = [
  "buyerName", "email", "phone", "streetAddress", "city", "state", "zipCode",
  "howFindOther", "referredBy",
  "puppyName", "breedColor", "sex", "dateOfBirth",
  "primaryDate", "alternativeDate", "pickupNotes",
  "dam", "sire", "specialMarkings",
  "fullPurchasePrice", "depositAmount",
  "agreementNumber", "agreementDate",
  "initials1", "initials2", "initials3", "initials4", "initials5", "initials6", "initials7",
  "buyerSignature", "dateSigned", "sellerSignature", "dateCountersigned",
] as const;

/** All checkbox field names in deposit_agreement_template.pdf */
export const CHECKBOX_FIELDS = [
  // How heard
  "findInstagram", "findFacebook", "findTikTok", "findGoogle",
  "findReferral", "findFBMktplace", "findYouTube", "findPrevBought",
  // pcq1
  "pcq1_YesFirstDog", "pcq1_YesFirstBreed", "pcq1_No",
  // pcq2
  "pcq2_House", "pcq2_Apartment", "pcq2_Condo", "pcq2_Farm",
  // pcq3
  "pcq3_0to2", "pcq3_3to5", "pcq3_6to8", "pcq3_9plus",
  // pcq4
  "pcq4_YoungChildren", "pcq4_Dogs", "pcq4_Cats", "pcq4_OtherPets", "pcq4_None",
  // pcq5
  "pcq5_Companion", "pcq5_Support", "pcq5_Training", "pcq5_Guard", "pcq5_Other",
  // pcq6
  "pcq6_Never", "pcq6_SomeBasics", "pcq6_Comfortable", "pcq6_Advanced",
  // Pickup
  "primaryTime_Morning", "primaryTime_Afternoon", "primaryTime_Evening",
  "primaryDay_Weekday", "primaryDay_Weekend", "primaryDay_Either",
  "altTime_Morning", "altTime_Afternoon", "altTime_Evening",
  "altDay_Weekday", "altDay_Weekend", "altDay_Either",
  // Payment
  "memoRequired",
  "payment_CashApp", "payment_Venmo", "payment_ApplePay",
  "payment_Zelle", "payment_Cash", "payment_Square",
  // Authorized seller
  "authorizedSeller_CLR", "authorizedSeller_YLR",
  // Acks
  "ack1", "ack2", "ack3", "ack4", "ack5", "ack6", "ack7",
] as const;

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

const HOW_HEARD_CHECKBOX: Record<string, string> = {
  instagram:       "findInstagram",
  facebook:        "findFacebook",
  tiktok:          "findTikTok",
  google:          "findGoogle",
  referral:        "findReferral",
  fb_marketplace:  "findFBMktplace",
  youtube:         "findYouTube",
  previous_buyer:  "findPrevBought",
};

const Q_FIRST_DOG_CHECKBOX: Record<string, string> = {
  yes_first_dog:   "pcq1_YesFirstDog",
  yes_first_breed: "pcq1_YesFirstBreed",
  no:              "pcq1_No",
};

const Q_HOUSING_CHECKBOX: Record<string, string> = {
  house:     "pcq2_House",
  apartment: "pcq2_Apartment",
  condo:     "pcq2_Apartment", // condo and apartment share visual appearance; fallback
  farm:      "pcq2_Farm",
};

const Q_HOURS_ALONE_CHECKBOX: Record<string, string> = {
  "0to2": "pcq3_0to2",
  "3to5": "pcq3_3to5",
  "6to8": "pcq3_6to8",
  "9plus": "pcq3_9plus",
};

// pcq4 is multi-select; values are comma-separated in DB
const Q_HOUSEHOLD_CHECKBOX: Record<string, string> = {
  young_children: "pcq4_YoungChildren",
  dogs:           "pcq4_Dogs",
  cats:           "pcq4_Cats",
  other_pets:     "pcq4_OtherPets",
  none:           "pcq4_None",
};

const Q_GOAL_CHECKBOX: Record<string, string> = {
  companion: "pcq5_Companion",
  support:   "pcq5_Support",
  training:  "pcq5_Training",
  guard:     "pcq5_Guard",
  other:     "pcq5_Other",
};

const Q_TRAINING_CHECKBOX: Record<string, string> = {
  never:       "pcq6_Never",
  some_basics: "pcq6_SomeBasics",
  comfortable: "pcq6_Comfortable",
  advanced:    "pcq6_Advanced",
};

const PICKUP_TIME_CHECKBOX: Record<string, [string, string]> = {
  morning:   ["primaryTime_Morning",   "altTime_Morning"],
  afternoon: ["primaryTime_Afternoon", "altTime_Afternoon"],
  evening:   ["primaryTime_Evening",   "altTime_Evening"],
};

const PICKUP_DAY_CHECKBOX: Record<string, [string, string]> = {
  weekday: ["primaryDay_Weekday", "altDay_Weekday"],
  weekend: ["primaryDay_Weekend", "altDay_Weekend"],
  either:  ["primaryDay_Either",  "altDay_Either"],
};

const PAYMENT_CHECKBOX: Record<string, string> = {
  cashapp:   "payment_CashApp",
  venmo:     "payment_Venmo",
  apple_pay: "payment_ApplePay",
  zelle:     "payment_Zelle",
  cash:      "payment_Cash",
  square:    "payment_Square",
};

const SELLER_CHECKBOX: Record<string, string> = {
  carlos_lebron_rivera:  "authorizedSeller_CLR",
  yolanda_lebron_rivera: "authorizedSeller_YLR",
};

const AUTHORIZED_SELLERS: Record<string, { displayName: string; initials: string }> = {
  carlos_lebron_rivera:  { displayName: "Carlos Lebron Rivera", initials: "CLR" },
  yolanda_lebron_rivera: { displayName: "Yolanda Lebron Rivera", initials: "YLR" },
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Format a date string or ISO timestamp as MM/DD/YYYY for signature/agreement date fields. */
function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // Date-only strings (YYYY-MM-DD) must use UTC to avoid timezone-induced
  // off-by-one: new Date("2026-05-24") parses as UTC midnight, which becomes
  // 2026-05-23 in Eastern time. Timestamps (with T) use Eastern.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: isDateOnly ? "UTC" : "America/New_York",
  });
}

/** Format a date string as "Feb 3, 2026" for DOB fields. */
function fmtLongDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC", // puppy_dob is a date, not a timestamp — use UTC to avoid off-by-one
  });
}

/** Format a dollar amount as "$X,XXX.00". */
function fmtDollars(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Derive buyer initials from full legal name (first letter of each word). */
function deriveBuyerInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? "")
    .filter(Boolean)
    .join("");
}

// ---------------------------------------------------------------------------
// assertAllFieldsPresent
// ---------------------------------------------------------------------------

/**
 * Verifies every expected AcroForm field exists in the loaded template.
 * Throws loudly if any text or checkbox field is missing.
 * Called immediately after PDFDocument.load(), before any fill calls.
 */
export function assertAllFieldsPresent(form: PDFForm): void {
  const missing: string[] = [];

  for (const name of TEXT_FIELDS) {
    try {
      form.getTextField(name);
    } catch {
      missing.push(`text:${name}`);
    }
  }

  for (const name of CHECKBOX_FIELDS) {
    try {
      form.getCheckBox(name);
    } catch {
      missing.push(`checkbox:${name}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `PDF template missing AcroForm fields: ${missing.join(", ")}. ` +
      `Update the template or the field map in depositAgreementFieldMap.ts.`
    );
  }
}

// ---------------------------------------------------------------------------
// fillDepositAgreement
// ---------------------------------------------------------------------------

/**
 * Fills all fields in a loaded deposit agreement PDF form.
 * Expects assertAllFieldsPresent() to have already passed.
 * Call form.flatten() after this function.
 */
export function fillDepositAgreement(
  form: PDFForm,
  row: DepositAgreementRow,
  puppy: PuppyJoinData | null,
): void {
  // -- Text helpers --
  const txt = (name: string, value: string | null | undefined) => {
    form.getTextField(name).setText(value ?? "");
  };
  const chk = (name: string, condition: boolean) => {
    const field = form.getCheckBox(name);
    if (condition) field.check(); else field.uncheck();
  };

  // ── Section 1 — Buyer identity ──────────────────────────────────────────
  txt("buyerName",     row.buyer_name);
  txt("email",         row.buyer_email);
  txt("phone",         row.buyer_phone);
  txt("streetAddress", row.buyer_street);
  txt("city",          row.buyer_city);
  txt("state",         row.buyer_state);
  txt("zipCode",       row.buyer_zip);

  // ── Section 2 — How heard ───────────────────────────────────────────────
  for (const [key, fieldName] of Object.entries(HOW_HEARD_CHECKBOX)) {
    chk(fieldName, row.how_heard === key);
  }
  txt("howFindOther", row.how_heard === "other" ? (row.how_heard_other_text ?? "") : "");
  txt("referredBy",   row.how_heard === "referral" ? (row.how_heard_referral_name ?? "") : "");

  // ── Section 3 — Questionnaire ───────────────────────────────────────────
  // pcq1
  for (const [key, fieldName] of Object.entries(Q_FIRST_DOG_CHECKBOX)) {
    chk(fieldName, row.q_first_dog === key);
  }
  // pcq2
  for (const [key, fieldName] of Object.entries(Q_HOUSING_CHECKBOX)) {
    chk(fieldName, row.q_housing === key);
  }
  // pcq3
  for (const [key, fieldName] of Object.entries(Q_HOURS_ALONE_CHECKBOX)) {
    chk(fieldName, row.q_hours_alone === key);
  }
  // pcq4 — multi-select stored as comma-separated string
  const household = new Set(
    (row.q_household_members ?? "").split(",").map(s => s.trim()).filter(Boolean)
  );
  for (const [key, fieldName] of Object.entries(Q_HOUSEHOLD_CHECKBOX)) {
    chk(fieldName, household.has(key));
  }
  // pcq5
  for (const [key, fieldName] of Object.entries(Q_GOAL_CHECKBOX)) {
    chk(fieldName, row.q_puppy_goal === key);
  }
  // pcq6
  for (const [key, fieldName] of Object.entries(Q_TRAINING_CHECKBOX)) {
    chk(fieldName, row.q_training_experience === key);
  }

  // ── Section 4 — Puppy information ──────────────────────────────────────
  txt("puppyName",   row.puppy_name);
  txt("breedColor",  row.breed);
  txt("sex",         puppy?.sex ?? "");
  txt("dateOfBirth", fmtLongDate(row.puppy_dob));

  // ── Section 5 — Pickup preferences ─────────────────────────────────────
  txt("primaryDate",     fmtShortDate(row.proposed_pickup_date));
  txt("alternativeDate", fmtShortDate(row.pickup_alt_date));
  txt("pickupNotes",     row.pickup_notes);

  if (row.pickup_time_preference) {
    const [primary] = PICKUP_TIME_CHECKBOX[row.pickup_time_preference] ?? [];
    if (primary) chk(primary, true);
  }
  if (row.pickup_alt_time) {
    const [, alt] = PICKUP_TIME_CHECKBOX[row.pickup_alt_time] ?? [];
    if (alt) chk(alt, true);
  }
  if (row.pickup_day_preference) {
    const [primary] = PICKUP_DAY_CHECKBOX[row.pickup_day_preference] ?? [];
    if (primary) chk(primary, true);
  }
  if (row.pickup_alt_day) {
    const [, alt] = PICKUP_DAY_CHECKBOX[row.pickup_alt_day] ?? [];
    if (alt) chk(alt, true);
  }

  // ── Section 6 — Payment method ──────────────────────────────────────────
  for (const [key, fieldName] of Object.entries(PAYMENT_CHECKBOX)) {
    chk(fieldName, row.deposit_payment_method === key);
  }
  chk("memoRequired", true); // always checked — memo required for all payment methods

  // ── Section 7A — Puppy identifier + pricing (seller-completed) ──────────
  txt("dam",             puppy?.litter?.dam_name ?? "");
  txt("sire",            puppy?.litter?.sire_name ?? "");
  txt("specialMarkings", ""); // no DB column
  txt("fullPurchasePrice", fmtDollars(row.purchase_price));
  txt("depositAmount",     fmtDollars(row.deposit_amount));

  // ── Section 8 — Office use / authorized seller ───────────────────────────
  txt("agreementNumber", row.agreement_number ?? "");
  txt("agreementDate",   fmtShortDate(row.buyer_signed_at));

  const sellerCheckboxField = SELLER_CHECKBOX[row.authorized_seller];
  if (!sellerCheckboxField) {
    throw new Error(`Unknown authorized_seller id: "${row.authorized_seller}". Add entry to SELLER_CHECKBOX.`);
  }
  for (const fieldName of Object.values(SELLER_CHECKBOX)) {
    chk(fieldName, fieldName === sellerCheckboxField);
  }

  // ── Section 9 — Acknowledgments ─────────────────────────────────────────
  const buyerInitials = deriveBuyerInitials(row.buyer_name);
  const signedAt = row.buyer_signed_at;

  // ack1 — full agreement
  const a1 = !!row.ack_full_agreement_at;
  chk("ack1", a1); txt("initials1", a1 ? buyerInitials : "");

  // ack2 — non-refundable (mapped to payment_authorization_at, fallback buyer_signed_at)
  const a2 = !!(row.ack_payment_authorization_at ?? signedAt);
  chk("ack2", a2); txt("initials2", a2 ? buyerInitials : "");

  // ack3 — pickup policy
  const a3 = !!row.ack_pickup_acceptance_at;
  chk("ack3", a3); txt("initials3", a3 ? buyerInitials : "");

  // ack4 — sales tax (no dedicated DB column; fallback buyer_signed_at)
  const a4 = !!signedAt;
  chk("ack4", a4); txt("initials4", a4 ? buyerInitials : "");

  // ack5 — reservation confirmation (no dedicated DB column; fallback buyer_signed_at)
  const a5 = !!signedAt;
  chk("ack5", a5); txt("initials5", a5 ? buyerInitials : "");

  // ack6 — 18+ age + identity
  const a6 = !!row.ack_age_attestation_at;
  chk("ack6", a6); txt("initials6", a6 ? buyerInitials : "");

  // ack7 — e-signature validity
  const a7 = !!row.ack_esign_valid_at;
  chk("ack7", a7); txt("initials7", a7 ? buyerInitials : "");

  // ── Section 10 — Signatures ─────────────────────────────────────────────
  const seller = AUTHORIZED_SELLERS[row.authorized_seller];
  if (!seller) {
    throw new Error(`Unknown authorized_seller id: "${row.authorized_seller}". Add entry to AUTHORIZED_SELLERS.`);
  }

  txt("buyerSignature",    row.buyer_signature_text);
  txt("dateSigned",        fmtShortDate(row.buyer_signed_at));
  txt("sellerSignature",   seller.displayName);
  txt("dateCountersigned", fmtShortDate(row.admin_approved_at));
}
