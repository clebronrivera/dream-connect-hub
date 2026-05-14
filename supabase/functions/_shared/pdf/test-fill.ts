/**
 * test-fill.ts — local PDF fill verification script
 *
 * NOT a test suite. A direct fill exercise against the real template.
 * Run from repo root:
 *
 *   deno run --allow-read --allow-write \
 *     supabase/functions/_shared/pdf/test-fill.ts
 *
 * Writes output to /tmp/test-deposit-fill.pdf.
 * Open in Preview / Adobe / Chrome and verify every field manually.
 */

import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import {
  assertAllFieldsPresent,
  fillDepositAgreement,
  TEXT_FIELDS,
  CHECKBOX_FIELDS,
} from "./depositAgreementFieldMap.ts";
import { depositAgreementFixture } from "./__fixtures__/depositAgreement.fixture.ts";
import { puppyJoinFixture } from "./__fixtures__/puppyJoin.fixture.ts";

// ---------------------------------------------------------------------------
// Load template
// ---------------------------------------------------------------------------

console.log("=== Dream Puppies — Deposit Agreement PDF fill test ===\n");

const templatePath = new URL(
  "./templates/deposit_agreement_template.pdf",
  import.meta.url
);
console.log("Template:", templatePath.pathname);
const templateBytes = await Deno.readFile(templatePath);
console.log(`Loaded — ${templateBytes.byteLength.toLocaleString()} bytes\n`);

const pdfDoc = await PDFDocument.load(templateBytes);
const form = pdfDoc.getForm();
const pdfFieldNames = form.getFields().map((f) => f.getName());
console.log(`AcroForm fields in template: ${pdfFieldNames.length}`);

// ---------------------------------------------------------------------------
// Map → PDF: assertAllFieldsPresent
// ---------------------------------------------------------------------------

console.log("\n── Map → PDF (assertAllFieldsPresent) ──────────────────────────");
try {
  assertAllFieldsPresent(form);
  console.log("✓ PASS — every field in the map exists in the template");
} catch (err) {
  console.error("✗ FAIL — field map drift detected:");
  console.error((err as Error).message);
  Deno.exit(1);
}

// ---------------------------------------------------------------------------
// PDF → Map: orphan check
// ---------------------------------------------------------------------------

console.log("\n── PDF → Map (orphan check) ─────────────────────────────────────");
const knownFields = new Set<string>([
  ...(TEXT_FIELDS as readonly string[]),
  ...(CHECKBOX_FIELDS as readonly string[]),
]);
const orphans = pdfFieldNames.filter((n) => !knownFields.has(n));

if (orphans.length === 0) {
  console.log(`✓ PASS — no orphan fields (all ${pdfFieldNames.length} template fields are in the map)`);
} else {
  console.warn(`⚠ ${orphans.length} orphan field(s) in template but missing from field map:`);
  for (const name of orphans) {
    const field = form.getField(name);
    console.warn(`    ${name}  [${field.constructor.name}]`);
  }
  console.warn(
    "\nOrphans are silently skipped in production. Add them to TEXT_FIELDS or CHECKBOX_FIELDS\n" +
    "in depositAgreementFieldMap.ts if they should be filled, or document them as intentionally\n" +
    "skipped in the 'parked field' block in docs/spec/pdf-field-disambiguation.md."
  );
}

// ---------------------------------------------------------------------------
// Fill
// ---------------------------------------------------------------------------

console.log("\n── fillDepositAgreement ─────────────────────────────────────────");
try {
  fillDepositAgreement(form, depositAgreementFixture, puppyJoinFixture);
  console.log("✓ fillDepositAgreement completed");
} catch (err) {
  console.error("✗ fillDepositAgreement FAILED:\n", (err as Error).message);
  Deno.exit(1);
}

// ---------------------------------------------------------------------------
// Spot-check helpers
// ---------------------------------------------------------------------------

let failures = 0;

const check = (label: string, fieldName: string, expected: string) => {
  try {
    const val = form.getTextField(fieldName).getText() ?? "";
    const ok = val === expected;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "✓" : "✗"} ${label.padEnd(28)} "${val}"` +
      (ok ? "" : `  ← expected "${expected}"`)
    );
  } catch {
    failures++;
    console.log(`  ✗ ${label.padEnd(28)} field not found`);
  }
};

const checkBox = (label: string, fieldName: string, expectedChecked: boolean) => {
  try {
    const checked = form.getCheckBox(fieldName).isChecked();
    const ok = checked === expectedChecked;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "✓" : "✗"} ${label.padEnd(28)} ${checked ? "☑" : "☐"}` +
      (ok ? "" : `  ← expected ${expectedChecked ? "☑" : "☐"}`)
    );
  } catch {
    failures++;
    console.log(`  ✗ ${label.padEnd(28)} field not found`);
  }
};

// ---------------------------------------------------------------------------
// Spot-check — buyer identity
// ---------------------------------------------------------------------------

console.log("\n── Spot-check: buyer identity ───────────────────────────────────");
check("buyerName",         "buyerName",   "Carlos Lebron Rivera");
check("email",             "email",       "carlos@example.com");
check("phone",             "phone",       "(321) 555-0100");
check("streetAddress",     "streetAddress","1234 Palm Tree Lane");
check("city",              "city",        "Orlando");
check("state",             "state",       "FL");
check("zipCode",           "zipCode",     "32801");

// ---------------------------------------------------------------------------
// Spot-check — how heard
// ---------------------------------------------------------------------------

console.log("\n── Spot-check: how heard ────────────────────────────────────────");
checkBox("findReferral ✓",    "findReferral",   true);
checkBox("findInstagram ☐",   "findInstagram",  false);
checkBox("findFacebook ☐",    "findFacebook",   false);
checkBox("findGoogle ☐",      "findGoogle",     false);
check   ("referredBy",        "referredBy",     "Maria Rodriguez");
check   ("howFindOther empty","howFindOther",   "");

// ---------------------------------------------------------------------------
// Spot-check — questionnaire
// ---------------------------------------------------------------------------

console.log("\n── Spot-check: questionnaire ────────────────────────────────────");
checkBox("pcq1_YesFirstBreed ✓", "pcq1_YesFirstBreed", true);
checkBox("pcq1_YesFirstDog ☐",   "pcq1_YesFirstDog",   false);
checkBox("pcq1_No ☐",            "pcq1_No",            false);
checkBox("pcq2_House ✓",         "pcq2_House",         true);
checkBox("pcq2_Apartment ☐",     "pcq2_Apartment",     false);
checkBox("pcq3_3to5 ✓",          "pcq3_3to5",          true);
checkBox("pcq3_0to2 ☐",          "pcq3_0to2",          false);
// pcq4 multi-select — two checked, three unchecked
checkBox("pcq4_YoungChildren ✓", "pcq4_YoungChildren", true);
checkBox("pcq4_Dogs ✓",          "pcq4_Dogs",          true);
checkBox("pcq4_Cats ☐",          "pcq4_Cats",          false);
checkBox("pcq4_OtherPets ☐",     "pcq4_OtherPets",     false);
checkBox("pcq4_None ☐",          "pcq4_None",          false);
checkBox("pcq5_Companion ✓",     "pcq5_Companion",     true);
checkBox("pcq5_Support ☐",       "pcq5_Support",       false);
checkBox("pcq6_SomeBasics ✓",    "pcq6_SomeBasics",    true);
checkBox("pcq6_Never ☐",         "pcq6_Never",         false);

// ---------------------------------------------------------------------------
// Spot-check — puppy data + pricing
// ---------------------------------------------------------------------------

console.log("\n── Spot-check: puppy + pricing ──────────────────────────────────");
check("puppyName",        "puppyName",        "Bella");
check("breedColor",       "breedColor",       "Golden Retriever / Poodle (F1)");
check("sex",              "sex",              "Female");
check("dateOfBirth",      "dateOfBirth",      "Mar 1, 2026");
check("dam",              "dam",              "Luna");
check("sire",             "sire",             "Duke");
check("fullPurchasePrice","fullPurchasePrice", "$2,500.00");
check("depositAmount",    "depositAmount",    "$300.00");

// ---------------------------------------------------------------------------
// Spot-check — pickup preferences
// ---------------------------------------------------------------------------

console.log("\n── Spot-check: pickup ───────────────────────────────────────────");
check   ("primaryDate",         "primaryDate",         "05/24/2026");
check   ("alternativeDate",     "alternativeDate",     "05/31/2026");
check   ("pickupNotes",         "pickupNotes",         "Will bring car seat for puppy. Gate code: 4812.");
checkBox("primaryTime_Morning ✓","primaryTime_Morning", true);
checkBox("primaryTime_Afternoon","primaryTime_Afternoon",false);
checkBox("primaryDay_Weekend ✓", "primaryDay_Weekend",  true);
checkBox("primaryDay_Weekday ☐", "primaryDay_Weekday",  false);
checkBox("altTime_Afternoon ✓",  "altTime_Afternoon",   true);
checkBox("altTime_Morning ☐",    "altTime_Morning",     false);
checkBox("altDay_Either ✓",      "altDay_Either",       true);
checkBox("altDay_Weekday ☐",     "altDay_Weekday",      false);

// ---------------------------------------------------------------------------
// Spot-check — payment method
// ---------------------------------------------------------------------------

console.log("\n── Spot-check: payment method ───────────────────────────────────");
checkBox("payment_Zelle ✓",    "payment_Zelle",   true);
checkBox("payment_Cash ☐",     "payment_Cash",    false);
checkBox("payment_CashApp ☐",  "payment_CashApp", false);
checkBox("payment_Venmo ☐",    "payment_Venmo",   false);
checkBox("payment_Square ☐",   "payment_Square",  false);
checkBox("payment_ApplePay ☐", "payment_ApplePay",false);
checkBox("memoRequired ✓",     "memoRequired",    true);

// ---------------------------------------------------------------------------
// Spot-check — authorized seller
// ---------------------------------------------------------------------------

console.log("\n── Spot-check: authorized seller ────────────────────────────────");
checkBox("authorizedSeller_CLR ✓","authorizedSeller_CLR", true);
checkBox("authorizedSeller_YLR ☐","authorizedSeller_YLR", false);

// ---------------------------------------------------------------------------
// Spot-check — acknowledgments: all 7 checked + all 7 initials = CLR
// ---------------------------------------------------------------------------

console.log("\n── Spot-check: acknowledgments (all 7) ─────────────────────────");
for (let i = 1; i <= 7; i++) {
  checkBox(`ack${i}`,        `ack${i}`,        true);
  check   (`initials${i}`,   `initials${i}`,   "CLR");
}

// ---------------------------------------------------------------------------
// Spot-check — signatures + dates
// ---------------------------------------------------------------------------

console.log("\n── Spot-check: signatures + dates ───────────────────────────────");
check("buyerSignature",   "buyerSignature",   "Carlos Lebron Rivera");
check("dateSigned",       "dateSigned",       "05/07/2026");
check("sellerSignature",  "sellerSignature",  "Carlos Lebron Rivera");
check("dateCountersigned","dateCountersigned","05/07/2026");
check("agreementNumber",  "agreementNumber",  "DP-2026-TEST-001");
check("agreementDate",    "agreementDate",    "05/07/2026");

// ---------------------------------------------------------------------------
// Flatten + save
// ---------------------------------------------------------------------------

console.log("\n── Flatten + save ───────────────────────────────────────────────");
form.flatten();
console.log("✓ form.flatten() completed");

const outPath = "/tmp/test-deposit-fill.pdf";
const pdfBytes = await pdfDoc.save();
await Deno.writeFile(outPath, pdfBytes);
console.log(`✓ PDF saved → ${outPath}  (${pdfBytes.byteLength.toLocaleString()} bytes)`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n═══════════════════════════════════════════════════════════════════");
if (failures === 0) {
  console.log(`✓ All spot-checks passed. Open ${outPath} and verify visually.`);
} else {
  console.error(`✗ ${failures} spot-check(s) FAILED — fix field map before opening PDF.`);
  Deno.exit(1);
}
