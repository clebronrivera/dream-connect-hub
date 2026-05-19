# Deposit Agreement Flow — Post-Redesign (May 2026)

> **This document supersedes the pre-PR-1 flow.** The public `/request-deposit`
> buyer-intake form and the `/admin/deposit-requests` review page were retired in
> PR 1 of the reservation redesign. The flow is now operator-initiated.

---

## Overview

The reservation flow uses two database tables:

| Table | Role |
|---|---|
| `deposit_requests` | Operator creates a slot and sends the buyer a tokenized link. |
| `deposit_agreements` | Buyer completes the wizard; row is created on submit. |

The 13 steps below span both tables and are the canonical reference for edge
functions, UI pages, and smoke tests.

---

## Step 1 — Operator opens New Reservation

**Page:** `/admin/reservations` → "New Reservation" button

The operator fills an inline form:
- Puppy (select existing, or "undecided" for a litter slot)
- Purchase price
- Deposit amount (default $300; overrideable)
- Optional notes to buyer

On submit a `deposit_requests` row is created with `request_status = 'accepted'`.

**Tables written:** `deposit_requests`

---

## Step 2 — Operator sends the deposit link

**Still on:** `/admin/reservations` → the new row's "Send Link" button

Triggers the `send-deposit-link` edge function, which:
- Emails the buyer a link: `https://<site>/deposit?requestId=<uuid>`
- Sets `deposit_requests.request_status = 'deposit_link_sent'`

**Tables written:** `deposit_requests`
**Emails sent:** Buyer receives deposit link

---

## Step 3 — Buyer opens the wizard

**Page:** `/deposit?requestId=<uuid>`

`DepositAgreement.tsx` validates the `requestId` via `validateDepositRequest()`.
If the request is not in `deposit_link_sent` status, the page shows a "Restricted"
gate card.

A valid request loads `DepositWizard.tsx` (multi-step form).

---

## Step 4 — Buyer completes the wizard (7 internal steps)

**Wizard steps** (managed by `DepositWizard.tsx` + `WizardShell.tsx`):

1. **Contact** — name, email, phone, city, state, zip
2. **Pickup** — preferred date range, morning/afternoon/evening, weekday/weekend
3. **Payment** — select Zelle / Venmo / Cash App / Square / Cash
4. **Puppy** — verify this is the right puppy/litter
5. **Adopt signature** — buyer types full legal name + initials (see `StepAdoptSignature`)
6. **Agreement clauses** — buyer initials each of the 11 clauses (see `StepAgreementTerms`,
   `CLAUSE_KEYS`)
7. **Review & submit** — summary of all fields; "Submit reservation" button

On submit `submitDepositAgreement()` in `deposit-service.ts` INSERTs the
`deposit_agreements` row with `agreement_status = 'sent'`, `buyer_signed_at = now()`.
The `link_deposit_agreement_to_request` DB trigger fires and marks the
`deposit_requests` row `converted`.

**Tables written:** `deposit_agreements` (INSERT), `deposit_requests` (trigger → converted)

After submit: buyer is redirected to `/payment/<agreementId>/<buyerToken>`.

---

## Step 5 — Buyer notifies payment sent

**Page:** `/payment/<agreementId>/<buyerToken>` (`PaymentDashboard.tsx`)

The dashboard shows:
- Reservation summary (puppy, amounts, payment memo)
- Optional screenshot upload for dispute evidence (not a gate)
- "I've sent my deposit" CTA button

Clicking the button calls `markPaymentSent()` → `mark-payment-sent` edge function
(public; auth via `buyer_access_token`). The function sets
`deposit_agreements.buyer_marked_payment_sent_at = now()` and emails admins.

**Tables written:** `deposit_agreements`
**Emails sent:** Admin receives "Buyer says payment sent for #DP-…"

---

## Step 6 — Admin countersigns

**Page:** `/admin/reservations` → agreement detail panel

Admin reviews the agreement, draws or types their signature, clicks
"Save Signature" (`saveAdminSignature()` → direct UPDATE).

**Tables written:** `deposit_agreements` (admin_signed_at, admin_signature_svg)

---

## Step 7 — Admin confirms payment received

**Still on:** agreement detail panel

Admin enters the sender handle (as it appeared in their payment app) and clicks
"Confirm Payment Received" (`confirmDepositPayment()`).

- Sets `deposit_status = 'admin_confirmed'`
- Cross-checks handle against `payment_attestations.buyer_payment_handle` (if present)
- If mismatch: sets `operator_handle_mismatch_flagged = true` (non-blocking; logged for
  dispute evidence)

**Tables written:** `deposit_agreements`

---

## Step 8 — Admin finalizes (countersign → PDF)

**Still on:** agreement detail panel → "Finalize Agreement" button

Calls `finalizeAgreement()` → `finalize-agreement` edge function.

The edge function:
1. Verifies `buyer_signed_at` + `admin_signed_at` are set
2. Sets `agreement_status = 'admin_approved'`
3. Calls `generateDepositPdf()` (shared helper in `_shared/pdf/generateDepositPdf.ts`):
   - Fills the AcroForm PDF template
   - Uploads to `agreements/<id>/<agreementNumber>.pdf`
   - Sets `signed_pdf_storage_path`
4. Sets `puppies.status = 'Reserved'` for the linked puppy (idempotent)
5. Sends buyer `buyerReservationConfirmed` email with payment instructions +
   PDF download link

**Tables written:** `deposit_agreements`, `puppies`
**Storage written:** `agreements/<id>/<agreementNumber>.pdf`
**Emails sent:** Buyer receives confirmation + PDF link

---

## Step 9 — Buyer downloads PDF

**Page:** `/agreements/<id>/<buyerToken>/download` (`AgreementDownload.tsx`)

Calls `agreement-download-url` edge function (public; auth via `buyer_access_token`).
Mints a 1-hour signed URL for the PDF in `agreements` bucket. Page redirects to it.

---

## Step 10 — Admin downloads PDF

**Page:** `/admin/reservations` → detail panel → "Download Agreement PDF"

`getAgreementPdfUrl(signed_pdf_storage_path)` mints a 1-hour signed URL via
`supabase.storage.from('agreements').createSignedUrl(...)`.

---

## Step 11 — Admin schedules pickup

**Page:** `/admin/reservations` → detail panel → "Confirm Pickup Date"

Admin confirms the pickup date (`confirmPickupDate()`). Buyer receives a separate
pickup-confirmation email (out of scope for this flow doc; see `send-pickup-reminder`).

---

## Step 12 — Pickup day handover

**Page:** `/admin/pickup/<agreementId>` (`PickupHandover.tsx`)

Three-step tablet flow:

| Step | Name | Gate |
|---|---|---|
| 1 | Payment check | `deposit_status = 'admin_confirmed'` required to advance |
| 2 | Visual inspection | 3 checkboxes must all be checked; optional ID last-4 |
| 3 | Bill of sale | Typed buyer signature + staff initials required |

On "Finalize Handover":
1. `upsertPickupHandover()` saves the row with all timestamps
2. `finalizePickupHandover()` → `finalize-pickup-handover` edge function:
   - Sets `handover_status = 'in_person_verified'`
   - Sets `agreement_status = 'complete'` on the agreement (terminal)
   - Sets `puppies.status = 'Sold'` (idempotent)
   - Generates bill-of-sale PDF via `generateBillOfSale()` shared helper
   - Sends buyer "Welcome home!" email with 7-day bill-of-sale link
   - Notifies admin

**Tables written:** `pickup_handovers`, `deposit_agreements`, `puppies`
**Storage written:** `agreements/<id>/bill-of-sale.pdf`
**Emails sent:** Buyer welcome-home; admin pickup-complete

---

## Step 13 — Generate dispute evidence (if needed)

**Page:** `/admin/reservations` → detail panel → "Generate evidence packet"

Calls `generate-dispute-evidence-packet` edge function. Returns a ZIP in the
`dispute-evidence` storage bucket containing all PDFs, screenshots, and the
audit-trail JSON. Admin uploads to Square's dispute portal manually.

---

## Status reference

See [`docs/status-enums.md`](./status-enums.md) for the canonical enum values
for all status columns.

## File map

| Concern | File |
|---|---|
| Wizard orchestrator | `src/components/wizard/DepositWizard.tsx` |
| Wizard shell (progress bar, nav) | `src/components/wizard/WizardShell.tsx` |
| Clause definitions + CLAUSE_KEYS | `src/components/wizard/StepAgreementTerms.tsx` |
| Signature adoption | `src/components/wizard/StepAdoptSignature.tsx` |
| Deposit form submission | `src/lib/deposit-service.ts` |
| Agreements admin CRUD | `src/lib/admin/agreements-service.ts` |
| Reservations unified list | `src/lib/admin/reservations-service.ts` |
| Payment dashboard | `src/pages/PaymentDashboard.tsx` |
| Pickup handover page | `src/pages/admin/PickupHandover.tsx` |
| PDF: deposit agreement | `supabase/functions/_shared/pdf/generateDepositPdf.ts` |
| PDF: bill of sale | `supabase/functions/_shared/pdf/generateBillOfSalePdf.ts` |
| Edge fn: finalize agreement | `supabase/functions/finalize-agreement/index.ts` |
| Edge fn: pickup handover | `supabase/functions/finalize-pickup-handover/index.ts` |
| Edge fn: mark payment sent | `supabase/functions/mark-payment-sent/index.ts` |
| Auth helper (admin JWT) | `supabase/functions/_shared/auth/verifyAdmin.ts` |
| Auth helper (buyer token) | `supabase/functions/_shared/auth/verifyBuyerToken.ts` |
