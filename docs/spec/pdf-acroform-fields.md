# PDF AcroForm field inventory — Wave F

**Produced by:** Wave F0 inspection (2026-05-06)  
**Status:** Field names are DESIGNED — the physical PDFs are currently flat (no AcroForm fields). These names are the canonical spec for whoever adds the fields to the PDFs before F1 copies them into `supabase/functions/_shared/pdf/templates/`.

---

## P3 finding — template blankness confirmed

Both available template files were inspected with `pypdf` and the PDF Tools MCP:

| File | Pages | Form fields | Buyer data |
|---|---|---|---|
| `DreamLitter_PuppyPurchaseAgreement.pdf` | 7 | **0** | None |
| `TEMPLATE_PuppyPurchaseAgreement_DreamPuppies.pdf` | 4 | **0** | None |
| `PLANTILLA_Contrato_Compraventa_DreamPuppies.pdf` | — | **0** | None |

**P3 is clear** — no real buyer data, no AcroForm fields to conflict with. Templates can be copied to `supabase/functions/_shared/pdf/templates/` as soon as AcroForm fields are added (F1 precondition).

The versioned filenames referenced in the plan (`DreamPuppies_DepositAgreement_v6_form.pdf`, `DreamPuppies_PurchaseAgreement_v3_form.pdf`) do not exist on disk. Those names should be used for the AcroForm-enabled versions once created.

---

## PDF 1 — Deposit Agreement (`deposit_agreement_template.pdf`)

This PDF is generated at agreement completion (`agreement_status = 'complete'`). Field names below are the AcroForm `T` (name) values that must exist in the PDF template.

### Section 1 — Agreement header

| AcroForm field name | Type | DB source | Notes |
|---|---|---|---|
| `agreement_number` | Text | `deposit_agreements.agreement_number` | e.g. `DP-ABC12345` |
| `buyer_signed_date` | Text | `deposit_agreements.buyer_signed_at` | Formatted `MMM d, yyyy` |
| `admin_signed_date` | Text | `deposit_agreements.admin_approved_at` | Formatted `MMM d, yyyy` |

### Section 2 — Buyer identity

| AcroForm field name | Type | DB source | Notes |
|---|---|---|---|
| `buyer_name` | Text | `deposit_agreements.buyer_name` | Full legal name |
| `buyer_email` | Text | `deposit_agreements.buyer_email` | |
| `buyer_phone` | Text | `deposit_agreements.buyer_phone` | |
| `buyer_street` | Text | `deposit_agreements.buyer_street` | |
| `buyer_city` | Text | `deposit_agreements.buyer_city` | |
| `buyer_state` | Text | `deposit_agreements.buyer_state` | |
| `buyer_zip` | Text | `deposit_agreements.buyer_zip` | |

### Section 3 — Puppy / transaction

| AcroForm field name | Type | DB source | Notes |
|---|---|---|---|
| `puppy_name` | Text | `deposit_agreements.puppy_name` | |
| `breed` | Text | `deposit_agreements.breed` | |
| `puppy_date_of_birth` | Text | `deposit_agreements.puppy_dob` | Formatted `MMM d, yyyy`; nullable |
| `purchase_price` | Text | `deposit_agreements.purchase_price` | Formatted `$X,XXX.00` |
| `deposit_amount` | Text | `deposit_agreements.deposit_amount` | Formatted `$XXX.00` |
| `balance_due` | Text | **Computed** | `purchase_price - deposit_amount`, never stored |
| `payment_method` | Text | `deposit_agreements.deposit_payment_method` | Human label (e.g. "Zelle") not key |
| `payment_memo` | Text | `deposit_agreements.payment_memo` | Generated memo string |
| `proposed_pickup_date` | Text | `deposit_agreements.proposed_pickup_date` | Formatted `MMM d, yyyy` |
| `pickup_deadline` | Text | `deposit_agreements.pickup_deadline` | Formatted `MMM d, yyyy` |

### Section 4 — Seller / operator

| AcroForm field name | Type | DB source | Notes |
|---|---|---|---|
| `authorized_seller_name` | Text | **Derived** | Look up display name from `AUTHORIZED_SELLERS` by `authorized_seller` id |
| `authorized_seller_initials` | Text | **Derived** | Look up initials from `AUTHORIZED_SELLERS` by `authorized_seller` id |

### Section 5 — Acknowledgment timestamps

Each `ack_*_at` column maps to a read-only text field showing the formatted timestamp (not a live checkbox in the final PDF — the buyer already checked them in the web form; the PDF just records when).

| AcroForm field name | DB source |
|---|---|
| `ack_full_agreement` | `ack_full_agreement_at` |
| `ack_statutory_rights` | `ack_statutory_rights_at` |
| `ack_esign_valid` | `ack_esign_valid_at` |
| `ack_genetic_disclaimer` | `ack_genetic_disclaimer_at` |
| `ack_arbitration` | `ack_arbitration_at` |
| `ack_age_attestation` | `ack_age_attestation_at` |
| `ack_welfare_responsibility` | `ack_welfare_responsibility_at` |
| `ack_payment_authorization` | `ack_payment_authorization_at` |
| `ack_identity_attestation` | `ack_identity_attestation_at` |
| `ack_pre_dispute_contact` | `ack_pre_dispute_contact_at` |
| `ack_pickup_acceptance` | `ack_pickup_acceptance_at` |

> `ack_florida_venue_at` — **PARKED**. Column exists in DB; checkbox exists in form code. Field will be added to PDF only after attorney review clears it for production. Do not add `ack_florida_venue` to the AcroForm template until that review is complete.

### Section 6 — Buyer signature block

| AcroForm field name | Type | DB source | Notes |
|---|---|---|---|
| `buyer_signature_text` | Text | `deposit_agreements.buyer_signature_text` | Typed-name e-signature |
| `buyer_signature_date` | Text | `deposit_agreements.buyer_signed_at` | Same as `buyer_signed_date` above |

**Mirror rule:** If the PDF has a second signature appearance (e.g. at a page break), name it `buyer_signature_text_2`. `generate-agreement-pdf` fills it from the same source value as `buyer_signature_text`. Do not store it separately in the DB.

---

## PDF 2 — Purchase Agreement (`purchase_agreement_template.pdf`)

Generated at final handover / future Wave expansion. The 7-page `DreamLitter_PuppyPurchaseAgreement.pdf` is the source document.

### Puppy information block

| AcroForm field name | Type | Source | Notes |
|---|---|---|---|
| `puppy_name` | Text | Puppy name / litter ID from agreement | |
| `breed_color_description` | Text | Breed + color description | Free-form combined field |
| `puppy_date_of_birth` | Text | Puppy DOB | Formatted `MMM d, yyyy` |
| `purchase_price` | Text | Purchase price | Formatted `$X,XXX.00` |
| `puppy_sex` | Text | Sex (`Male` / `Female`) | |
| `microchip_tag_number` | Text | Microchip / tag number | Nullable |

### Buyer information block

| AcroForm field name | Type | Source | Notes |
|---|---|---|---|
| `buyer_full_legal_name` | Text | Buyer name | |
| `buyer_street_address` | Text | Street address | |
| `buyer_city_state_zip` | Text | City + state + ZIP (combined) | Or split into three fields — match whatever the PDF layout uses |
| `buyer_email_address` | Text | Buyer email | |
| `buyer_phone_number` | Text | Buyer phone | |

> **buyer_date_of_birth — PARKED.** The document's signature block has a "Date of birth" field for the buyer. Per Wave E decision, buyer DOB is NOT collected at deposit time and NOT stored in `deposit_agreements`. Do not add `buyer_date_of_birth` to the AcroForm or the field map. If this field is in the PDF layout, leave it blank or remove it from the template.

### Electronic signature block

| AcroForm field name | Type | Source | Notes |
|---|---|---|---|
| `buyer_signature_text` | Text | Typed-name e-signature | |
| `buyer_signature_date` | Text | Signature timestamp | |

### Seller / breeder block

| AcroForm field name | Type | Source | Notes |
|---|---|---|---|
| `authorized_representative_name` | Text | From `AUTHORIZED_SELLERS` | |
| `authorized_representative_title` | Text | Static: `"Authorized Representative, Dream Enterprises LLC"` | |
| `seller_signature_date` | Text | Admin approval timestamp | |

### Acknowledgments (Article IX)

Seven acknowledgments — same pattern as the deposit agreement: read-only text fields showing the ack timestamp, not live checkboxes.

| AcroForm field name | Maps to |
|---|---|
| `ack_full_agreement` | buyer confirmation of full terms |
| `ack_statutory_rights` | Fla. Stat. § 828.29 review |
| `ack_esign_valid` | Fla. Stat. Ch. 668 review |
| `ack_genetic_disclaimer` | Genetic variability disclaimer |
| `ack_arbitration` | Arbitration waiver |
| `ack_age_attestation` | 18+ confirmation |
| `ack_welfare_responsibility` | Post-transfer responsibility |

---

## Computed fields (never stored in DB)

| Field name | Formula |
|---|---|
| `balance_due` | `purchase_price − deposit_amount` |
| `authorized_seller_name` | Lookup `AUTHORIZED_SELLERS` by `authorized_seller` id |
| `authorized_seller_initials` | Lookup `AUTHORIZED_SELLERS` by `authorized_seller` id |
| `authorized_representative_title` | Static string |
| Any `_2` mirror field | Copy of its primary counterpart |

---

## Gaps / not-in-template

| Item | Decision |
|---|---|
| `ack_florida_venue_at` | Column + checkbox exist in code; **not in PDF** until attorney signs off |
| `buyer_date_of_birth` (buyer) | Not collected. Leave blank or remove field from purchase agreement PDF |
| Driver's license number | Never collected anywhere in the system |
| Employee `#` / staff ID | Not in scope; operator initials captured in pickup handover only (H4) |
| `q_hours_alone`, `q_puppy_goal`, `q_training_experience` | Questionnaire data — stored in DB, not rendered in the agreement PDF |
| `how_heard*` | Stored in DB, not rendered in the agreement PDF |
| `pickup_time_preference`, `pickup_day_preference`, `pickup_notes` | Stored in DB, not rendered in the agreement PDF |
| `buyer_access_token` | **Never** written to any PDF or ZIP — bearer-token semantics preserved |
