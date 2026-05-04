# Credential rotation runbook — Wave 1.1

Operator-facing checklists for rotating the secrets that the Dream Puppies
stack depends on. Each section walks through one secret end-to-end: where
to rotate it, every place the new value must be pasted, what to expect
during the rotation window, what to smoke-test afterward, and how to roll
back if something breaks.

> **Scope**: this runbook covers **operator action only**. No agent or
> automation in this repo can rotate these credentials — they all require
> Dashboard logins the operator owns. Do **not** paste rotated secret
> values into chat, commit them, or share them in PR descriptions.

> **Project ref**: `xwudsqswlfpoljuhbphr` (Supabase project
> `dream-connect-hub`).

Last updated: 2026-04-26.

## Pre-rotation safety checklist

Run this before rotating *any* secret:

- [ ] Pull latest from `main` and confirm a clean working tree
      (`git status --short`).
- [ ] Confirm no edge-function deploy is mid-flight (deploy logs in
      Supabase Dashboard → Edge Functions → Logs).
- [ ] Confirm no scheduled cron job is about to fire
      (`send-pending-reminders` — check Edge Function invocations the last
      hour). If one is imminent, wait for it to clear so you don't lose a
      reminder run.
- [ ] Have ready: a working **Supabase Dashboard** session, a working
      **Resend Dashboard** session, and the **Netlify Dashboard** session
      (only needed if `VITE_SUPABASE_ANON_KEY` is also being rotated —
      out of scope here, but mentioned for completeness).
- [ ] Decide whether you'll rotate one secret at a time (recommended) or
      bundle multiple in a single window. For a first pass, do them
      one at a time.

---

## 1. Rotate the Resend API key (`RESEND_API_KEY`)

### Where it lives

- Supabase Edge Function secrets (the only place that matters at runtime).
- Possibly in your local `supabase/.env.local` if you've ever run
  `supabase functions serve` locally — verify and update if so.

### Where it's consumed

Every edge function that sends an email goes through
`supabase/functions/_shared/email/send.ts`, which reads `RESEND_API_KEY`
once. All of these break together if the key is invalid:

- `notify-puppy-inquiry`
- `notify-contact-message`
- `notify-deposit-request`
- `send-deposit-link`
- `send-deposit-receipt`
- `send-request-decision`
- `send-pending-reminders`
- `finalize-agreement`
- `generate-training-plan` (also sends customer plan + admin lead emails)

### Rotation steps

1. Open <https://resend.com/api-keys>, click **Create API Key**, name it
   something like `dream-puppies-prod-2026-04-26`. Copy the value to a
   secure password manager — you will not see it again in the Resend UI.
2. **Do not** revoke the old key yet.
3. Set the new key in Supabase Edge Function secrets:
   ```
   supabase secrets set RESEND_API_KEY=<new value> --project-ref xwudsqswlfpoljuhbphr
   ```
   No redeploy is needed — Supabase reads secrets at function invocation.
4. Trigger a low-stakes email path to confirm the new key works (see
   smoke tests below). If green, revoke the old key in the Resend
   Dashboard.
5. If you keep `RESEND_API_KEY` in `supabase/.env.local` for local
   `supabase functions serve` runs, update that file too. Do **not**
   commit it.

### Smoke tests

Run at least one customer-facing path and one admin path:

- **Customer-facing** (training-plan flow, end-to-end):
  - Open `https://puppyheavenllc.com/training-plan` in incognito.
  - Submit a real test payload. Expect the green success state and an
    email in the inbox you used.
- **Admin notification** (puppy_inquiries webhook):
  - Submit a test puppy inquiry from `https://puppyheavenllc.com/contact`.
  - Confirm the admin recipients listed in `NOTIFY_EMAIL` receive the
    notification.
- Tail the function logs while testing:
  ```
  supabase functions logs notify-puppy-inquiry --project-ref xwudsqswlfpoljuhbphr
  supabase functions logs generate-training-plan --project-ref xwudsqswlfpoljuhbphr
  ```
  Any `Resend errors` or `403 Unauthorized` line means the new key
  isn't valid for the configured `RESEND_FROM` domain.

### If something breaks

- **Symptom**: customer ack emails stop arriving or admin notifications
  go silent. Function logs show Resend `401`/`403`.
- **Likely cause**: old key was already revoked but new key isn't taking
  effect, or `RESEND_FROM` references a domain not yet verified in the
  new account.
- **Recovery**: re-run `supabase secrets set RESEND_API_KEY=<value>` with
  a key you know is valid. If you've revoked the old key prematurely,
  generate another fresh key in Resend and set that. There's no edge
  function code change required — secrets reload on next invocation.

---

## 2. Rotate the Supabase service-role JWT (`SUPABASE_SERVICE_ROLE_KEY`)

### Where it lives

- Supabase Project Settings → API → `service_role` key (the canonical
  source).
- Supabase Edge Function secrets (`SUPABASE_SERVICE_ROLE_KEY`).
- Database Webhooks → Authorization headers on the three notify-* webhooks
  (per `docs/security/wave-2-pending-hardening.md` §1).
- Local `.env.local` (used by admin scripts — `scripts/setup-database.js`,
  `scripts/run-sql.js`, `scripts/inspect-database.ts`, etc.).
- Any CI secret store if you wire `service_role` into GitHub Actions or
  Netlify build commands. The current repo doesn't, but check before
  rotating.

### Where it's consumed at runtime

Every edge function that needs to bypass RLS — and that's most of them
post-Wave-2.6:

- `submit-testimonial`, `submit-contact-message`, `submit-puppy-inquiry`
  (PR-2/3/4 from this wave).
- `generate-training-plan` (training_plan_submissions writes).
- `finalize-agreement` (deposit pipeline).
- `send-deposit-link`, `send-deposit-receipt`, `send-request-decision`.

Plus the three Database Webhooks for `notify-*` — they include the
service-role JWT in `Authorization: Bearer ...` so the edge function can
verify the request once `verify_jwt=true` is enabled (Wave 2.1 PR-B,
parked).

### Rotation steps

1. **Pre-rotation**: confirm the three notify-* Database Webhooks
   currently use a hard-coded `Authorization: Bearer <service-role JWT>`
   header. (Supabase Dashboard → Database → Webhooks → each notify
   webhook → HTTP Headers.) **You will need to re-paste the new value
   into each of those three webhook headers as part of this rotation.**
2. In Supabase Dashboard → Project Settings → API, click **Generate new
   service_role key**. Supabase keeps both keys live for a 24-hour
   grace period (the old key continues to work, the new one is now
   issued for new clients).
3. Copy the new value to a password manager. **Do not** paste it into
   any file in this repo.
4. Update Supabase Edge Function secrets:
   ```
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<new value> --project-ref xwudsqswlfpoljuhbphr
   ```
   No redeploy needed.
5. Update each of the three Database Webhook Authorization headers in
   the Dashboard:
   - `notify on puppy inquiry` → header `Authorization: Bearer <new value>`
   - `notify on contact message` → header `Authorization: Bearer <new value>`
   - `notify on deposit request` → header `Authorization: Bearer <new value>`
   Save each.
6. Update `.env.local` with the new value (single copy of the
   `SUPABASE_SERVICE_ROLE_KEY` line). Do **not** commit.
7. **Wait for in-flight invocations to finish** (check the Function logs
   page; once you see ≥ 60 seconds of clean traffic with the new key,
   you're safe).
8. In the Supabase Dashboard, revoke the old service-role key.

### Smoke tests

Run **all** of these — service-role rotation breaks the most paths:

- **Public form gates** (each one writes via service role):
  - Submit a testimonial from `/dreamy-reviews` → expect "pending
    approval" toast and a row in admin testimonials.
  - Submit a contact-form message from `/contact` → expect the
    "Message Sent!" toast and a row in admin → contact messages.
  - Submit a puppy inquiry from `/contact?subject=puppy-inquiry` →
    expect "Interest Received!" toast.
  - Submit a training plan from `/training-plan` → expect the AI plan to
    render in-browser and the email to arrive.
- **Database Webhooks** (these prove the new service-role JWT is in the
  webhook headers correctly):
  - Each public form submission above should also trigger the matching
    `notify-*` webhook → admin notification email arrives. Tail logs:
    ```
    supabase functions logs notify-puppy-inquiry --project-ref xwudsqswlfpoljuhbphr
    supabase functions logs notify-contact-message --project-ref xwudsqswlfpoljuhbphr
    supabase functions logs notify-deposit-request --project-ref xwudsqswlfpoljuhbphr
    ```
- **Admin-only deposit functions** (admin client uses service role
  internally via the deposit_request flow):
  - From an admin session, send a deposit link for a real or test
    request. Confirm the customer email + SMS arrive.
- **Admin scripts** (use the service-role key from `.env.local`):
  ```
  npm run inspect:database
  npm run verify:database
  ```
  Both should complete without 401s.

### If something breaks

- **Symptom**: notification webhooks stop firing, admin sees no inbox
  notifications, but the row appears in the table.
- **Likely cause**: webhook header still has the old (now-revoked) JWT.
  Re-check Dashboard → Database → Webhooks → each notify-* → HTTP
  Headers.
- **Symptom**: edge function logs show `JWT expired` / `invalid
  signature` / `403`.
- **Likely cause**: function secret was overwritten with a typo'd value
  or an old key. Re-run `supabase secrets set ...` with a freshly copied
  value.
- **Symptom**: admin scripts fail with `401 Unauthorized`.
- **Likely cause**: `.env.local` not updated. Update it.
- **Recovery**: if you've revoked the old key prematurely and notifications
  are silent, generate a *third* key in the Dashboard, paste it into all
  five places (function secret + three webhook headers + `.env.local`),
  then revoke the others.

---

## 3. Rotate the Postgres database password (`SUPABASE_DB_PASSWORD`)

### Where it lives

- Supabase Project Settings → Database → Connection string → Password.
- Local `.env.local` if you've ever wired up direct `psql` / `pg` access
  for scripts. (None of the in-tree `npm run …:database` scripts use the
  raw DB password — they use `SUPABASE_SERVICE_ROLE_KEY` against the REST
  / RPC API. Verify your local `.env.local` to confirm.)

### Where it's consumed at runtime

- **Production runtime**: not directly. Supabase manages the connection
  pool. Edge functions and admin scripts in this repo go through the API
  with the service-role JWT, not the DB password.
- **CLI**: `supabase db push`, `supabase db reset`, `supabase db diff`,
  `supabase migration *` — the CLI may prompt for the DB password the
  first time you run a DB command after rotation.

### Rotation steps

1. In Supabase Dashboard → Project Settings → Database, click **Reset
   database password**. Generate a strong password and copy it to a
   password manager.
2. Update `.env.local` if it contains `SUPABASE_DB_PASSWORD`. Do **not**
   commit.
3. The next time you run a Supabase CLI command that needs DB access,
   you'll be prompted for the new password. Either paste it then or, if
   the CLI uses `SUPABASE_DB_PASSWORD` from your shell env, set it
   explicitly:
   ```
   export SUPABASE_DB_PASSWORD='<new value>'
   supabase db push --project-ref xwudsqswlfpoljuhbphr
   ```
4. Verify with a no-op CLI command:
   ```
   supabase migration list --project-ref xwudsqswlfpoljuhbphr
   ```
   Expect the migration list to print without an auth error.

### Smoke tests

- A no-op `supabase migration list` should succeed (above).
- All public form paths should still work (the change does not affect
  edge function or REST API access — those use the service-role JWT, not
  the DB password).
- Production app still loads `https://puppyheavenllc.com` and shows
  available puppies — confirms the connection pool is still healthy.

### If something breaks

- **Symptom**: `supabase db push` or `supabase migration *` returns
  `password authentication failed`.
- **Likely cause**: stale `SUPABASE_DB_PASSWORD` in env or a stale
  cached credential in `~/.supabase`.
- **Recovery**: re-export the new value, or `supabase logout && supabase
  login` to clear cached creds and re-link the project. Worst case,
  reset the password again from the Dashboard if you lost the value
  before saving it.

---

## 4. After any rotation

- [ ] Update the relevant entry in `wave-status.md` and the verification
      log in [`docs/security/wave-2-pending-hardening.md`](wave-2-pending-hardening.md)
      with the rotation date.
- [ ] Confirm `git status --short` is clean — no accidental commit of
      `.env.local` or any file containing the new secret.
- [ ] Optionally: in your password manager, mark the old key as
      "revoked YYYY-MM-DD" so you can audit later.
- [ ] If the rotation was triggered by a known leak: also run
      `git log --all -p -S '<known-leaked-fragment>'` to confirm the
      old value isn't in repo history. If it is, treat as a separate
      incident — `git filter-repo` is destructive and requires explicit
      coordination with all collaborators. Do **not** rewrite history
      unilaterally.

## Out of scope for this runbook

The following secrets exist in the stack but are **not** in the Wave 1.1
rotation set. Document and add their own rotation procedure when they
become a concern:

- `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile, set 2026-04-25 for Wave
  2.6 PR-1).
- `CRON_SECRET` (gate on `send-pending-reminders`, Wave 2.1 PR-A).
- `TWILIO_AUTH_TOKEN` / `TWILIO_ACCOUNT_SID` / `TWILIO_PHONE_NUMBER`
  (SMS for `send-deposit-link`).
- `ANTHROPIC_API_KEY` (training-plan AI — `generate-training-plan`).
- `VITE_SUPABASE_ANON_KEY` (anon JWT in the public bundle — has its own
  rotation flow because it ships in the Netlify build artifact).
