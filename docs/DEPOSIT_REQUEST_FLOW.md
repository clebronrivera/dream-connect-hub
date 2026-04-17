# Deposit Request Flow

This document describes the **request → approval → agreement** workflow added on 2026-04-15. It bridges the gap between a customer expressing interest and the existing legal deposit agreement form.

## Why this exists

Before this feature, a customer browsing `/upcoming-litters` could only submit a vague inquiry via `contact_messages`. The admin then had to manually email a `/deposit?litter=X` link. The flow was undocumented, manual, and error-prone.

This feature formalizes that bridge with three semantic layers:
- **Request** ≠ inquiry — a formal expression of intent to deposit
- **Agreement** ≠ payment — a legal document; payment happens off-site
- **Converted** = the customer submitted the agreement form, NOT that money was received (payment confirmation continues to live in `deposit_agreements.deposit_status`)

## Customer-facing flow

1. **Browse** → `/upcoming-litters` — customer taps a litter card or puppy slot tile
2. **Modal opens** → "Request a Deposit Reservation"
   - Required: name, email, phone, city, state, litter (puppy slot optional)
   - Phone is now required (used for SMS delivery)
   - Info banner explains the 24-48hr review timeline
   - Disclaimer: "Submitting a request does not guarantee availability or placement"
   - Expedite phone CTA: business phone from `BUSINESS.phone`
3. **Submit** → row inserted into `deposit_requests` (`status: pending`, `origin: public_form`)
4. **Wait** → admin reviews and either accepts + sends link, or declines
5. **Receive deposit link** via email and/or SMS → click link → land on `/deposit?litter=...&request=...`
6. **Complete agreement** → form pre-validates the request link, on submit:
   - Inserts new row in `deposit_agreements` with `deposit_request_id` set
   - Updates `deposit_requests` row to `status: converted`, `deposit_agreement_id: <new id>`, `converted_at: now()`

## Admin-facing flow

### From a public request
1. **Email notification** — admin gets emailed via `notify-deposit-request` edge function
2. **Open** `/admin/deposit-requests` → expand the request card
3. **Review** customer info, litter, phone validity (SMS-ready badge)
4. **Accept** (status → `accepted`) or **Decline** with reason (status → `declined`)
5. **Send Deposit Link** — pick channels (Email ☑ / SMS ☑), optional custom message → click Send
   - Status → `deposit_link_sent`
   - Per-channel timestamps recorded
   - On partial failure (e.g., email succeeds, SMS fails), status still updates and channels actually sent are recorded

### Admin-initiated request
1. Click **"+ New Request"** on `/admin/deposit-requests`
2. Fill customer info + litter + puppy slot
3. Tick **"Send link immediately"** → choose channels → click **Create & Send Link**
   - Single action: creates request (`origin: admin_initiated`, `status: accepted`) AND sends the link

### Resend
A request in `deposit_link_sent` status shows a **Resend Link** button. Same function, same validation. The deposit link and timestamps are overwritten; the canonical link (request id + litter id) doesn't change.

## State machine

```
pending → accepted        (admin approves)
pending → declined        (admin declines)
accepted → deposit_link_sent  (admin sends link)
accepted → declined       (admin changes mind before sending)
deposit_link_sent → deposit_link_sent  (resend allowed)
deposit_link_sent → converted  (customer submits agreement form)
declined → terminal
converted → terminal
```

Enforced by a `BEFORE UPDATE` trigger (`enforce_deposit_request_transition`) that allows same-status updates (admin notes, SMS callbacks, etc.) but rejects invalid status transitions.

## Database

### `deposit_requests` table
Migration: `supabase/migrations/20260414000000_deposit_requests.sql`

Key columns:
- `customer_name`, `customer_email`, `customer_phone`, `customer_phone_e164` (auto-normalized to E.164 via trigger)
- `upcoming_litter_id`, `upcoming_litter_label` (snapshot), `upcoming_puppy_placeholder_id`, `upcoming_puppy_placeholder_summary`
- `request_status` (enum), `origin` (enum)
- `deposit_link_url`, `deposit_link_sent_at`, `deposit_link_sent_via` (text array)
- `email_sent_at`, `sms_sent_at`, `sms_delivery_status`
- `deposit_agreement_id` (FK), `converted_at`
- `admin_notes`, `admin_reviewed_at`, `decline_reason`

### `deposit_agreements` linkage
Same migration adds `deposit_agreements.deposit_request_id uuid` (FK to deposit_requests). Two unique partial indexes enforce 1-to-1 linkage:
- `idx_deposit_agreements_unique_request` ON deposit_agreements(deposit_request_id) WHERE deposit_request_id IS NOT NULL
- `idx_deposit_requests_unique_agreement` ON deposit_requests(deposit_agreement_id) WHERE deposit_agreement_id IS NOT NULL

### RLS
- **Public INSERT** on `deposit_requests` is locked down: only allowed if `request_status='pending'`, `origin='public_form'`, and all admin/system fields are NULL (including `customer_phone_e164` which is trigger-owned)
- **Admin ALL** uses the standard pattern `EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')`

A separate migration on the same day, `20260415000000_deposit_agreements_public_insert.sql` (applied as `deposit_agreements_public_insert`), fixed a pre-existing bug where `deposit_agreements` had no public INSERT policy. The `/deposit` form had been broken for public users since launch; this is now resolved with constraints that prevent setting admin/finalization fields. A narrow time-window SELECT policy (rows created in the last 1 minute) lets the buyer's success screen read the agreement number after submitting.

## Edge functions

### `notify-deposit-request` (`verify_jwt: false`)
Triggered by Database Webhook on `deposit_requests` INSERT. Sends an HTML email via Resend to the `NOTIFY_EMAIL` admin recipients with request details and a link to `/admin/deposit-requests`.

### `send-deposit-link` (`verify_jwt: false`)
Admin-invoked. Sends the deposit agreement link via email (Resend) and/or SMS (Twilio).

**Auth:** Verifies admin role inside the function (gateway-level JWT verification was disabled because it was returning 401 before the function code could run). The client-side service explicitly grabs `supabase.auth.getSession().access_token` and passes it as the `Authorization: Bearer ...` header. The function then calls `admin.auth.getUser(jwt)` and checks the profiles table.

**Validation:**
- Request must exist and be in `accepted` or `deposit_link_sent` status (resend allowed)
- At least one channel selected
- For SMS: `customer_phone_e164` must be set

**Partial failure:** If email succeeds but SMS fails (or vice versa), status is still updated to `deposit_link_sent` and `deposit_link_sent_via` records only the channels that actually succeeded. If both fail, returns 502 and does not update status.

**CORS:** Handles `OPTIONS` preflight with `204` and proper CORS headers (initial deployment was failing because preflight returned 405).

## Required Supabase secrets

In **Project Settings → Edge Functions → Secrets**:
- `RESEND_API_KEY` — already set, used by all email functions
- `NOTIFY_EMAIL` — comma-separated admin email recipients
- `RESEND_FROM` — optional, defaults to `Dream Puppies <onboarding@resend.dev>`
- `TWILIO_ACCOUNT_SID` — from Twilio console (starts with `AC...`)
- `TWILIO_AUTH_TOKEN` — from Twilio console
- `TWILIO_PHONE_NUMBER` — Twilio number in E.164 format (`+13215550123`)
- `SITE_URL` — base URL for deposit links. Set to production domain for prod; flip to `http://localhost:8080` for local testing.

## Twilio trial caveat

Twilio trial accounts can only send SMS to **verified Caller IDs**. To receive a test text:
- Twilio Console → Phone Numbers → Manage → **Verified Caller IDs** → Add the recipient phone

To send to any US number, upgrade the Twilio account (~$20 credit). SMS to US is $0.0079 per message.

## Key files

| Layer | File | Purpose |
|---|---|---|
| Migration | `supabase/migrations/20260414000000_deposit_requests.sql` | Table + RLS + triggers + indexes |
| Migration | `supabase/migrations/20260415000000_deposit_agreements_public_insert.sql` | Fix public INSERT on deposit_agreements |
| Edge fn | `supabase/functions/notify-deposit-request/index.ts` | Admin notification on new request |
| Edge fn | `supabase/functions/send-deposit-link/index.ts` | Email + SMS delivery to customer |
| Public form | `src/components/DepositRequestForm.tsx` | Replaces inquiry modal on litter cards |
| Service | `src/lib/deposit-requests.ts` | Public insert |
| Public wiring | `src/components/upcoming/UpcomingLittersSection.tsx` | Uses new form |
| Public form | `src/pages/DepositAgreement.tsx` | Reads + validates `?request=` param |
| Service | `src/lib/deposit-service.ts` | `submitDepositAgreement` writes conversion + `validateDepositRequest` helper |
| Admin page | `src/pages/admin/DepositRequests.tsx` | List with status badges |
| Admin component | `src/components/admin/DepositRequestDetailPanel.tsx` | Per-request actions |
| Admin component | `src/components/admin/AdminInitiateDepositDialog.tsx` | Admin-initiated request dialog |
| Admin service | `src/lib/admin/deposit-requests-service.ts` | All admin CRUD + edge fn invocation |
| Types | `src/types/deposit-request.ts` | TypeScript definitions |
| Routing | `src/App.tsx` | `/admin/deposit-requests` route |
| Nav | `src/components/admin/AdminLayout.tsx` | "Deposit Requests" nav link |
| Dashboard | `src/pages/admin/Dashboard.tsx` | Pending requests stat card |

## Verification checklist

1. **Public flow:** Submit deposit request from `/upcoming-litters` → row appears in DB with `status: pending` → admin notification email arrives
2. **Admin accept + send:** Open `/admin/deposit-requests` → expand pending request → Accept → Send Deposit Link with email + SMS → email arrives at customer + SMS arrives (if Twilio recipient verified)
3. **Customer completes:** Click link in email → `/deposit?litter=...&request=...` loads → fill form → submit → request flips to `converted` and links to the new agreement
4. **Admin-initiated:** Click "+ New Request" → fill form → "Send link immediately" → customer receives link
5. **Resend:** From a `deposit_link_sent` request, click Resend Link → succeeds, timestamps update
6. **Decline:** From a `pending` request, click Decline with reason → status → declined; reason persisted
7. **RLS hardening:** Try inserting via SQL client without admin context: should only succeed when `request_status='pending'` and `origin='public_form'` and admin/system fields are NULL

## Known limitations

- **Twilio trial:** SMS only delivers to verified numbers until upgrade
- **No expiration:** Deposit links don't auto-expire. The plan deferred this — add a job later if request aging becomes a real ops need
- **Single timestamp for accept/decline:** `admin_reviewed_at` covers both. If you ever need finer audit history, add `accepted_at` and `declined_at` columns or an event log table
