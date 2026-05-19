# Smoke Test — Full Reservation Workflow

Browser-based end-to-end verification of all 13 steps in the deposit-agreement
workflow. Run this after every deployment that touches `deposit_agreements`,
`deposit_requests`, `pickup_handovers`, any related edge functions, or the
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

## Step 1 — Operator creates a reservation slot

**Page:** `/admin/reservations` → **New Reservation** button

1. Fill the form:
   - Puppy: select any available puppy, or leave as "Undecided" for a litter slot
   - Purchase price: `1200`
   - Deposit amount: `300`
   - Notes to buyer: `Test reservation — do not pay`
2. Click **Create Reservation**.

**Pass criteria:**
- ✅ Row appears in `/admin/reservations` with status `Link Ready`
- ✅ Row appears in `deposit_requests` with `request_status = 'accepted'`

---

## Step 2 — Send deposit link to buyer

**Still on:** `/admin/reservations` → find the new row → **Send Deposit Link**

**Pass criteria:**
- ✅ Row status → `Link Sent`
- ✅ `deposit_requests.request_status = 'deposit_link_sent'`
- ✅ Buyer inbox receives email with a `?requestId=…` link
- ✅ Link URL format: `https://<site>/deposit?requestId=<uuid>`

---

## Step 3 — Buyer opens the wizard

1. Click the deposit link from the buyer email.
2. Verify the wizard loads (not a "Restricted" page).

**Pass criteria:**
- ✅ Wizard renders step 1 of N
- ✅ Puppy name / litter shown in the sticky header

---

## Step 4 — Buyer completes the multi-step wizard

Navigate through all wizard steps:
1. **Contact** — name: `SMOKETEST Buyer`, email: `<buyer test inbox>`, phone, city, state, zip
2. **Pickup** — any future date > 8 weeks from puppy DOB
3. **Payment** — select Zelle (or any enabled method)
4. **Puppy** — verify puppy card shown
5. **Adopt signature** — type full name; verify initials are auto-derived; click **Adopt**
6. **Agreement clauses** — tap initials against each of the 11 clauses until all 11/11 are stamped
7. **Review & submit** — confirm all fields; click **Submit reservation**

**Pass criteria:**
- ✅ Wizard advances cleanly through all steps
- ✅ Row appears in `deposit_agreements` with `agreement_status = 'sent'`, `buyer_signed_at` set
- ✅ `deposit_requests` row transitions to `converted`
- ✅ Browser auto-redirects to `/payment/<agreementId>/<token>`

---

## Step 5 — Payment dashboard: buyer notifies payment sent

**Page:** `/payment/<agreementId>/<token>`

1. Verify the page loads and shows:
   - Deposit amount: `$300.00`
   - Payment method and handle (where to send)
   - Payment memo string
2. (Optional) Upload any PNG as a screenshot for dispute evidence
3. Click **I've sent my deposit**

**Pass criteria:**
- ✅ Button disables; recorded-payment notice appears
- ✅ `deposit_agreements.buyer_marked_payment_sent_at` set
- ✅ Admin receives "Buyer says payment sent for #DP-…" email
- ✅ Clicking the button again → shows already-sent state (idempotent)

---

## Step 6 — Admin countersigns

**Page:** `/admin/reservations` → find SMOKETEST → open detail panel

1. In the signature section, type the admin signature name.
2. Click **Save Signature**.

**Pass criteria:**
- ✅ `admin_signed_at` set, `admin_signature_svg` / `admin_signature_name` populated

---

## Step 7 — Admin confirms payment received

**Still on:** detail panel → "Confirm Payment" section

1. Type the sender handle as seen in your payment app: `buyer@test.com`
2. Click **Confirm Payment Received**

**Pass criteria:**
- ✅ `deposit_status = 'admin_confirmed'`
- ✅ No mismatch banner (handles match)
- ✅ Buyer receives deposit receipt email

**Mismatch test (optional):** Type a different handle (e.g. `wrong@example.com`) before
confirming. Verify the mismatch banner appears and `operator_handle_mismatch_flagged = true`
in the DB. Then confirm with the correct handle.

---

## Step 8 — Admin finalizes agreement → PDF generated

**Still on:** detail panel → **Finalize Agreement**

**Pass criteria:**
- ✅ `agreement_status = 'admin_approved'`
- ✅ `signed_pdf_storage_path` set in `deposit_agreements`
- ✅ File appears in Supabase Storage → `agreements/<id>/<agreementNumber>.pdf`
- ✅ `puppies.status = 'Reserved'` for the linked puppy
- ✅ Admin UI shows "Download Agreement PDF" button
- ✅ Buyer receives finalization email with PDF download link

---

## Step 9 — Admin downloads PDF

1. Click **Download Agreement PDF** in the admin detail panel.

**Pass criteria:**
- ✅ PDF opens/downloads — all fields filled, form flattened (no editable fields)
- ✅ Clicking again mints a fresh URL (no cached stale link)

---

## Step 10 — Buyer downloads PDF

1. Open the finalization email in the buyer inbox.
2. Click the PDF download link.

**Pass criteria:**
- ✅ Page at `/agreements/<id>/<token>/download` redirects to download
- ✅ Visiting with a wrong token → "Download unavailable" error

---

## Step 11 — Admin confirms pickup date

**Page:** `/admin/reservations` → detail panel → **Confirm Pickup Date**

**Pass criteria:**
- ✅ `confirmed_pickup_date` set on the agreement

---

## Step 12 — Pickup day handover

**Page:** `/admin/pickup/<agreementId>`

### Step 12a — Payment check
1. Verify deposit badge shows "Deposit confirmed".
2. Click **Continue →**

### Step 12b — Visual inspection
1. Check all three inspection items:
   - "Puppy is alert and active"
   - "Coat and eyes look healthy"
   - "This is the same dog from the listing photos"
2. (Optional) Enter buyer ID last-4: `1234`
3. Click **Buyer accepts delivery →**

### Step 12c — Bill of sale
1. Verify the bill-of-sale summary shows correct puppy/buyer/price.
2. Have the buyer type their full name in the signature field.
3. Enter staff initials: `TK`
4. Click **Finalize Handover**

**Pass criteria:**
- ✅ `pickup_handovers.handover_status = 'in_person_verified'`
- ✅ `deposit_agreements.agreement_status = 'complete'` (terminal)
- ✅ `puppies.status = 'Sold'`
- ✅ `agreements/<id>/bill-of-sale.pdf` uploaded to Storage
- ✅ Buyer receives "Welcome home!" email with bill-of-sale download link
- ✅ Admin receives pickup-complete notification
- ✅ `/admin/reservations` row shows status `Picked Up`

---

## Step 13 — Generate dispute evidence (optional verification)

**Page:** `/admin/reservations` → detail panel → **Generate Evidence Packet**

**Pass criteria:**
- ✅ ZIP file appears in `dispute-evidence/<id>/` Storage bucket
- ✅ Admin receives 1-hour signed download URL
- ✅ ZIP contains: agreement PDF, bill-of-sale PDF, audit trail JSON

---

## Cleanup

After the smoke test run:
1. In SQL Editor: `DELETE FROM deposit_requests WHERE buyer_name = 'SMOKETEST Buyer';`
   (cascade deletes linked agreement, pickup_handovers, communications rows)
2. In Supabase Storage: delete `agreements/<smoketest-id>/` and
   `dispute-evidence/<smoketest-id>/`
3. In Table Editor: reset the test puppy status back to `Available` if needed

---

## Failure triage quick reference

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `/deposit?requestId=…` shows "Restricted" | `validateDepositRequest` failed — request not in `deposit_link_sent` status | Check `deposit_requests.request_status` in DB |
| Wizard step 6 shows < 11 clauses | `CLAUSE_KEYS` array changed | Count items in `StepAgreementTerms.tsx`; should be 11 |
| Redirect after wizard submit goes to wrong URL | `submitDepositAgreement` not returning `buyer_access_token` | Check `.select()` in the INSERT |
| Payment Dashboard 404 | `buyer_access_token` column missing | Apply Wave D migration |
| "I've sent my deposit" button → silent failure | `markPaymentSent` network error | Check DevTools Network; inspect `mark-payment-sent` edge function logs |
| Finalize → PDF generation fails | Template drift (`assertAllFieldsPresent` throws) | Check function logs; compare field names in `depositAgreementFieldMap.ts` vs template |
| `agreements` bucket upload fails | Bucket doesn't exist or RLS missing | Apply `20260506000013_agreements_storage_bucket.sql` |
| `puppies.status` not → `Reserved` | `puppy_id` NULL on the agreement | Confirm operator set puppy in New Reservation form |
| PDF download link 403 | Wrong buyer token in URL | Confirm URL built from `buyer_access_token` not `id` |
| Bill-of-sale email link missing | `generateBillOfSale` threw in `finalize-pickup-handover` | Check edge function logs; storage bucket policies |
| Pickup page not loading | `agreementId` param missing | Confirm link in admin panel uses correct route `/admin/pickup/<id>` |
