# Dream Connect Hub — Product & Field Specification

**Project:** Dream Enterprises LLC DBA Dream Puppies / Puppy Heaven
**Repo internal name:** dream-connect-hub
**Status:** Stable spec, post-Wave-A revision (2026-05-05)
**Authoritative for:** product decisions, surface inventory, field map, acknowledgment registry, payment method registry, PDF preconditions

> **Supersessions (May 2026)**
> This document consolidates and supersedes the three discovery artifacts produced on 2026-05-05 in the external `dream-connect-hub/docs/` folder (`discovery-current-state.md`, `field-flow-spec.md`, `reconciliation-summary.md`). Those artifacts remain as historical reference (Wave F2 still consumes the PDF field map from `field-flow-spec.md` Anchor A + B), but going forward this file is the canonical project spec.
>
> Differences vs. the original Cowork-session CLAUDE.md spec:
> - **Deposit amount:** original spec was 1/4 / 1/3 tiered. **Replaced with flat $300 default + per-puppy override** via `puppies.deposit_amount`. See `docs/status-enums.md` and Wave A2 of CLAUDE.md.
> - **Driver's-license collection at deposit time:** removed. Replaced with the existing 18+ acknowledgment (`ack_age_accuracy_at`) plus pickup-day ID verification (last-4 + state + expiration only) in Wave H4.
> - **Slot/placeholder mechanics on `upcoming_litters`:** retired in migration `20260505065200`. Upcoming litters are visibility/marketing only; reservations happen via `/request-deposit` → operator review → `/deposit?requestId=…`.

This spec is paired with [CLAUDE.md](../../CLAUDE.md) (the implementation plan) and [docs/status-enums.md](../status-enums.md) (the canonical status-column source of truth). When this spec and CLAUDE.md disagree, CLAUDE.md wins for *implementation* and this doc wins for *intent*.

---

## Reading order

1. **§1 — Resolved product decisions (21 OPDs)** — what was decided and why. Skim if you already know the project; deep-read if you're picking up a new wave.
2. **§2 — System surfaces (current state)** — what exists today (forms, admin screens, edge functions, schema pointers).
3. **§3 — Anchor A: Payment method registry** — the canonical handles + memo conventions.
4. **§4 — Anchor B: Acknowledgment registry** — every required ack across deposit and (future) purchase agreement.
5. **§5 — Field map (intake + deposit agreement)** — the master cross-reference between web form, DB, and PDF templates.
6. **§6 — Field map (admin/seller-only + purchase agreement)** — fields completed by operator and the purchase-agreement scope (Wave B+).
7. **§7 — PDF generation preconditions** — what must be true before Wave F can ship.
8. **§8 — Implementation pointer** — where the wave plan lives.

---

## §1 — Resolved Product Decisions (21 OPDs)

All 21 open product decisions were resolved by the operator on 2026-05-05. These are canonical and supersede any prior ambiguity in code, schema, or PDF template.

### Business rules

| OPD | Topic | Decision | Status |
|---|---|---|---|
| **OPD-01** | Deposit amount | **Flat $300 default**, with per-puppy override via `puppies.deposit_amount` (set by operator in OperatorReviewForm — Wave C). | ✅ Wave A2 — applied 2026-05-05 |
| **OPD-02** | Phone number | **Required** at both intake (`deposit_requests.customer_phone`) and formal agreement (`deposit_agreements.buyer_phone`). | ⏭ pending (Wave A continuation or Wave B) |
| **OPD-03** | Date of birth | **Omit** at deposit time. Keep the 18+ self-attestation checkbox (`ack_age_accuracy_at` / `ack_dep_6`). | ⏭ PDF-template edit (Wave B); no schema column needed. |
| **OPD-04** | Driver's License # | **Omit** from both deposit and purchase agreements. Pickup-day ID verification captures only last-4 + state + expiration (Wave H4). | ⏭ PDF-template edit; pickup capture in Wave H4 |
| **OPD-05** | Address format | **Split** into `buyer_street` / `buyer_city` / `buyer_state` / `buyer_zip` on `deposit_agreements`. Drop the `buyer_address` blob. ZIP enables sales-tax jurisdiction (OPD-15). | ⏭ Wave E (per CLAUDE.md) |
| **OPD-06** | How-Heard options | Canonical list: `instagram`, `facebook`, `facebook_marketplace`, `tiktok`, `youtube`, `google`, `referral`, `previous_buyer`, `other`. Drop `bing`, `facebook_group`, `website_direct`, `referred_by_buyer` (folded into `referral`), `word_of_mouth` (folded into `referral`). | ⏭ Wave B |
| **OPD-07** | Section 3 questionnaire | **Digital, all 6 questions optional.** New nullable enum columns on `deposit_agreements`: `q_first_dog`, `q_living_situation`, `q_hours_alone`, `q_household_members`, `q_puppy_goal`, `q_training_experience`. | ⏭ Wave B / Wave E |
| **OPD-08** | Pickup preferences | **Full set:** primary date (required) + `pickup_time_preference`, `pickup_day_preference`, `pickup_alt_date`, `pickup_alt_time`, `pickup_alt_day`, `pickup_notes` (all optional). | ⏭ Wave E |
| **OPD-09** | Split payment | **Remove** the `split` method from code and schema. Multi-method scenarios handled manually by admin. | ✅ 2026-05-06 — applied via `20260506000004_drop_split_payment.sql`: drops `deposit_payment_detail` and `final_payment_detail` jsonb columns; rewrites the three CHECK constraints (`deposit_agreements.deposit_payment_method`, `deposit_agreements.final_payment_method_intended`, `final_sales.final_payment_method`) to exclude `'split'`. The discovery doc's reference to `split_payment_method_1/2` columns was incorrect — those columns never existed; the actual schema used `deposit_payment_detail jsonb`. |
| **OPD-10** | Deposit finalization rule | **Keep** code logic (three-condition gate: `buyer_signed_at` + `admin_signed_at` + `deposit_status='admin_confirmed'`). Tighten PDF Section 7 wording only. | ⏭ PDF-template edit |
| **OPD-11** | Deposit link URL | `${SITE_URL}/deposit?requestId=${request_id}` only. Drop the legacy `?litter=…` param — `DepositAgreement.tsx` resolves puppy_id vs litter_id from the request row. | ⏭ Wave B (token-gate `/deposit`) |
| **OPD-12** | Admin-initiated dialog | **Extend** `AdminInitiateDepositDialog.tsx` to support available puppies (currently litter-only). Adds an interest-type toggle matching the buyer-facing intake. | ⏭ Wave B/C |
| **OPD-13** | Seller selection | **Required** in admin dialog, defaults to logged-in user. CLR / YLR dropdown. | ⏭ Wave B/C |
| **OPD-14** | Employee # | **Drop** from PDF Section 8 (Office Use Only). The named-seller field already provides unique identification. | ⏭ PDF-template edit |
| **OPD-15** | Sales tax | **Display estimate** at agreement stage using `buyer_zip`. **Collect at final payment**, not at deposit. Florida: 6.5% Orange County combined; destination-based for NC. | ⏭ Wave B+ (depends on OPD-05) |
| **OPD-16** | Referral name | **Add** "Referred By (name):" line to PDF Section 2. Code's `how_heard_referral_name` field is correct; retain it. | ⏭ PDF-template edit |
| **OPD-17** | PDF generation pipeline | **Defer to Wave F.** Don't begin until (a) all OPD code/schema changes are stable, (b) PDF templates have AcroForm fields aligned to DB columns. | ⏭ Wave F |
| **OPD-18** | Purchase agreement | **Defer to post-Wave G.** Build the deposit workflow (Waves A–G) end-to-end first; purchase agreement becomes its own scoped wave. `final_sales` remains manually populated until then. | ⏭ Post-Wave-G |

### Infrastructure

| OPD | Topic | Decision | Status |
|---|---|---|---|
| **OPD-19** | Admin RLS bug | The `admin_all_deposit_agreements` policy must check `profiles.user_id = auth.uid()`, not `profiles.id`. | ✅ Already fixed — live `pg_policy` query confirms `profiles.user_id` is in use (likely via migration `20260413000000_fix_rls_profiles_user_id.sql`). |
| **OPD-20** | Duplicate RLS policy | Drop `public_insert_deposit_agreements` (plural, permissive). Retain `public_insert_deposit_agreement` (singular, locked initial state). | ✅ Wave A6 — applied 2026-05-05 |
| **OPD-21** | 60-second public read policy | Original decision: keep until Wave D, then replace with token-based SELECT. **Superseded by Wave A6**, which dropped both out-of-migration policies (`public_insert_deposit_agreements` plural and `public_read_recent_deposit_agreements`) at the same time. The deposit submit success path uses writer's-own-row visibility on `INSERT … RETURNING`, which doesn't require the SELECT policy. Token-based SELECT still arrives in Wave D. | ✅ Wave A6 — applied 2026-05-05 |

---

## §2 — System surfaces (current state)

### Buyer-facing routes

| Route | Component | Purpose |
|---|---|---|
| `/request-deposit` | `src/pages/RequestDeposit.tsx` → `src/components/DepositRequestForm.tsx` | Public intake — buyer expresses interest. Writes `deposit_requests` row via the public-insert RLS policy. Not a legal agreement. |
| `/deposit` | `src/pages/DepositAgreement.tsx` → `src/components/deposit/DepositForm.tsx` | Formal legal agreement. **Wave B will gate this on a valid `?requestId=` (operator-issued link only).** Writes `deposit_agreements` via the strict singular `public_insert_deposit_agreement` policy. |
| `/payment/:agreementId/:buyerToken` | *(not yet built — Wave D)* | Buyer payment dashboard with attestation form. Authenticates via `buyer_access_token`. |
| `/agreements/:agreementId/:buyerToken/download` | *(not yet built — Wave F)* | Buyer-tokenized signed-agreement PDF download. |

### Admin-facing routes

| Route | Component | Purpose |
|---|---|---|
| `/admin/deposit-requests` | `src/pages/admin/DepositRequests.tsx` + `DepositRequestDetailPanel.tsx` | Operator triage of intake submissions. Status filter badges, accept/decline actions, "Send Deposit Link" trigger. Wave C replaces the inline accept-flow with a structured `OperatorReviewForm`. |
| `/admin/agreements` | `src/pages/admin/AgreementsPage.tsx` + `AgreementDetailPanel.tsx` | Per-agreement actions: confirm payment, admin-sign, finalize, post-sale (puppy guide / testimonial), danger zone (reject / refund / cancel). Wave A2 removed the deposit-tier column. |
| `/admin/pickup/:agreementId` | *(not yet built — Wave H4)* | Pickup-day handover tablet flow with photo uploads + signature pad. |

### Edge functions

The 16 active edge functions, grouped by purpose:

**Deposit-flow notifications**
- `notify-deposit-request` — admin + buyer email on intake submit
- `notify-puppy-inquiry` — admin + buyer email on puppy-inquiry submit
- `notify-contact-message` — admin + buyer email on generic contact form
- `send-request-decision` — accept/decline buyer email
- `send-deposit-link` — emails the deposit URL to buyer (Wave B will switch to `?requestId=`-only format)
- `send-deposit-receipt` — buyer email after operator confirms payment

**Agreement lifecycle**
- `finalize-agreement` — admin-only; gates on `buyer_signed_at` + `admin_signed_at` + `deposit_status='admin_confirmed'`; transitions `agreement_status` to `admin_approved`. Wave F will trigger PDF generation here.

**Post-sale**
- `send-puppy-guide` — buyer email with care guide HTML (does not yet write `pet_guide_storage_path`)
- `send-testimonial-invite` — buyer email with review CTA
- `generate-training-plan` — admin trigger; emails plan HTML to buyer

**Operations**
- `send-pending-reminders` — hourly cron; flags agreements past reminder thresholds
- `send-newsletter` — admin-triggered marketing send
- *(plus 4 utility / admin-internal functions)*

**To be added by future waves**
- Wave D: `mark-payment-sent`, `submit-payment-attestation`
- Wave F: `generate-agreement-pdf`, `agreement-download-url`
- Wave H: `finalize-pickup-handover`, `generate-dispute-evidence-packet`

### Database schema

The full schema lives in `supabase/migrations/`. The canonical status enum source is [docs/status-enums.md](../status-enums.md). Key tables:

| Table | Purpose | Created in |
|---|---|---|
| `deposit_requests` | Public intake records | `20260414000000` |
| `deposit_agreements` | Legal agreement records | `20260410000000` (workflow), audited via `agreement_audit_log` from `20260411000003` |
| `puppies` | Inventory; `deposit_amount` column added in Wave A2 (`20260506000000`) for per-puppy override. | `supabase-schema.sql` (archived); subsequent ALTERs in migrations |
| `upcoming_litters` | Visibility/marketing only since `20260505065200` (slot/deposit machinery dissolved). | `20250225000000` |
| `payment_methods_config` | Seeded with 6 rows (zelle/venmo/cashapp/apple_pay/square/cash). **Handles are NULL — operator must populate.** See §3. | `20260410000000` |
| `final_sales` | Final-payment + pet-guide tracking. Manually populated in interim per OPD-18. | `20260410000000` |
| `agreement_audit_log` | Per-event audit trail. Service-role write only since `20260422000000`. | `20260411000003` |

### RLS — post-Wave-A6 state

`deposit_agreements` policies (live, verified 2026-05-05):
- `admin_all_deposit_agreements` — ALL — admin via `profiles.user_id = auth.uid() AND role = 'admin'`
- `public_insert_deposit_agreement` (singular) — INSERT — strict locked initial state per `20260422000000`

The two out-of-migration policies (`public_insert_deposit_agreements` plural, `public_read_recent_deposit_agreements`) were dropped in Wave A6.

`agreement_status` CHECK constraint (post-A5): `('sent','admin_approved','complete','cancelled')` — `'buyer_signed'` value retired; `buyer_signed_at` timestamp is the lifecycle marker.

### Email templates

All in `supabase/functions/_shared/email/templates.ts`. ~20 templates covering buyer-facing (deposit lifecycle, post-sale, training plan, newsletter) and admin-facing (new submissions, finalization, pending reminders, manual-review escalation). The deposit-link template's URL format changes in Wave B per OPD-11.

---

## §3 — Anchor A: Payment Method Registry

Source of truth: Deposit Agreement PDF Section 6. The `payment_methods_config` table will replace hard-coded handles when populated; **all 6 seeded rows currently have NULL `handle_or_recipient` values** — operator action required before buyers see correct handles in `PaymentMethodSelector`.

| Method Key | PDF Label | Handle / Contact | Account Type | Memo Required? | Confirmation Flow |
|---|---|---|---|---|---|
| `cashapp` | Cash App | `$LOSPHD` | Personal | ✅ | Manual admin confirm |
| `venmo` | Venmo | `@Dream_Enterprises_LLC` | Business | ✅ | Manual admin confirm |
| `apple_pay` | Apple Pay | `(407) 744-5855` | Personal phone | ✅ | Manual admin confirm |
| `zelle` | Zelle | `(407) 744-5855` or `clebronrivera@icloud.com` | Personal (may show as "Carlos Lebron") | ✅ | Manual admin confirm |
| `cash` | Cash — In Person | Arrange with seller | n/a | n/a | Preferred for safety; encouraged before pickup |
| `square` | Square (Credit/Debit) | Invoice link sent after form processed | Business | n/a | Tax auto-calculated at checkout; invoice sent manually |

**Memo format** (all non-Square): `[Full Legal Name] · [Phone Number] · [Deposit / Final Payment / Full Payment]`

**Wave H7** will add merchant-descriptor / handle-hygiene operator checklist work (e.g., setting Square's merchant descriptor to `DREAMPUPPIES 321-697-8864`). No code change there — checklist + verification only.

---

## §4 — Anchor B: Acknowledgment Registry

### B.1 — Deposit Agreement Acknowledgments (PDF Section 9 / Web `DepositForm.tsx`)

7 required boolean checkboxes; each captures a separate `ack_*_at` timestamp on `deposit_agreements`.

| Stable ID | PDF text (verbatim) | Web Form | DB column |
|---|---|---|---|
| `ack_dep_1` | "I have read and understand this entire Reservation & Deposit Agreement and agree to be bound by all of its terms." | ✅ | `ack_full_agreement_at` |
| `ack_dep_2` | "I understand that this $300 deposit is NON-REFUNDABLE except as expressly stated in the Deposit Terms above." | ✅ | *(non-refundable note in agreement terms; covered by `ack_full_agreement_at`)* |
| `ack_dep_3` | "I understand the pickup policy and will coordinate my pickup date with Dream Puppies as described." | ✅ | *(pickup terms; covered by `ack_full_agreement_at`)* |
| `ack_dep_4` | "I acknowledge that applicable sales tax will be calculated based on the transaction location and payment method, and will be collected at final payment." | ✅ | *(sales tax notice; covered by `ack_full_agreement_at`)* |
| `ack_dep_5` | "I understand my reservation is NOT confirmed until Dream Puppies has verified receipt of the $300 deposit and an authorized seller has countersigned." | ✅ | *(covered by `ack_full_agreement_at`)* |
| `ack_dep_6` | "I confirm I am at least 18 years of age and that all information I have provided is accurate and complete." | ✅ | `ack_age_accuracy_at` |
| `ack_dep_7` | "I understand my electronic or typed signature carries the same legal effect as a handwritten signature and is accepted as binding by both parties." | ✅ | `ack_esign_valid_at` |

The current code captures 7 separate timestamped acks: `ack_full_agreement_at`, `ack_statutory_rights_at`, `ack_esign_valid_at`, `ack_genetic_disclaimer_at`, `ack_arbitration_at`, `ack_age_accuracy_at`, `ack_welfare_responsibility_at`. **Wave E will add additional acks** (per Wave H6 contract clauses): payment authorization, identity attestation, pre-dispute contact, pickup acceptance, Florida venue.

The **arbitration typed phrase** (`arbitration_typed_phrase` / `arbitration_typed_at`) is captured in addition to the checkbox — required exact match to "I understand and agree to arbitration."

### B.2 — Purchase Agreement Acknowledgments (PDF Article IX) — Wave B scope

7 acks, none currently in web form or schema. All new columns added when the purchase agreement digital form is built.

| Stable ID | PDF text (verbatim) | Statutory link | Required level |
|---|---|---|---|
| `ack_pur_1` | "I have read and understand the full terms of this Agreement and agree to be bound by them." | — | Required |
| `ack_pur_2` | "I have reviewed my statutory rights regarding this pet purchase." | Fla. Stat. § 828.29 | Review |
| `ack_pur_3` | "I understand electronic signatures have the same legal force as handwritten signatures." | — | Review |
| `ack_pur_4` | "I acknowledge that canine genetic outcomes cannot be guaranteed per peer-reviewed science." | Axelsson et al. (2022) | Review |
| `ack_pur_5` | "I understand arbitration is required. I AM WAIVING MY RIGHT TO A JURY TRIAL AND CLASS ACTION." | Fla. Stat. Ch. 682 | Required (typed phrase reused from deposit) |
| `ack_pur_6` | "I confirm I am at least 18 years of age and that all information I have provided is accurate." | — | Required |
| `ack_pur_7` | "I accept full responsibility for the Puppy's actions and welfare after the Transfer Date." | — | Required |

---

## §5 — Field map: Intake form + Formal deposit agreement

### Part 1 — Intake form (`/request-deposit`)

`DepositRequestForm.tsx` → `deposit_requests`.

| # | Section | Label | Type | Required | DB column | DB type | In PDF? | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Interest | Interest type toggle (puppy / litter) | Radio | Y | drives puppy_id or litter_id | — | — | Web-only routing |
| 2 | Interest | Select Puppy | Dropdown | Cond. | `puppy_id` | uuid | — | When interest=puppy |
| 3 | Interest | Select Litter | Dropdown | Cond. | `upcoming_litter_id` | uuid | — | When interest=litter |
| 4 | Interest | Litter slot | Dropdown | N | *(slots dissolved)* | — | — | Field obsolete after `20260505065200` |
| 5 | Buyer info | Full Name | Text | Y | `customer_name` | text NOT NULL | ✅ Sec 1 | — |
| 6 | Buyer info | Email | Email | Y | `customer_email` | text NOT NULL | ✅ Sec 1 | — |
| 7 | Buyer info | City | Text | Y | `city` | text | ✅ Sec 1 | — |
| 8 | Buyer info | State | Dropdown | Y | `state` | text | ✅ Sec 1 | US states list |
| 9 | Buyer info | Phone | Tel | **Y after OPD-02** | `customer_phone` | text | ✅ Sec 1 | Currently optional in code; OPD-02 makes it required |
| 10 | Discovery | How did you hear? | Dropdown | N | `how_heard` | text | ✅ Sec 2 | OPD-06: list to be replaced |
| 11 | Discovery | Who referred you? | Text | Cond. | `how_heard_referral_name` | text | ⏭ Add to PDF (OPD-16) | Shown if `how_heard='referral'` |
| 12 | Pref | Preferred payment method | Dropdown | N | `preferred_payment_method` | text | ✅ Sec 6 | Re-confirmed at agreement stage |
| 13 | Pref | Preferred pickup date | Date | N | `proposed_pickup_date` | date | ✅ Sec 5 | Re-confirmed at agreement stage |
| 14 | Admin | Spoke with | Dropdown | N | `spoke_with` | text | — | Internal tracking |

**OPD-07 questionnaire** (Q1–Q6, all optional) is added as new columns on `deposit_agreements` in Wave E, not on `deposit_requests`.

### Part 2 — Formal deposit agreement (`/deposit`)

`DepositForm.tsx` → `deposit_agreements`. Single scrolling form (no multi-step wizard).

| # | Section | Label | Type | Required | DB column | DB type | In PDF? | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Buyer | Full Legal Name | Text | Y (min 2) | `buyer_name` | text NOT NULL | ✅ Sec 1 | "as on government-issued ID" |
| 2 | Buyer | Email | Email | Y | `buyer_email` | text NOT NULL | ✅ Sec 1 | — |
| 3 | Buyer | Phone | Tel | **Y after OPD-02** | `buyer_phone` | text | ✅ Sec 1 | Currently optional |
| 4a | Buyer | Street | Text | Y after OPD-05 | `buyer_street` (Wave E) | text | ✅ Sec 1 | New column |
| 4b | Buyer | City | Text | Y | `buyer_city` (Wave E) | text | ✅ Sec 1 | New column |
| 4c | Buyer | State | Dropdown | Y | `buyer_state` (Wave E) | text | ✅ Sec 1 | New column |
| 4d | Buyer | ZIP | Text | Y | `buyer_zip` (Wave E) | text | ✅ Sec 1 | Drives sales-tax jurisdiction (OPD-15) |
| 5 | Pickup | Primary pickup date | Date | Y | `proposed_pickup_date` | date NOT NULL | ✅ Sec 5 | Min = puppy DOB + 56 days |
| 6 | Pickup | Time preference | Enum | N (Wave E) | `pickup_time_preference` | text (morning/afternoon/evening) | ✅ Sec 5 | OPD-08 |
| 7 | Pickup | Day preference | Enum | N (Wave E) | `pickup_day_preference` | text (weekday/weekend/either) | ✅ Sec 5 | OPD-08 |
| 8 | Pickup | Alt date | Date | N (Wave E) | `pickup_alt_date` | date | ✅ Sec 5 | OPD-08 |
| 9 | Pickup | Alt time | Enum | N (Wave E) | `pickup_alt_time` | text | ✅ Sec 5 | OPD-08 |
| 10 | Pickup | Alt day | Enum | N (Wave E) | `pickup_alt_day` | text | ✅ Sec 5 | OPD-08 |
| 11 | Pickup | Notes | Text | N (Wave E) | `pickup_notes` | text | ✅ Sec 5 | OPD-08 |
| 12 | Payment | Deposit method | Radio (6 methods, no `split` after OPD-09) | Y | `deposit_payment_method` | text NOT NULL | ✅ Sec 6 | Anchor A handles |
| 13 | Payment | Final method (intended) | Dropdown | N | `final_payment_method_intended` | text | — | Code-only |
| 14 | Acks | 7 checkboxes (Anchor B.1) | Checkbox | Y all 7 | `ack_*_at` | timestamptz | ✅ Sec 9 | Each captures a distinct timestamp |
| 14a-e | Acks (Wave E) | Payment auth, identity, pre-dispute, pickup acceptance, FL venue | Checkbox | Y | `ack_payment_authorization_at` etc. | timestamptz | ⏭ PDF update | Per Wave E3 / Wave H6 |
| 15 | Sig | Arbitration phrase | Text (exact match) | Y | `arbitration_typed_phrase`, `arbitration_typed_at` | text + timestamptz | ✅ implied | "I understand and agree to arbitration" |
| 16 | Sig | Buyer signature (typed) | Text (Dancing Script render) | Y (min 2) | `buyer_signature_text` | text | ✅ Sec 10 | No draw canvas; typed only |
| 17 | Sig | Date signed | Auto | — | `buyer_signed_at` | timestamptz | ✅ Sec 10 | Set at submit |

**Deposit amount display:** `resolveDepositAmount({ puppyOverride: puppy?.deposit_amount })` in [src/lib/utils/depositCalc.ts](../../src/lib/utils/depositCalc.ts). Returns `puppyOverride ?? DEFAULT_DEPOSIT_AMOUNT` (= 300).

---

## §6 — Field map: Admin/seller-only + Purchase agreement (Wave B+)

### Part 3 — Admin/seller fields completed in PDF

| # | PDF section | Field | DB column / source | Status |
|---|---|---|---|---|
| 1 | Sec 4 | Puppy name / litter | `puppies.name` + `upcoming_litters.id` | ✅ |
| 2 | Sec 4 | Breed & color | `puppies.breed` + `puppies.color` | ✅ |
| 3 | Sec 4 | Sex (M/F) | `puppies.sex` | ✅ |
| 4 | Sec 4 | DOB (approx) | `puppies.date_of_birth` or `upcoming_litters.expected_whelping_date` | ✅ |
| 5 | Sec 7A | Dam | — | ❌ no column on `deposit_agreements` |
| 6 | Sec 7A | Sire | — | ❌ |
| 7 | Sec 7A | Special markings | — | ❌ |
| 8 | Sec 7A | Full purchase price | `deposit_agreements.purchase_price` | ✅ |
| 9 | Sec 7A | Deposit amount ($300) | `deposit_agreements.deposit_amount` | ✅ post-A2 |
| 10 | Sec 8 | Agreement # | `deposit_agreements.agreement_number` (DP-YYYY-XXXX) | ✅ auto-generated |
| 11 | Sec 8 | Agreement date | `deposit_agreements.created_at` | ✅ |
| 12 | Sec 8 | Authorized seller | `deposit_agreements.authorized_seller` | ✅ enum: carlos_lebron_rivera / yolanda_lebron_rivera |
| 13 | Sec 8 | Employee # | — | ✅ to be removed (OPD-14) |
| 14 | Sec 10 | Admin signature (canvas) | `deposit_agreements.admin_signature_svg` + `admin_signed_at` | ✅ |

### Part 4 — Purchase agreement incremental fields (Wave B / post-G)

| # | Article | Field | DB column | Status |
|---|---|---|---|---|
| 1 | Art X | DOB | — | OPD-03: omitted |
| 2 | Art X | DL # | — | OPD-04: omitted |
| 3 | Art X | Structured address | `buyer_street` / `buyer_city` / `buyer_state` / `buyer_zip` | OPD-05: Wave E |
| 4 | Art IX | `ack_pur_1`–`ack_pur_7` | 7 new columns | Wave B |
| 5 | Art VIII | CVI certificate # | — | Wave B (Fla. Stat. § 828.29) |
| 6 | Header | Microchip # | — | Wave B |
| 7 | Header | Vaccinations (rounds) | — | Wave B |
| 8 | Header | Age at transfer | computed | ✅ from DOB |
| 9 | Header | Approx weight | — | Wave B |
| 10 | Header | Balance due | computed: `purchase_price - deposit_amount` | ✅ |

---

## §7 — PDF generation preconditions (Wave F)

The `signed_pdf_storage_path` column on `deposit_agreements` exists but is never written today. PDF generation is **not implemented** — no `pdf-lib`/`pdfkit`/equivalent dependency, no template files, no edge function. Wave F adds this pipeline.

Before Wave F begins, three preconditions:

**P1: PDF templates in final form.** DOB removed (OPD-03), DL# removed (OPD-04), How-Heard list updated (OPD-06), structured address layout (OPD-05), referral name field added (OPD-16), Employee # removed from Sec 8 (OPD-14), Sec 7 wording tightened (OPD-10). Templates must have **AcroForm named fields** aligned to the DB columns in §5 + §6.

**P2: PDF generation strategy.** Plan defaults to `pdf-lib` (form-fill via AcroForm) — fast, precise, requires template fields. Alternative: `puppeteer` (HTML → PDF) — no template changes but larger files and more styling complexity. Wave F is built around `pdf-lib`.

**P3: Storage bucket policy.** Signed PDFs contain PII (name, address). Bucket has no public read; admin-only direct read; buyer access via short-lived (1 hr) signed URLs minted by the `agreement-download-url` edge function (Wave F6). Buyer-facing route: `/agreements/:agreementId/:buyerToken/download`.

**Do not begin Wave F until Waves A, B, and E are stable and the two PDF templates are finalized.** Building against an unstable data model means rebuilding after every wave.

---

## §8 — Implementation pointer

The wave-by-wave implementation plan lives at [CLAUDE.md](../../CLAUDE.md). It defines eight sequential waves (A–H) covering audit/cleanup, token-gating, operator review form, buyer payment dashboard, schema completeness, PDF generation, tests/docs, and chargeback-defense / pickup handover.

**Wave status (post 2026-05-06):** A1–A6 done, H1–H8 done. A7+A8, B–G pending. Refer to CLAUDE.md for the live wave checklist.

**H5 auto-log coverage note (2026-05-06):** The `agreement_communications` auto-log in `_shared/email/send.ts` was propagated to 7 edge functions. Two functions (`send-deposit-link`, `notify-deposit-request`) intentionally omit logging — no `agreement_id` exists at the time they fire. Of the 7 logged functions, `mark-payment-sent` was end-to-end smoke-tested; the remaining 6 were code-reviewed for correct `agreementId` sourcing. Full smoke-test coverage will close naturally as admin flows are exercised in production.

---

*End of spec — `docs/spec/dream-connect-hub.md`*
