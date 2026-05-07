# Smoke Test — Full Reservation Workflow

Browser-based end-to-end verification of all 13 steps in the deposit-agreement
workflow. Run this after every deployment that touches `deposit_agreements`,
`deposit_requests`, `payment_attestations`, any related edge functions, or the
`agreements` storage bucket.

**Prerequisites:**
- A staging/test Supabase project (or production — but use obviously-test data)
- An email inbox you can check for buyer emails
- A separate email or alias for the admin `NOTIFY_EMAIL`
- The `agreements` storage bucket migration applied (`20260506000013_agreements_storage_bucket.sql`)
- All edge function secrets set: `RESEND_API_KEY`, `NOTIFY_EMAIL`, `RESEND_FROM`,
  `PUBLIC_SITE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Setup

1. Open an **incognito window** (no cached sessions, no logged-in admin).
2. Open **DevTools → Network** with **Preserve log** enabled.
3. Have a second browser tab signed in as admin at `/admin`.

---

## Step 1 — Submit deposit request

**Page:** `/request-deposit`

1. Fill the form with test data:
   - Name: `SMOKETEST Buyer`
   - Email: `<buyer test inbox>`
   - Phone: any valid 10-digit US number
   - City/State: `Orlando, FL`
   - Litter: pick any available upcoming litter
   - How heard: check any option
2. Click Submit.

**Pass criteria:**
- ✅ Success message displayed
- ✅ Row appears in `deposit_requests` with `request_status = 'pending'`
- ✅ Admin receives email with request summary and `/admin/deposit-requests` link

---

## Step 2 — Admin reviews and fills Operator Review Form

**Page:** `/admin/deposit-requests`

1. Find the new SMOKETEST request.
2. Click to expand → click **Open Review Form**.
3. Fill in:
   - Puppy: select any available puppy (or create a test one)
   - Purchase price: `1200`
   - Deposit amount: leave at `300`
   - Notes to buyer: `Test deposit — do not pay`
4. Click Submit.

**Pass criteria:**
- ✅ Request card shows status `Accepted`
- ✅ "Send Deposit Link" button appears

---

## Step 3 — Send deposit link

**Still on:** `/admin/deposit-requests`

1. Click **Send Deposit Link**.

**Pass criteria:**
- ✅ Request status → `deposit_link_sent`
- ✅ Buyer inbox receives email with a `?requestId=…` link
- ✅ Link URL format: `https://<site>/deposit?requestId=<uuid>`

---

## Step 4 — Buyer fills deposit agreement form

1. Click the deposit link from the buyer email.
2. Verify the form loads (not a "Restricted" page).
3. Fill all required fields:
   - Personal info: name, email, phone, city, state, zip
   - Pickup date: any future date > 8 weeks from puppy DOB
   - Payment method: select Zelle (or any enabled method)
   - All acknowledgment checkboxes
   - Signature: type full legal name
4. Click Submit.

**Pass criteria:**
- ✅ Success — form does not show errors
- ✅ Row appears in `deposit_agreements` with `agreement_status = 'sent'`,
  `buyer_signed_at` set
- ✅ `deposit_requests` row transitions to `converted`
- ✅ Browser auto-redirects to `/payment/<agreementId>/<token>`

---

## Step 5 — Payment Dashboard — H1 attestation

**Page:** `/payment/<agreementId>/<token>`

1. Verify the page loads and shows:
   - Deposit amount: `$300.00`
   - Payment method: the one selected in step 4
   - Operator handle (where to send payment)
   - Payment memo string
2. Fill the H1 attestation form:
   - Your payment handle: `buyer@test.com`
   - Upload any PNG as the handle screenshot (test placeholder OK)
   - Re-confirm phone number
   - Read and sign the attestation text
3. Click Sign.

**Pass criteria:**
- ✅ `payment_attestations` row with `attestation_status = 'signed'`,
  `buyer_payment_handle_screenshot_path` set
- ✅ Step 3 (confirmation upload) unlocks
- ✅ "I have sent payment" button is still disabled (H2 incomplete)

---

## Step 6 — Payment Dashboard — H2 confirmation

**Still on:** Payment Dashboard

1. Upload any PNG as the confirmation screenshot.
2. Enter transaction reference: `SMOKE-TEST-12345`
3. Confirm the memo string shown.

**Pass criteria:**
- ✅ `payment_attestations` row updated with `confirmation_screenshot_path` and
  `transaction_reference_id` set
- ✅ "I have sent payment" button becomes enabled

---

## Step 7 — Buyer marks payment sent

1. Click **I have sent payment**.

**Pass criteria:**
- ✅ Button disables; "payment sent" status displayed
- ✅ `deposit_agreements.buyer_marked_payment_sent_at` set
- ✅ Admin receives "Buyer says payment sent for #DP-…" email
- ✅ Clicking the button again → UI shows already-sent state (idempotent)

**If 422:** Check the `payment_attestations` row — all four required fields must
be set: `attestation_status='signed'`, `buyer_payment_handle_screenshot_path`,
`confirmation_screenshot_path`, `transaction_reference_id`.

---

## Step 8 — Admin confirms payment received

**Page:** `/admin/agreements` → find the SMOKETEST agreement

1. In the "Confirm Payment" section, type the sender handle: `buyer@test.com`
2. Click **Confirm Payment Received**.

**Pass criteria:**
- ✅ `deposit_status = 'admin_confirmed'`
- ✅ No mismatch banner (handles match)
- ✅ Buyer receives deposit receipt email (O12 template)

**Mismatch test (optional):** Type a different handle (e.g. `wrong@example.com`)
before confirming. Verify the mismatch banner appears and
`operator_handle_mismatch_flagged = true` in the DB. Then use the correct handle
to confirm properly.

---

## Step 9 — Admin applies signature

**Still on:** `/admin/agreements` → SMOKETEST agreement

1. In the signature section, draw or type the admin signature.
2. Click **Save Signature**.

**Pass criteria:**
- ✅ `admin_signed_at` set, `admin_signature_svg` populated

---

## Step 10 — Admin finalizes → PDF generated

1. Click **Finalize Agreement**.

**Pass criteria:**
- ✅ `agreement_status = 'admin_approved'` briefly, then `'complete'`
- ✅ `signed_pdf_storage_path` set in `deposit_agreements`
- ✅ File appears in Supabase Storage → `agreements/<id>/<agreementNumber>.pdf`
- ✅ `puppies.status = 'Reserved'` for the linked puppy
- ✅ Admin UI shows "Download Agreement PDF" button
- ✅ Buyer receives finalization email with PDF download link

---

## Step 11 — Admin downloads PDF

1. Click **Download Agreement PDF** in the admin detail panel.

**Pass criteria:**
- ✅ PDF opens/downloads — all fields filled, form flattened (no editable fields)
- ✅ Buyer name, agreement number, deposit amount, payment method, date, both
  signatures all visible in the PDF
- ✅ Clicking again mints a fresh URL (no cached stale link)

---

## Step 12 — Buyer downloads PDF

1. Open the finalization email in the buyer inbox.
2. Click the PDF download link.

**Pass criteria:**
- ✅ Page at `/agreements/<id>/<token>/download` shows "Preparing your download…"
- ✅ Browser download starts automatically (or "Download starting…" message appears)
- ✅ Same PDF content as admin download
- ✅ Visiting with a wrong token (`/agreements/<id>/wrong-tok/download`) → "Download
  unavailable" error with no retry button (non-retryable)

---

## Step 13 — Pickup handover (Wave H4)

**Page:** `/admin/pickup/<agreementId>`

1. Open the handover page on a tablet or desktop.
2. Fill in:
   - ID type: Driver's License
   - Last 4 digits: `1234`
   - State: `FL`
   - Check the expiration confirmation box
3. Upload two test photos (any JPG/PNG):
   - Buyer with puppy
   - Buyer holding ID next to face
4. Have the buyer sign the signature pad.
5. Check health acknowledgment + vet certificate.
6. Enter staff initials: `TK`
7. Click **Complete Handover**.

**Pass criteria:**
- ✅ `pickup_handovers.handover_status = 'in_person_verified'`
- ✅ Photos in `pickup-evidence/<id>/` Storage bucket
- ✅ `puppies.status = 'Sold'`
- ✅ Buyer receives "Welcome home!" email

---

## Cleanup

After the smoke test run:
1. In SQL Editor: `DELETE FROM deposit_requests WHERE customer_name = 'SMOKETEST Buyer';`
   (cascade deletes linked agreement, attestation, communications rows)
2. In Supabase Storage: delete `agreements/<smoketest-id>/` and
   `payment-evidence/<smoketest-id>/`
3. In Table Editor: reset the test puppy status back to `Available` if needed

---

## Failure triage quick reference

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `/deposit?requestId=…` shows "Restricted" | `validateDepositRequest` failed — request not in `deposit_link_sent` status | Check `deposit_requests.request_status` in DB |
| Redirect after submit goes to wrong URL | `deposit-service.ts` `submitDepositAgreement` not returning `buyer_access_token` | Check `.select()` in the INSERT — confirm column exists |
| Payment Dashboard 404 | `buyer_access_token` column missing | Apply Wave D migration |
| "I have sent payment" → 422 | Missing H1/H2 attestation fields | Check `payment_attestations` row for the specific `missing_precondition` field in the response |
| Finalize → PDF generation fails | Template drift (`assertAllFieldsPresent` throws) | Check function logs; compare field names in `depositAgreementFieldMap.ts` vs actual template |
| `agreements` bucket upload fails | Bucket doesn't exist or RLS missing | Apply `20260506000013_agreements_storage_bucket.sql` |
| `puppies.status` not transitioning to `Reserved` | `puppy_id` NULL on the agreement | Confirm `OperatorReviewForm` is persisting `puppy_id` |
| PDF download link 403 | Wrong buyer token in URL | Confirm URL built from `buyer_access_token` not `id` |
| PDF download link "expired" | Token > 30 days old | Issue a new buyer-token link manually |
