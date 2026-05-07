# PDF AcroForm field disambiguation — Wave F

**Produced by:** Wave F0 inspection (2026-05-06); revised 2026-05-07 against real AcroForm PDFs  
**Companion to:** `docs/spec/pdf-acroform-fields.md`  
**Status:** Design decisions locked for F1–F4.

---

## 1. Field naming convention

The physical PDFs use **camelCase** names (not the snake_case names that Wave F0 originally designed). The `depositAgreementFieldMap.ts` module maps from DB column names (snake_case) to PDF field names (camelCase). Do not rename the PDF fields — they are in the physical files.

| Convention | Example |
|---|---|
| PDF AcroForm `T` value | `buyerName`, `ack1`, `pa_sig_cityStateZip` |
| DB column | `buyer_name`, `ack_full_agreement_at` |
| TS constant key | snake_case (mirrors DB side) |

---

## 2. Field types — mixed, not all text

The original F0 spec assumed all fields were Text. The actual PDFs use:

| Field category | Widget type | Fill method (pdf-lib) |
|---|---|---|
| Buyer info, prices, dates, signatures, names | Text | `form.getTextField(name).setText(value)` |
| How-heard, questionnaire, payment method, authorized seller, acknowledgments, time/day prefs | **Checkbox** | `form.getCheckBox(name).check()` or `.uncheck()` |

The field map must handle both. `assertAllFieldsPresent` must call `form.getTextField` for text fields and `form.getCheckBox` for checkbox fields — mixing types throws.

---

## 3. Acknowledgment fields — checkboxes + initials, not timestamps

### How it works

The buyer ticks acknowledgments in the web form (recording `ack_*_at` timestamps). The PDF is generated after. The PDF checkbox is filled based on whether the corresponding DB timestamp is set, and the initials text field is filled with the buyer's derived initials.

```ts
// For each ack row in the deposit agreement:
const isAcked = !!row.ack_full_agreement_at;  // boolean
if (isAcked) form.getCheckBox("ack1").check();
form.getTextField("initials1").setText(deriveBuyerInitials(row.buyer_name));
```

### Buyer initials derivation

```ts
function deriveBuyerInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");
}
// "Carlos Lebron Rivera" → "CLR"
// "Maria Gonzalez" → "MG"
```

### Deposit Agreement ack mapping (ack1–7)

| PDF pair | Ack text (abbreviated) | DB column | Fallback if column absent |
|---|---|---|---|
| `ack1` / `initials1` | Full agreement read/understood | `ack_full_agreement_at` | — |
| `ack2` / `initials2` | $300 deposit is NON-REFUNDABLE | `ack_payment_authorization_at` | `buyer_signed_at` |
| `ack3` / `initials3` | Pickup policy coordination | `ack_pickup_acceptance_at` | `buyer_signed_at` |
| `ack4` / `initials4` | Applicable sales tax acknowledged | *(no dedicated column)* | `buyer_signed_at` |
| `ack5` / `initials5` | Reservation not confirmed until payment verified + countersigned | *(no dedicated column)* | `buyer_signed_at` |
| `ack6` / `initials6` | 18+ age + all info accurate | `ack_age_attestation_at` | `buyer_signed_at` |
| `ack7` / `initials7` | Electronic signature legally binding | `ack_esign_valid_at` | `buyer_signed_at` |

### Purchase Agreement ack mapping (pa_ack1–7)

The purchase agreement's 7 acknowledgments map cleanly to the 7 canonical DB columns:

| PDF pair | DB column |
|---|---|
| `pa_ack1` / `pa_initials1` | `ack_full_agreement_at` |
| `pa_ack2` / `pa_initials2` | `ack_statutory_rights_at` |
| `pa_ack3` / `pa_initials3` | `ack_esign_valid_at` |
| `pa_ack4` / `pa_initials4` | `ack_genetic_disclaimer_at` |
| `pa_ack5` / `pa_initials5` | `ack_arbitration_at` |
| `pa_ack6` / `pa_initials6` | `ack_age_attestation_at` |
| `pa_ack7` / `pa_initials7` | `ack_welfare_responsibility_at` |

`pa_arbitrationConfirm` — the typed phrase field — is populated at purchase agreement generation time (future wave). Column TBD.

---

## 4. Payment method — checkboxes, not text

The deposit agreement uses one checkbox per payment method. Exactly one is checked.

```ts
const METHOD_CHECKBOX: Record<string, string> = {
  cashapp:   "payment_CashApp",
  venmo:     "payment_Venmo",
  apple_pay: "payment_ApplePay",
  zelle:     "payment_Zelle",
  cash:      "payment_Cash",
  square:    "payment_Square",
};

for (const [key, fieldName] of Object.entries(METHOD_CHECKBOX)) {
  if (row.deposit_payment_method === key) {
    form.getCheckBox(fieldName).check();
  }
}

// memoRequired — always checked (memo instruction is printed for all methods;
// Square generates an invoice separately but the field stays checked)
form.getCheckBox("memoRequired").check();
```

---

## 5. Authorized seller — checkboxes, not text

Two checkboxes; exactly one checked.

```ts
const SELLER_CHECKBOX: Record<string, string> = {
  carlos_lebron_rivera:  "authorizedSeller_CLR",
  yolanda_lebron_rivera: "authorizedSeller_YLR",
};

const sellerField = SELLER_CHECKBOX[row.authorized_seller];
if (!sellerField) throw new Error(`Unknown authorized_seller id: ${row.authorized_seller}`);
form.getCheckBox(sellerField).check();
```

The signature fields (`sellerSignature`, `pa_sellerSignature`) are **text** fields and receive the full display name:
```ts
form.getTextField("sellerSignature").setText(
  AUTHORIZED_SELLERS[row.authorized_seller].displayName
);
```

---

## 6. Pickup time and day — checkboxes

One checkbox per time-of-day and one per day-type; one in each group is checked.

```ts
const TIME_CHECKBOX: Record<string, string> = {
  morning:   "primaryTime_Morning",
  afternoon: "primaryTime_Afternoon",
  evening:   "primaryTime_Evening",
};
const DAY_CHECKBOX: Record<string, string> = {
  weekday: "primaryDay_Weekday",
  weekend: "primaryDay_Weekend",
  either:  "primaryDay_Either",
};
// Same pattern for altTime_* and altDay_* using pickup_alt_time / pickup_alt_day
```

If the preference column is NULL, leave all corresponding checkboxes unchecked.

---

## 7. Purchase Agreement — mirror fields (pa_sig_*)

Pages 4–5 of the purchase agreement repeat puppy + buyer data in the signature block. These 13 `pa_sig_*` fields are filled from the same computed values as the primary fields — not from separate DB queries.

```ts
// After primary fill loop, fill mirrors from the same values:
form.getTextField("pa_sig_puppyName").setText(filledValues.pa_puppyName);
form.getTextField("pa_sig_breedColor").setText(filledValues.pa_breedColor);
// ... etc. for all 13 pa_sig_* fields
```

---

## 8. Puppy DOB field naming — `dateOfBirth` vs buyer DOB

| Field name | Template | Refers to | Buyer DOB? |
|---|---|---|---|
| `dateOfBirth` | Deposit Agreement | **Puppy** date of birth | ❌ Never |
| `pa_dateOfBirth` | Purchase Agreement | **Puppy** date of birth | ❌ Never |

Buyer date of birth is **never collected** and has no PDF field in either template.

---

## 9. `dam` and `sire` — lookup via litter join

The deposit agreement has `dam` and `sire` text fields (seller-completed section).  
These come from `upcoming_litters.dam_name` / `upcoming_litters.sire_name` via the puppy's `litter_id`.

```ts
// In generate-agreement-pdf, fetch with join:
const { data } = await supabase
  .from("deposit_agreements")
  .select(`
    *,
    puppy:puppies!inner(
      sex,
      litter:upcoming_litters(dam_name, sire_name)
    )
  `)
  .eq("id", agreementId)
  .single();

form.getTextField("dam").setText(data.puppy?.litter?.dam_name ?? "");
form.getTextField("sire").setText(data.puppy?.litter?.sire_name ?? "");
```

If the puppy has no `litter_id`, both fields are empty strings.

---

## 10. Fields with no DB column — leave empty string

These fields exist in the PDF but have no corresponding DB column. Write `""` (never throw).

| Field | PDF | Reason |
|---|---|---|
| `specialMarkings` | DA | No `special_markings` column |
| `pa_approxWeight` | PA | No `approx_weight` column |
| `pa_cviCertNo` | PA | CVI cert not stored in DB; operator enters manually |

---

## 11. Date formatting — canonical patterns

| Context | Format | Example |
|---|---|---|
| `agreementDate`, `dateSigned`, `dateCountersigned`, `primaryDate`, `alternativeDate`, `pa_agreementDate`, `pa_buyerDateSigned`, `pa_sellerDateSigned` | `MM/DD/YYYY` | `05/07/2026` |
| `dateOfBirth`, `pa_dateOfBirth`, `pa_sig_dob` | `MMM d, yyyy` | `Feb 3, 2026` |

All formatting runs inside the edge function using `Intl.DateTimeFormat`. Do not format on the client side.

Nullable dates: write `""` (empty string), never `"N/A"` or `"Unknown"`.

---

## 12. `assertAllFieldsPresent` — behavior

The function in `depositAgreementFieldMap.ts`:

1. Iterates every text field name in the text section of the constant map → calls `form.getTextField(name)` to verify it exists.
2. Iterates every checkbox field name → calls `form.getCheckBox(name)` to verify.
3. Throws `Error("PDF template missing AcroForm fields: [...]. Update the template or the field map.")` for any missing field.
4. Does **not** throw for extra fields in the template (pa_sig_* mirrors, optional extras).
5. Called immediately after `PDFDocument.load()`, before any fill calls.

---

## 13. Parked fields — must NOT appear in AcroForm templates

| Field name | Reason absent |
|---|---|
| `ack_florida_venue` | Attorney review required |
| `buyer_date_of_birth` | Not collected |
| `driver_license_number` | Never collected |
| `buyer_access_token` | Bearer-token — never in any PDF or ZIP |
