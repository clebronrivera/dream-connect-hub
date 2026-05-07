# PDF AcroForm field disambiguation — Wave F

**Produced by:** Wave F0 inspection (2026-05-06)  
**Companion to:** `docs/spec/pdf-acroform-fields.md`  
**Status:** Design decisions locked for F1–F4. Do not change without updating both documents and the `depositAgreementFieldMap.ts` module.

This document resolves every naming ambiguity, widget-type decision, and "what maps to what" question that `pdf-acroform-fields.md` leaves implicit.

---

## 1. Puppy DOB vs Buyer DOB

### Decision

| Field name | PDF template | DB source | Rationale |
|---|---|---|---|
| `puppy_date_of_birth` | ✅ Include | `deposit_agreements.puppy_dob` | Required for health certificate chain-of-custody |
| *(no buyer DOB field)* | ❌ Omit entirely | Not collected | Per Wave E decision — buyer DOB is never stored in `deposit_agreements`. If the physical PDF layout has a "Date of birth" label for the buyer, leave that field blank or remove it from the template before F1 copies it. Do **not** create a `buyer_date_of_birth` AcroForm field. |

### Format
`puppy_date_of_birth` → `MMM d, yyyy` (e.g. `Feb 3, 2026`). Nullable — if `puppy_dob` is NULL in the DB, write an empty string, not "N/A" or "Unknown".

---

## 2. Signature mirror rule

### Problem
The Deposit Agreement is 7 pages. The signature block may appear more than once (e.g. at the end of the terms section AND at the end of the document). PDF AcroForm fields are global — two fields with the same name are normally linked (one fill populates both). However, `pdf-lib` fills fields by name and does not guarantee link behavior across all PDF readers.

### Decision

**Use distinct names for every signature appearance.** Do not rely on linked-name behavior.

| Appearance | AcroForm field name | DB source | Stored separately? |
|---|---|---|---|
| Primary (first occurrence) | `buyer_signature_text` | `deposit_agreements.buyer_signature_text` | Yes — canonical column |
| Mirror (second occurrence, if any) | `buyer_signature_text_2` | Same as `buyer_signature_text` | **No** — `generate-agreement-pdf` fills it from the same value; no second DB column |
| If a third appearance exists | `buyer_signature_text_3` | Same source | No |

The same rule applies to `buyer_signature_date` if it appears more than once: `buyer_signature_date_2`, etc.

**Implementation note:** `depositAgreementFieldMap.ts` exports the primary field name. The edge function fills the mirror names by convention (`primaryName + '_2'`) after filling all canonical fields. The `assertAllFieldsPresent` check only validates that all primary names exist in the template; mirror names are optional and silently skipped if absent.

---

## 3. Payment method — text field, not radio group

### Problem
The deposit agreement has a "Payment Method" field. PDF radio groups are common for this but introduce complexity: they require one `PDFRadioGroup` widget per choice, choice values must match exactly, and adding a new payment method requires a PDF edit.

### Decision

`payment_method` is a **plain text field** in the AcroForm template. `generate-agreement-pdf` writes the human-readable label string.

| `deposit_payment_method` value (DB) | Text written to PDF |
|---|---|
| `zelle` | `Zelle` |
| `venmo` | `Venmo` |
| `cashapp` | `Cash App` |
| `apple_pay` | `Apple Pay` |
| `square` | `Square` |
| `cash` | `Cash` |

The mapping lives in `depositAgreementFieldMap.ts` as a `PAYMENT_METHOD_LABELS` constant (matching `PAYMENT_METHODS` from `src/lib/constants/deposit.ts` but with display strings). The edge function looks up the label before filling; if the value is not in the map it falls back to the raw DB string so a future method doesn't silently blank the field.

---

## 4. Authorized seller — text field, not radio group

### Problem
Two authorized sellers exist (`carlos_lebron_rivera`, `yolanda_lebron_rivera`). The agreement block has both a name field and an initials field.

### Decision

Both are **plain text fields**:

| AcroForm field name | Content | Example |
|---|---|---|
| `authorized_seller_name` | Full display name from `AUTHORIZED_SELLERS` | `Carlos Lebron Rivera` |
| `authorized_seller_initials` | Initials from `AUTHORIZED_SELLERS` | `CLR` |

`AUTHORIZED_SELLERS` (from `src/lib/constants/business.ts`) is the single source of truth. The edge function performs the lookup by the `deposit_agreements.authorized_seller` id string. If the id is not found in `AUTHORIZED_SELLERS`, the edge function throws (fail loudly — a missing seller is a data integrity error, not a "blank and continue" case).

**For the Purchase Agreement,** the corresponding fields use the `authorized_representative_*` names:

| AcroForm field name | Content |
|---|---|
| `authorized_representative_name` | Same lookup as `authorized_seller_name` |
| `authorized_representative_title` | Static string: `"Authorized Representative, Dream Enterprises LLC"` |

---

## 5. Acknowledgment fields — timestamps, not live checkboxes

### Problem
The buyer already checked each acknowledgment in the web form (with a server-recorded timestamp per checkbox). Rendering them as live PDF checkboxes creates ambiguity about whether the PDF checkbox state is authoritative.

### Decision

Every `ack_*` field in both PDFs is a **read-only text field** showing the formatted timestamp when the buyer ticked that box online. The PDF is a printed record; it does not accept new checkbox input.

| Displayed value pattern | Example |
|---|---|
| `Acknowledged: May 5, 2026 at 10:32 PM` | Full datetime string |

If the `ack_*_at` column is NULL in the DB (field was not present in the form version the buyer signed), write `—` (em dash) to indicate "not applicable for this agreement version."

**Format function** (used in `depositAgreementFieldMap.ts`):
```ts
function fmtAck(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return `Acknowledged: ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
```

---

## 6. Balance due — computed, never stored

`balance_due` is filled by the edge function as:

```ts
const balanceDue = purchasePrice - depositAmount;
form.getTextField("balance_due").setText(
  `$${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
);
```

`purchase_price` and `deposit_amount` are read from `deposit_agreements` (already stored as numbers). `balance_due` is **never** written back to the DB — this is intentional to avoid the DB going out of sync if either source column is ever corrected.

---

## 7. Combined address field (Purchase Agreement only)

The Purchase Agreement has `buyer_city_state_zip` as a combined text field. The Deposit Agreement has split `buyer_city`, `buyer_state`, `buyer_zip` fields.

### Decision
Match whatever the physical PDF layout uses. The canonical spec says:

- **Deposit Agreement template:** three split fields (`buyer_city`, `buyer_state`, `buyer_zip`)  
- **Purchase Agreement template:** one combined field (`buyer_city_state_zip`)

`depositAgreementFieldMap.ts` handles the combined form:

```ts
// Purchase Agreement only
"buyer_city_state_zip": `${row.buyer_city}, ${row.buyer_state} ${row.buyer_zip}`.trim(),
```

If the physical Purchase Agreement PDF turns out to use split fields instead, the constant entry changes to three entries. The `assertAllFieldsPresent` guard will surface the mismatch at test time.

---

## 8. Parked fields — must NOT appear in AcroForm templates

The following must be absent from both PDF templates. If Adobe Acrobat / the form creator adds them by mistake, `assertAllFieldsPresent` will not catch them (it only checks for missing fields, not extra ones). Add a second guard `assertNoForbiddenFields` in `depositAgreementFieldMap.ts` if audit risk is high.

| Field name | Reason absent |
|---|---|
| `ack_florida_venue` | Parked — attorney review required before production deploy |
| `buyer_date_of_birth` | Not collected at deposit time (Wave E decision) |
| `driver_license_number` | Never collected anywhere in the system |
| `buyer_access_token` | Bearer-token semantics — must never appear in any PDF or ZIP |
| `employee_number` / `staff_id` | Not in scope; operator initials captured in pickup handover only (H4) |
| `q_hours_alone`, `q_puppy_goal`, `q_training_experience` | Questionnaire data stored in DB; not rendered in the agreement PDF |
| `how_heard`, `how_heard_referral_name`, `how_heard_other_text` | Stored in DB; not rendered in the agreement PDF |
| `pickup_time_preference`, `pickup_day_preference`, `pickup_notes` | Stored in DB; not rendered |

---

## 9. Date formatting — canonical pattern

All date-only fields use `MMM d, yyyy` (no leading zero on day):

| Value | Formatted |
|---|---|
| `2026-02-03` | `Feb 3, 2026` |
| `2026-12-25` | `Dec 25, 2026` |

Timestamp fields (ack records, signed_at) use the `fmtAck` pattern from §5 above.

All formatting runs in the edge function using the `Intl` API. Do not format in the client before sending to the edge function — the raw DB values travel to the function and formatting happens there.

---

## 10. `assertAllFieldsPresent` — behavior specification

The function in `depositAgreementFieldMap.ts` must:

1. Call `form.getFields()` on the loaded template.
2. Build a `Set<string>` of template field names.
3. Check every value in `DEPOSIT_AGREEMENT_FIELD_MAP` (the canonical names).
4. Throw `Error("PDF template missing AcroForm fields: [list]. Update the template or the field map.")` if any are missing.
5. **Not** throw if extra fields exist in the template (mirror fields `_2`, `_3`, etc. are optional extras).
6. Be called immediately after `PDFDocument.load()` and before any `setText` calls. A throw here surfaces at deploy-smoke time, not silently at buyer-facing PDF generation.

Mirror fields (`buyer_signature_text_2`, etc.) are filled opportunistically:

```ts
// After canonical fill loop:
for (const [key, value] of Object.entries(filledValues)) {
  let n = 2;
  while (true) {
    const mirrorName = `${key}_${n}`;
    try {
      form.getTextField(mirrorName).setText(value);
      n++;
    } catch {
      break; // field doesn't exist — stop
    }
  }
}
```

---

## 11. Field type summary

Every field in both PDFs is a **Text** field. There are no:
- Radio groups
- Checkboxes
- Signature widgets (digital signature — the typed name is a text field)
- Combo boxes / dropdowns

This simplifies `pdf-lib` usage: only `form.getTextField(name).setText(value)` and `form.flatten()` are needed. No `PDFRadioGroup`, `PDFCheckBox`, or `PDFDropdown` handling required.
