# Wave H completion summary — May 2026

**Completed:** 2026-05-06  
**Scope:** Chargeback defense / identity capture / pickup handover / dispute evidence  
**Head commit at completion:** `afc8efa` (includes PR 1 + PR 2 design restoration on top of H8)  
**Last Wave H commit:** `6a003d1` (H8 v2)

---

## What Wave H shipped

Wave H adds the evidence layer that protects against payment disputes and
chargebacks. Every phase is designed to be idempotent and self-contained; the
ZIPs generated in H8 require no live DB connection to read.

---

## H1 — Payment-time identity capture

**Commits:** `9a7c18a` (schema) · `e0c846e` (edge fn) · `ce325a2` (UI phases 1c+1d) · `479055f` (gate enforcement 1e)

**Migration:** `supabase/migrations/20260506000009_payment_attestations_and_h3.sql`  
**Storage bucket:** `payment-evidence` (private; admin direct read, buyer-token via signed URL)  
**Edge function deployed:** `submit-payment-attestation` (v1, public, buyer-token gated)

### What it adds

New table `payment_attestations` (one row per agreement, UNIQUE constraint):

| Column | Purpose |
|---|---|
| `attestation_status` | `draft` → `signed` |
| `payment_method_handle_to_use` | The operator handle the buyer pays TO |
| `buyer_payment_handle` | Buyer's own Zelle email / $Cashtag / @username |
| `buyer_payment_handle_screenshot_path` | Supabase Storage path in `payment-evidence` |
| `buyer_phone_at_payment` | Confirmed at signing |
| `payment_attestation_text` | Full legalese the buyer signed, verbatim |
| `payment_attestation_signed_at` | Server timestamp |
| `payment_attestation_ip` | Captured by edge function from request headers |
| `payment_attestation_user_agent` | Captured by edge function |
| `payment_attestation_geolocation` | `{ lat, lng, accuracy }` if browser granted |

PaymentDashboard (`src/pages/PaymentDashboard.tsx`) gains the multi-step flow:
- **Step 2 (H1)** — buyer enters own payment handle, uploads handle screenshot, confirms phone, signs attestation text → `submit-payment-attestation` fires
- **Step 3 (H2, same commit)** — buyer uploads payment confirmation screenshot, enters transaction reference ID, confirms memo used → `submitH2Confirmation` fires  
- **"I have sent payment"** button gated on H1 signed + H2 confirmation captured

H1e (`479055f`): `mark-payment-sent` (Wave D3) updated to enforce all preconditions before setting `buyer_marked_payment_sent_at`. Returns 422 with the specific missing field if any precondition fails.

---

## H2 — Post-payment confirmation capture

**Committed with:** `ce325a2` (H1c+1d)

Columns added to `payment_attestations` in the same migration (`20260506000009`):

| Column | Purpose |
|---|---|
| `confirmation_screenshot_path` | Payment app confirmation screen |
| `transaction_reference_id` | Tx ID from buyer's payment app |
| `payment_memo_used` | Memo string buyer actually typed |
| `confirmation_captured_at` | Server timestamp |

---

## H3 — Operator payment verification

**Commit:** `e9b12d7`

Columns added to `deposit_agreements` in the same migration (`20260506000009`):

| Column | Purpose |
|---|---|
| `operator_verified_sender_handle` | Handle as it appeared in operator's payment app |
| `operator_verified_sender_handle_at` | When operator entered it |
| `operator_handle_mismatch_flagged` | `true` if handle ≠ buyer's H1 attestation (case-insensitive trim) |

`confirmDepositPayment` (`src/lib/admin/agreements-service.ts`) updated to:
1. Require a non-empty `senderHandle` before proceeding.
2. Fetch `payment_attestations.buyer_payment_handle` via `fetchAttestedBuyerHandle`.
3. Compare case-insensitively; write `operator_handle_mismatch_flagged = true` when mismatched.
4. Mismatch **does not block** confirmation — it records evidence.

AgreementDetailPanel shows the mismatch flag as a visible amber banner after confirmation.

---

## H4 — Pickup-day handover module

**Commits:** `2e93741` (schema + bucket) · `8b557bf` (admin UI + edge function)

**Migration:** `supabase/migrations/20260506000010_pickup_handovers.sql`  
**Storage bucket:** `pickup-evidence` (private; admin-only)  
**Edge function deployed:** `finalize-pickup-handover` (v1, admin JWT required)

### What it adds

New table `pickup_handovers` (one row per agreement, UNIQUE + ON DELETE RESTRICT):

| Column group | Purpose |
|---|---|
| `handover_status` | `scheduled` → `in_person_verified` |
| `pickup_date` | Confirmed date at handover |
| `buyer_id_type`, `buyer_id_last_four`, `buyer_id_state_or_country`, `buyer_id_expiration_verified` | ID confirmation — last-4 only, **no full DL number** |
| `buyer_signature_canvas` | base64 PNG from signature pad |
| `buyer_signature_at`, `staff_member_initials`, `staff_signature_at` | Staff sign-off |
| `photo_buyer_with_puppy_path`, `photo_buyer_with_id_path`, `photo_pickup_location_path` | Required + optional photos |
| `health_acknowledgment_signed_at`, `vet_certificate_handed_over`, `vet_certificate_acknowledged_at` | Acknowledgment timestamps |
| `pickup_lat`, `pickup_lng` | Optional geolocation |

New page `src/pages/admin/PickupHandover.tsx` (route `/admin/pickup/:agreementId`):  
Tablet-optimized operator flow — camera upload, signature pad, ID last-4, acknowledgment checkboxes, staff initials.

`finalize-pickup-handover` edge function:
1. `verifyAdmin` check.
2. Validates all required fields (photos, ID, signatures).
3. Sets `handover_status = 'in_person_verified'`.
4. Transitions `puppies.status = 'Sold'`.
5. Sends welcome-home buyer email via `_shared/email/send.ts` (auto-logged to comms).
6. Idempotent — repeat calls after the first return `{ already_verified: true }`.

---

## H5 — Communication archive

**Commits:** `45817f4` (table + auto-log) · `7aa2bc1` (agreementId propagation) · `aa2cd29` (admin UI)

**Migration:** `supabase/migrations/20260506000011_agreement_communications.sql`

### What it adds

New table `agreement_communications`:

| Column | Purpose |
|---|---|
| `direction` | `inbound` \| `outbound` |
| `channel` | `email` \| `sms` \| `phone` \| `in_person_note` |
| `occurred_at` | Event timestamp |
| `summary` | Free text (max 500 chars in UI) |
| `attachment_paths` | `text[]` for future file attachments |
| `recorded_by_user_id` | NULL = system auto-log; non-null = admin manual entry |

**Auto-log:** `_shared/email/send.ts` writes an `outbound / email` row for every Resend email fired. All 7 agreement-scoped email senders propagate `agreementId` (`7aa2bc1`).

**Manual log:** New component `src/components/admin/AgreementCommunicationsCard.tsx` — phone/SMS/in-person note entry form + scrollable timeline grouped by day, rendered inside AgreementDetailPanel.

---

## H6 — Contract clauses

**Committed as part of Wave E:** `ac40f81`

Six new acknowledgment timestamp columns added to `deposit_agreements` and rendered as individually-timestamped checkboxes in DepositForm:

- `ack_payment_authorization_at`
- `ack_identity_attestation_at`
- `ack_pre_dispute_contact_at`
- `ack_pickup_acceptance_at`
- `ack_florida_venue_at` *(parked — attorney review required before production)*
- `ack_age_attestation_at` (replaces the deprecated `ack_age_accuracy_at`)

---

## H7 — Merchant descriptor / handle hygiene

**Commit:** `76506a2`

Operator checklist saved at `docs/ops/payment-handle-hygiene.md`. No code changes.  
**Action required (operator):** Set Square merchant descriptor to `DREAMPUPPIES 321-697-8864` in Square dashboard. Confirm Zelle/Venmo/Cash App receiving accounts display business name.

---

## H8 — Dispute-evidence packet generator

**Commits:** `285c069` (v1 proof-of-concept) · `6a003d1` (v2 production design, approved + deployed)

**Migration:** `supabase/migrations/20260506000012_dispute_evidence_bucket.sql`  
**Storage bucket:** `dispute-evidence` (private; admin-only)  
**Edge function deployed:** `generate-dispute-evidence-packet` (v2, admin JWT required)

### What it adds

**Edge function** `generate-dispute-evidence-packet/index.ts`:  
Builds and uploads a self-contained ZIP to `dispute-evidence/{agreementId}/{filename}.zip`.

ZIP contents:

| File | Purpose |
|---|---|
| `README.txt` | Agreement header + completeness checklist (✓/✗ per H1–H4 + Wave F pending) + payment-method-specific upload instructions |
| `manifest.json` | Discriminated-union per-artifact record: `{ status: "embedded" }` \| `{ status: "omitted", reason }` |
| `audit_trail.json` | Single merged self-contained record — agreement, buyer identity, transaction, all ack timestamps, payment attestation, operator verification, pickup handover, communication log entries. No DB connection needed to read. |
| `payment_evidence/{name}.{ext}` | Handle + confirmation screenshots, downloaded from Storage as bytes |
| `pickup_evidence/{name}.{ext}` | Buyer-with-puppy, buyer-with-ID, pickup location, `buyer-signature.png` |

Key design decisions:
- `buyer_access_token` is **never written** to any file in the ZIP (bearer-token semantics preserved).
- File extensions derived from `blob.type` via `MIME_TO_EXT` map, not path parsing (handles iOS HEIC-as-JPEG, WebP, AVIF).
- `uploadInstructions()`: P2P block ("cash app", "zelle", "venmo", "apple pay") evaluated **before** cash/check block — substring collision guard.
- ZIP stored; function returns `{ ok, zip_path, generated_at }` — no signed URL in the response (UI calls `getDisputePacketUrl` separately to get a fresh 1-hour URL per click).

**Service layer** (`src/lib/admin/agreements-service.ts`):
- `DisputePacket` interface: `{ name: string; zip_path: string; created_at: string | null }`
- `listDisputePackets(agreementId)` — newest-first, `.zip` files only
- `getDisputePacketUrl(zipPath)` — fresh 1-hour signed URL per call, never cached
- `generateDisputeEvidencePacket(agreementId)` — returns `{ zip_path, generated_at }`

**Admin UI** — `DisputeEvidenceCard` component in AgreementDetailPanel:
- Most-recent packet + expandable past-packets list
- "Generate Fresh" / "Generate Packet" button
- "↓ Download" button on each row mints a fresh signed URL via `getDisputePacketUrl` on click

---

## Migrations applied in Wave H (in order)

| Migration | Contents |
|---|---|
| `20260506000009_payment_attestations_and_h3.sql` | `payment_attestations` table + RLS + `payment-evidence` bucket + H3 columns on `deposit_agreements` |
| `20260506000010_pickup_handovers.sql` | `pickup_handovers` table + RLS + `pickup-evidence` bucket |
| `20260506000011_agreement_communications.sql` | `agreement_communications` table + RLS + index |
| `20260506000012_dispute_evidence_bucket.sql` | `dispute-evidence` bucket + admin-only RLS |

---

## Edge functions deployed in Wave H

| Function | Version | Auth | Deployed in |
|---|---|---|---|
| `submit-payment-attestation` | v1 | Public (buyer-token body param, verified server-side) | `e0c846e` |
| `finalize-pickup-handover` | v1 | Admin JWT (`verify_jwt: true`) | `8b557bf` |
| `generate-dispute-evidence-packet` | v2 | Admin JWT (`verify_jwt: true`) | `6a003d1` |

---

## Explicit non-goals (confirmed not shipped)

- Full driver's license numbers — never collected. Last-4 + state + expiration only (H4).
- SSN, full DOB, or financial account numbers — not collected anywhere.
- Plaid or third-party identity-verification API — not integrated.
- Auto-submission of dispute responses to Square — operator uploads the H8 packet manually.
- Square merchant descriptor change — operator action; not code (H7 docs only).

---

## What H did NOT do (open items)

| Item | Status |
|---|---|
| FL venue clause (`ack_florida_venue_at`) | Column + checkbox exist in code; **requires attorney review before production deploy** |
| send-deposit-receipt auto-log smoke verify | Hits naturally during admin use; not formally tested |
| Wave F PDF generation | Not started — Wave H was built first due to operational urgency |
| `puppies.status = 'Reserved'` full lifecycle | Partial (`9dc3f1d` — sync on agreement status change); full wire deferred to Wave G |
