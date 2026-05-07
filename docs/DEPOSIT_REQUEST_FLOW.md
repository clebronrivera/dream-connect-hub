# Deposit Request Flow — Canonical Reference (Post-Wave G)

> **Last updated:** May 2026 (Waves A–G complete).
>
> This document is the definitive description of the 13-step reservation
> workflow as implemented. Earlier versions described only the request bridge;
> this rewrite covers the full lifecycle through pickup-day handover.
>
> See also:
> - `docs/status-enums.md` — allowed values for every status column
> - `docs/spec/dream-connect-hub.md` — architectural spec with supersession notes
> - `docs/ops/reservation-flow-smoke-test.md` — browser-based verification checklist

---

## Overview

The workflow spans 13 observable steps across four parties: the **buyer**, the
**operator** (admin), the **system** (edge functions + DB), and the **payment
app** (Zelle/Venmo/CashApp/Square out-of-band).

```
Step 1   Buyer submits intake request (request-deposit form)
Step 2   Admin is notified; buyer gets an acknowledgment email
Step 3   Admin reviews request, fills in Operator Review Form
Step 4   Admin sends deposit link; buyer gets email with token-gated URL
Step 5   Buyer fills deposit agreement form (token-gated /deposit?requestId=…)
Step 6   Buyer auto-redirected to Payment Dashboard (/payment/<id>/<token>)
Step 7   Buyer completes H1 payment attestation + handle screenshot upload
Step 8   Buyer pays out-of-band, uploads confirmation screenshot + tx ref
Step 9   Buyer clicks "I have sent payment" → admin notification
Step 10  Admin confirms payment received (operator-verified sender handle)
Step 11  Admin applies signature → Finalize Agreement → PDF generated
Step 12  Buyer receives email with tokenized PDF download link
Step 13  Pickup day: operator runs handover flow (Wave H4)
```

---

## Step-by-step detail

### Step 1 — Buyer submits intake request

**Entry point:** `/request-deposit`
**Component:** `src/pages/RequestDeposit.tsx` + `src/components/DepositRequestForm.tsx`
**DB write:** `deposit_requests` INSERT (`request_status = 'pending'`, `origin = 'public_form'`)
**RLS:** Public INSERT locked to `request_status='pending'`, all admin fields NULL

The form collects: name, email, phone (required; E.164-normalized by DB trigger),
city, state, which litter/puppy, how they heard about us, notes.

---

### Step 2 — Admin notified; buyer receives acknowledgment

**Edge function:** `notify-deposit-request` (DB webhook on INSERT, `verify_jwt: false`)
- Admin email: HTML summary with deep link to `/admin/deposit-requests`
- Buyer email: acknowledgment with 24–48hr timeline messaging

---

### Step 3 — Admin reviews and fills Operator Review Form

**Page:** `/admin/deposit-requests`
**Component:** `src/components/admin/DepositRequestDetailPanel.tsx`
           + `src/components/admin/OperatorReviewForm.tsx` (Wave C)

The Operator Review Form fields:
- `puppy_id` — select or create the puppy being reserved
- `purchase_price` — required; persisted to `puppies.base_price`
- `deposit_amount` — defaults to `$300` (`DEFAULT_DEPOSIT_AMOUNT`); editable per-puppy override
- `confirmed_pickup_date` — optional override
- `notes_to_buyer` — optional

On submit: `deposit_requests.request_status` → `accepted`.
"Send Deposit Link" button then fires `send-deposit-link`.

---

### Step 4 — Admin sends deposit link

**Edge function:** `send-deposit-link`
**URL format:** `https://puppyheavenllc.com/deposit?requestId={uuid}`
**DB write:** `deposit_requests.request_status` → `deposit_link_sent`

The request UUID provides 122 bits of entropy and is valid until the buyer
submits the form (no expiration on the link itself — the agreement created by
submission gets its own `buyer_access_token` with a 30-day expiry).

---

### Step 5 — Buyer fills deposit agreement form

**Entry point:** `/deposit?requestId={uuid}`
**Component:** `src/pages/DepositAgreement.tsx` + `src/components/deposit/DepositForm.tsx`
**Gate:** `validateDepositRequest(requestId)` — invalid/unknown requestId blocks access

Form fields include:
- Personal info: name, email, phone, address (city/state/zip)
- Pickup date, time preference, day preference, alt date, notes
- Payment method selection (Zelle / Venmo / Cash App / Square)
- How-heard questionnaire (6 checkboxes)
- Five Wave-E/H6 acknowledgment checkboxes (each separately timestamped):
  - Payment authorization
  - Identity attestation
  - Pre-dispute contact requirement
  - Pickup acceptance clause
  - Florida venue clause
- 18+ age attestation
- E-sign, statutory rights, arbitration, genetic disclaimer, welfare responsibility acks
- Buyer signature (typed text + timestamp)

**DB write:**
- `deposit_agreements` INSERT (`agreement_status = 'sent'`, `buyer_signed_at = now()`)
- DB trigger `link_deposit_agreement_to_request` → `deposit_requests.request_status` → `converted`

---

### Step 6 — Buyer auto-redirected to Payment Dashboard

**Route:** `/payment/:agreementId/:buyerToken`
**Page:** `src/pages/PaymentDashboard.tsx`

After successful form submission, `DepositForm` redirects to this URL. The page
uses a scoped Supabase client with `x-buyer-token` global header. RLS policy
`public_read_via_buyer_token` gates the SELECT.

Token validity: 30 days from agreement creation.

---

### Step 7 — Buyer completes H1 payment attestation

**Within:** `PaymentDashboard.tsx`
**Edge function:** `submit-payment-attestation`
**DB table:** `payment_attestations`

Buyer:
1. Reads payment instructions (method, operator handle, payment memo)
2. Enters their own payment handle (Zelle email / $Cashtag / @username)
3. Uploads a screenshot of their payment-app profile showing their handle + name
4. Re-confirms phone number
5. Reads and signs the full attestation text: "I confirm I am [Name] sending
   payment from my own [method] account [handle] to Dream Puppies…"
6. Clicks Sign → IP, user-agent, and geolocation (if granted) captured
   server-side

**DB write:** `payment_attestations.attestation_status` → `signed`

---

### Step 8 — Buyer pays out-of-band, uploads confirmation

**Within:** `PaymentDashboard.tsx` (step 3 form, unlocked after H1)
**Storage bucket:** `payment-evidence` (private)

Buyer:
1. Pays via Zelle/Venmo/etc. to the operator handle shown on the dashboard
2. Returns to dashboard, uploads confirmation screenshot (showing amount,
   recipient, date/time, transaction ID)
3. Enters the transaction reference ID
4. Confirms the payment memo string used matches the displayed memo

**DB write:** `payment_attestations` columns `confirmation_screenshot_path`,
`transaction_reference_id`, `payment_memo_used`, `confirmation_captured_at`

---

### Step 9 — Buyer clicks "I have sent payment"

**Edge function:** `mark-payment-sent`
**Gate:** All H1+H2 preconditions must be met (422 otherwise):
- `attestation_status = 'signed'`
- `buyer_payment_handle_screenshot_path` set
- `confirmation_screenshot_path` set
- `transaction_reference_id` set

**DB write:** `deposit_agreements.buyer_marked_payment_sent_at = now()`
(race-safe: only writes if currently NULL)
**Email:** Admin receives "Buyer says payment sent for #DP-…"
**Idempotent:** Repeat clicks return `{ already_marked: true }` — no duplicate email

---

### Step 10 — Admin confirms payment received

**Page:** `/admin/agreements`
**Component:** `src/components/admin/AgreementDetailPanel.tsx`
**Service:** `src/lib/admin/agreements-service.ts` → `confirmDepositPayment(id, senderHandle)`

The admin types the sender handle as it appeared in their payment app. The
function compares it (case-insensitive, trimmed) against
`payment_attestations.buyer_payment_handle`:
- **Match:** no flag; proceeds normally
- **Mismatch:** sets `operator_handle_mismatch_flagged = true`; shows a banner
  ("Verify before finalizing"); does NOT block the confirmation — the flag is
  chargeback evidence (Wave H8)

**DB write:** `deposit_agreements`:
- `deposit_status` → `admin_confirmed`
- `payment_confirmed_at = now()`
- `operator_verified_sender_handle`
- `operator_verified_sender_handle_at`
- `operator_handle_mismatch_flagged`

**Email:** Buyer receives standalone deposit receipt (O12 template) via
`send-deposit-receipt` edge function.

---

### Step 11 — Admin signs + Finalizes Agreement → PDF generated

**Action 1: Admin signature**
`src/components/admin/AgreementDetailPanel.tsx` → `saveAdminSignature(id, svg, sellerName)`
**DB write:** `admin_signature_svg`, `admin_signature_name`, `admin_signed_at`

**Action 2: Finalize**
`finalizeAgreement(id)` → calls `finalize-agreement` edge function

**Edge function: `finalize-agreement`**
1. Verifies admin JWT + role
2. Sets `agreement_status = 'admin_approved'`
3. Calls `generateDepositPdf(supabase, agreementId)` synchronously (Wave F):
   - Loads `deposit_agreement_template.pdf` AcroForm template
   - Validates all 95 field names via `assertAllFieldsPresent(form)`
   - Fills all fields via `fillDepositAgreement(form, row, puppy)`
   - Flattens form (non-editable)
   - Uploads to `agreements/{agreementId}/{agreementNumber}.pdf`
   - Sets `deposit_agreements.signed_pdf_storage_path`
   - Sets `agreement_status = 'complete'`
   - Sets `puppies.status = 'Reserved'` (from `Available` — idempotent)
4. Sends buyer email with tokenized PDF download URL

**Storage bucket:** `agreements` (private; admin direct-access; buyer via signed URL)

---

### Step 12 — Buyer receives email with PDF download link

**Email template:** `agreementFinalizedBuyer`
**Download route:** `/agreements/:agreementId/:buyerToken/download`
**Page:** `src/pages/AgreementDownload.tsx`
**Edge function:** `agreement-download-url` (public, no JWT)

Each page visit mints a fresh 1-hour signed storage URL via
`supabase.storage.from('agreements').createSignedUrl(path, 3600)`. The signed
URL never lives in inboxes — only the buyer-token link does.

Token validity: 30 days (same `buyer_access_token` as Payment Dashboard).

---

### Step 13 — Pickup day: operator runs handover flow (Wave H4)

**Page:** `/admin/pickup/:agreementId`
**Component:** `src/pages/admin/PickupHandover.tsx`

Operator:
1. Opens handover page on tablet
2. Verifies buyer ID: type (DL/passport/state ID), last 4 digits, state/country,
   expiration confirmation — **never the full ID number**
3. Takes two required photos: buyer-with-puppy, buyer-holding-ID-next-to-face
4. Captures buyer signature via signature pad
5. Checks health acknowledgment + vet certificate handover
6. Enters staff initials
7. Submits → `finalize-pickup-handover` edge function

**Edge function: `finalize-pickup-handover`**
- Sets `handover_status = 'in_person_verified'`
- Generates pickup handover PDF
- Sends "welcome home" buyer email
- Sets `puppies.status = 'Sold'`

---

## State machines (quick reference)

See `docs/status-enums.md` for the full canonical list.

### `deposit_requests.request_status`
```
pending → accepted → deposit_link_sent → converted (terminal)
pending → declined (terminal)
accepted → declined (terminal)
```

### `deposit_agreements.agreement_status`
```
sent → admin_approved → complete (terminal)
sent → cancelled (terminal)
admin_approved → cancelled (terminal)
```

### `deposit_agreements.deposit_status`
```
pending → admin_confirmed
pending → rejected (terminal)
admin_confirmed → refunded (terminal)
```

### `puppies.status`
```
Available → Reserved  (agreement reaches complete; via generateDepositPdf G3)
Reserved  → Available (agreement cancelled)
Reserved  → Sold      (pickup handover finalized; via finalize-pickup-handover)
```

---

## Edge functions (reservation workflow)

| Function | Trigger | Auth |
|---|---|---|
| `notify-deposit-request` | DB webhook on `deposit_requests` INSERT | `verify_jwt: false` |
| `send-deposit-link` | Admin action | Bearer JWT + admin role |
| `submit-payment-attestation` | Buyer action | buyer token (verifyBuyerToken) |
| `mark-payment-sent` | Buyer action | buyer token (verifyBuyerToken) |
| `send-deposit-receipt` | Called from confirmDepositPayment | Bearer JWT + admin role |
| `finalize-agreement` | Admin action | Bearer JWT + admin role |
| `generate-agreement-pdf` | Admin action (standalone) | Bearer JWT + admin role |
| `agreement-download-url` | Buyer action | buyer token (verifyBuyerToken) |
| `finalize-pickup-handover` | Operator action | Bearer JWT + admin role |
| `generate-dispute-evidence-packet` | Admin action | Bearer JWT + admin role |

---

## Key files

| Layer | File |
|---|---|
| Deposit form | `src/pages/DepositAgreement.tsx` |
| Deposit form component | `src/components/deposit/DepositForm.tsx` |
| Payment dashboard | `src/pages/PaymentDashboard.tsx` |
| PDF download page | `src/pages/AgreementDownload.tsx` |
| Admin agreements list | `src/pages/admin/AgreementsPage.tsx` |
| Admin agreement detail | `src/components/admin/AgreementDetailPanel.tsx` |
| Admin operator review form | `src/components/admin/OperatorReviewForm.tsx` |
| Pickup handover | `src/pages/admin/PickupHandover.tsx` |
| Deposit service | `src/lib/deposit-service.ts` |
| Payment dashboard service | `src/lib/payment-dashboard-service.ts` |
| Payment attestation service | `src/lib/payment-attestation-service.ts` |
| Agreements admin service | `src/lib/admin/agreements-service.ts` |
| PDF field map | `supabase/functions/_shared/pdf/depositAgreementFieldMap.ts` |
| PDF generator | `supabase/functions/_shared/pdf/generateDepositPdf.ts` |
| Buyer token auth | `supabase/functions/_shared/auth/verifyBuyerToken.ts` |
| Admin auth | `supabase/functions/_shared/auth/verifyAdmin.ts` |
| Status enums | `docs/status-enums.md` |
| AcroForm field spec | `docs/spec/pdf-acroform-fields.md` |
| Field disambiguation | `docs/spec/pdf-field-disambiguation.md` |

---

## Verification checklist

For a full browser-based end-to-end run, see `docs/ops/reservation-flow-smoke-test.md`.

1. Submit `/request-deposit` → row in `deposit_requests` with `status: pending`; admin email arrives
2. Admin fills Operator Review Form → puppy row updated with price + deposit amount; request → `accepted`
3. Admin clicks "Send Deposit Link" → buyer email with `?requestId=…`; request → `deposit_link_sent`
4. Buyer clicks link → `/deposit?requestId=…` loads form pre-populated
5. Buyer fills and submits form → row in `deposit_agreements`; request → `converted`; buyer auto-redirected to `/payment/<id>/<token>`
6. Buyer completes H1 attestation + handle screenshot → `payment_attestations.attestation_status = 'signed'`
7. Buyer uploads confirmation screenshot + tx ref → `payment_attestations` updated
8. Buyer clicks "I have sent payment" → `buyer_marked_payment_sent_at` set; admin email arrives
9. Admin confirms payment with sender handle → `deposit_status = 'admin_confirmed'`; mismatch banner if applicable; receipt email to buyer
10. Admin signs + finalizes → PDF in `agreements` bucket; `agreement_status = 'complete'`; `puppies.status = 'Reserved'`
11. Buyer receives email → clicks download link → fresh 1-hour signed URL minted per click
12. Pickup day: operator completes handover form → photos in `pickup-evidence` bucket; `puppies.status = 'Sold'`; welcome email sent
