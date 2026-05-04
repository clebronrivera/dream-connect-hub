# Wave 2 — pending security hardening

Discovery and tracking doc for the security items still parked after the
Wave 2 production-verification on 2026-04-25 (`plans/AUDIT_REMEDIATION_PLAN.md`).

This document is **discovery only** — no runtime behavior changes from
publishing it. It captures the current state of each parked item, the
verification gates that must clear before each PR ships, and the order they
will land in.

Last updated: 2026-04-26.

## Item index

| Item | PR | Status | Blocked on |
|---|---|---|---|
| Wave 2.1 PR-B — `verify_jwt=true` on three `notify-*` functions | PR 7 | Parked | Dashboard verification that all three webhooks send the service-role JWT |
| Wave 2.6 PR-2 — captcha gate for `testimonials` | PR 2 | Implemented (awaiting deploy + production smoke) | Operator deploy via `scripts/deploy-submit-testimonial.sh` |
| Wave 2.6 PR-3 — captcha gate for `contact_messages` | PR 3 | Implemented (awaiting deploy + production smoke) | Operator deploy via `scripts/deploy-submit-contact-message.sh` |
| Wave 2.6 PR-4 — captcha gate for `puppy_inquiries` | PR 4 | Implemented (awaiting deploy + production smoke) | Operator deploy via `scripts/deploy-submit-puppy-inquiry.sh` |
| Wave 2.6 PR-5 — drop public INSERT RLS on the four form tables | PR 6 | Parked | Production verification that PR-2/3/4 captcha gates fail-closed |
| Wave 2.4 — `profiles` schema divergence between `supabase-schema.sql` and migration `20250208000000` | PR 8 | Resolved (Option A — `supabase-schema.sql` updated to match production) | — |
| Wave 1.1 — credential rotations (Resend, Supabase service role, DB password) | PR 9 | Runbook published ([credential-rotation-runbook.md](credential-rotation-runbook.md)); rotations themselves remain operator action | User must perform |

PR numbers above refer to the local sequencing in this doc, not GitHub PR IDs.

---

## 1. Wave 2.1 PR-B — three `notify-*` functions

### Functions in scope

All three are HTTP edge functions invoked by Supabase Database Webhooks on
INSERT. None of them inspect the `Authorization` header in code; they rely on
the platform `verify_jwt` flag for authentication.

| Function | Source | Webhook trigger |
|---|---|---|
| `notify-puppy-inquiry` | [supabase/functions/notify-puppy-inquiry/index.ts](../../supabase/functions/notify-puppy-inquiry/index.ts) | INSERT on `public.puppy_inquiries` |
| `notify-contact-message` | [supabase/functions/notify-contact-message/index.ts](../../supabase/functions/notify-contact-message/index.ts) | INSERT on `public.contact_messages` |
| `notify-deposit-request` | [supabase/functions/notify-deposit-request/index.ts](../../supabase/functions/notify-deposit-request/index.ts) | INSERT on `public.deposit_requests` |

### Current `verify_jwt` configuration

[`supabase/config.toml`](../../supabase/config.toml) does **not** declare any
`[functions.<name>]` blocks. Each notify function therefore inherits whatever
`verify_jwt` value is currently set against the function on the platform side
(Dashboard → Edge Functions → `<name>` → Settings → `Verify JWT`).

The audit-roadmap entry that opened this work item describes the goal as
"set `verify_jwt=true`," which implies at least one of the three is currently
running with `verify_jwt=false`. **The actual current value must be confirmed
in the Dashboard before any change.** Do not edit `config.toml` based on
assumptions.

### Webhook setting that must be verified before changing `verify_jwt`

Supabase Dashboard → **Database → Webhooks** → for each of the three webhooks
that target a `notify-*` URL, confirm:

- The `HTTP Headers` block includes `Authorization: Bearer <service-role JWT>`.
- The bearer value matches the project's current `service_role` key
  (Project Settings → API → `service_role` key — never paste the value into
  this repo or any chat).

If even one webhook is missing the header, flipping `verify_jwt` to `true`
will silently break that notification path.

[`docs/NOTIFICATIONS.md`](../NOTIFICATIONS.md) describes the webhook setup
but does **not** currently document the `Authorization` header requirement.
That doc should be updated as part of PR 7.

### Acceptance gate for PR 7 (the change PR)

PR 7 may only land after a human has, in the Dashboard:

1. Confirmed each of the three webhooks sends `Authorization: Bearer ...`
   with the current service-role JWT.
2. Recorded the verification timestamp in the "Production verification" log
   below.

Then PR 7 adds `[functions.notify-puppy-inquiry]`,
`[functions.notify-contact-message]`, `[functions.notify-deposit-request]`
blocks to `config.toml` with `verify_jwt = true`, redeploys all three, and
verifies:

- A direct unauthenticated `curl POST` returns **401**.
- A `curl POST` with a current service-role JWT returns the same 200
  acknowledgment as today.
- A real form submission still sends the admin + customer emails (i.e. the
  webhook path still succeeds end-to-end).

---

## 2. Form tables in scope

The Wave 2.6 work targets the **four public-INSERT form tables**:

| Table | Created by | Public-INSERT policy | Captcha today | Server-side path planned |
|---|---|---|---|---|
| `training_plan_submissions` | [20260411000002](../../supabase/migrations/20260411000002_training_plan_submissions.sql) | `public_insert_training` `WITH CHECK (true)` | ✅ Cloudflare Turnstile via [`generate-training-plan`](../../supabase/functions/generate-training-plan/index.ts) | Already gated (PR-1 verified 2026-04-25) |
| `testimonials` | [20260411000001](../../supabase/migrations/20260411000001_dreamy_reviews_testimonials.sql) | `public_insert_testimonials` `WITH CHECK (true)` | ❌ direct anon INSERT from [`testimonials-api.ts`](../../src/lib/testimonials-api.ts) | New `submit-testimonial` edge function (PR 2) |
| `contact_messages` | [`supabase-schema.sql`](../../supabase-schema.sql) | `Allow public insert on contact_messages` `WITH CHECK (true)` `TO anon, authenticated` | ❌ direct anon INSERT from [`contact-messages.ts`](../../src/lib/contact-messages.ts) | New `submit-contact-message` edge function (PR 3) |
| `puppy_inquiries` | [`supabase-schema.sql`](../../supabase-schema.sql) | `Allow public insert on puppy_inquiries` `WITH CHECK (true)` `TO anon, authenticated` | ❌ direct anon INSERT from [`PuppyInterestForm.tsx:159`](../../src/components/PuppyInterestForm.tsx) | New `submit-puppy-inquiry` edge function (PR 4) |

> **Note** — `consultation_requests` and `product_inquiries` also have public
> INSERT policies inherited from `supabase-schema.sql`, but they're outside
> the Wave 2.6 scope. Track them separately if/when they re-enter the
> active product surface.

### Existing captcha building blocks (reuse for PRs 2–4)

Wave 2.6 PR-1 landed these reusable pieces:

- Front end: [`<TurnstileWidget />`](../../src/components/turnstile/TurnstileWidget.tsx) — renders the Cloudflare widget, fires `onVerify(token)`. Reads `VITE_TURNSTILE_SITE_KEY`.
- Back end: [`_shared/turnstile.ts`](../../supabase/functions/_shared/turnstile.ts) — `verifyTurnstileToken(token, remoteIp)` returns `{ ok, errorCodes }`. Reads `TURNSTILE_SECRET_KEY` from edge-function secrets.
- Reference implementation: [`generate-training-plan/index.ts`](../../supabase/functions/generate-training-plan/index.ts) and [`TrainingPlanForm.tsx`](../../src/components/trainingPlan/TrainingPlanForm.tsx).

PRs 2–4 should use the same primitives without re-implementing them.

---

## 3. Wave 2.6 PR-2 — testimonials captcha gate

### Status

**Implemented in this PR. Awaiting operator deploy + production smoke test.**

### What landed

- New edge function [`supabase/functions/submit-testimonial/index.ts`](../../supabase/functions/submit-testimonial/index.ts):
  - POST-only, fail-closed CORS allowlist via `_shared/cors.ts`.
  - Calls `verifyTurnstileToken` from `_shared/turnstile.ts`. Missing/invalid
    token → 403 `{"error":"Captcha verification failed","codes":[...]}`.
  - Trims & length-caps the six text fields server-side
    (`customer_name`/`puppy_name` 120, `breed` 80, `city`/`state` 80,
    `message` 2000, `photo_path` 256).
  - Inserts via service role; returns `{ ok: true, id }`.
- [`src/lib/testimonials-api.ts`](../../src/lib/testimonials-api.ts) —
  `submitTestimonial()` no longer does a direct anon INSERT; it calls
  `supabase.functions.invoke('submit-testimonial', ...)`. Photo upload still
  goes directly to the `testimonial-photos` storage bucket (out of scope for
  this PR).
- [`src/pages/DreamyReviews.tsx`](../../src/pages/DreamyReviews.tsx) — the
  submit dialog now renders `<TurnstileWidget />` (when
  `VITE_TURNSTILE_SITE_KEY` is configured) and disables the submit button
  until the widget reports a verified token. Token is reset on dialog close
  and after successful submit.
- [`scripts/deploy-submit-testimonial.sh`](../../scripts/deploy-submit-testimonial.sh) —
  one-shot deploy script for the new function.

### Not changed in this PR

- `public_insert_testimonials` RLS policy is **still active**. The dual path
  (gated edge function + open RLS) is intentional for the verification
  window; PR 6 drops the policy after PR 5 confirms fail-closed behavior in
  production.
- `testimonial-photos` storage policies (MIME/size tightening) — kept for a
  follow-up PR per audit roadmap line ~104.

### Acceptance — to verify after deploy

- [ ] Submitting a testimonial with a valid Turnstile token succeeds and the
      row appears in the admin moderation list.
- [ ] Submitting without a token (curl directly to the function) returns
      403 `{"error":"Captcha verification failed","codes":["missing-input-response"]}`.
- [ ] Existing admin moderation flow (approve/feature/delete via
      `src/lib/admin/testimonials-service.ts`) still works.
- [ ] Public read of approved testimonials is unaffected
      (`public_read_approved_testimonials` policy unchanged).

---

## 4. Wave 2.6 PR-3 — contact_messages captcha gate

### Status

**Implemented in this PR. Awaiting operator deploy + production smoke test.**

### What landed

- New edge function [`supabase/functions/submit-contact-message/index.ts`](../../supabase/functions/submit-contact-message/index.ts) — distinct
  from the existing `notify-contact-message` webhook handler (per audit
  roadmap). Validates Turnstile, trims & length-caps every text field,
  inserts via service role, returns `{ ok: true, id }`.
- [`src/lib/contact-messages.ts`](../../src/lib/contact-messages.ts) —
  `insertContactMessage(row, turnstileToken)` now calls
  `supabase.functions.invoke('submit-contact-message', ...)`. Token is a
  separate argument so the row type stays clean.
- [`src/components/UpcomingLitterInquiryForm.tsx`](../../src/components/UpcomingLitterInquiryForm.tsx) —
  renders `<TurnstileWidget />`, threads the verified token onto
  `UpcomingLitterInquiryPayload.turnstile_token`, and disables submit until
  the widget reports success.
- [`src/pages/Contact.tsx`](../../src/pages/Contact.tsx) — general contact
  form renders `<TurnstileWidget />`, tracks `generalFormToken`, and
  forwards it to `insertContactMessage`. The upcoming-litter caller pulls
  `turnstile_token` off the payload and forwards it the same way.
- [`src/lib/contact-messages.test.ts`](../../src/lib/contact-messages.test.ts) —
  rewritten to mock the new `functions.invoke` path and to assert that the
  token is passed through.
- [`scripts/deploy-submit-contact-message.sh`](../../scripts/deploy-submit-contact-message.sh) —
  one-shot deploy script for the new function.

### Not changed in this PR

- `Allow public insert on contact_messages` RLS policy is **still active**.
  PR 6 drops it after PR 5 confirms fail-closed behavior in production.
- `notify-contact-message` webhook is unchanged. It still fires on the row
  insert (now performed by the service role), so admin + customer ack
  emails are unaffected.

### Acceptance — to verify after deploy

- [ ] General contact submission with a valid token succeeds and the row
      appears in the admin inbox; admin + customer-ack emails fire.
- [ ] Upcoming-litter inquiry submission with a valid token does the same.
- [ ] Curl POST without a token → 403 `{"error":"Captcha verification
      failed","codes":["missing-input-response"]}`.
- [ ] Existing admin inbox + detail dialog flows still work
      (`src/components/admin/ContactMessageInboxList.tsx`).

---

## 5. Wave 2.6 PR-4 — puppy_inquiries captcha gate

### Status

**Implemented in this PR. Awaiting operator deploy + production smoke test.**

### What landed

- New edge function [`supabase/functions/submit-puppy-inquiry/index.ts`](../../supabase/functions/submit-puppy-inquiry/index.ts) —
  validates Turnstile, length-caps every text field, drops the
  `preferences` JSONB blob if it exceeds 16 KB, normalizes `status` to
  `active`/`inactive` (defaulting to `active`), inserts via service role,
  returns `{ ok: true, id }`.
- [`src/components/PuppyInterestForm.tsx`](../../src/components/PuppyInterestForm.tsx) —
  `onSubmit` now calls `supabase.functions.invoke('submit-puppy-inquiry',
  ...)` instead of a direct anon INSERT. Tracks `turnstileToken`, renders
  `<TurnstileWidget />` above the submit button, disables submit until the
  token is captured, and resets the token after a successful submission.
  Surfaces the edge function's `error` field through the toast on failure.
- [`scripts/deploy-submit-puppy-inquiry.sh`](../../scripts/deploy-submit-puppy-inquiry.sh) —
  one-shot deploy script.

### Not changed in this PR

- `Allow public insert on puppy_inquiries` RLS policy is **still active**.
  PR 6 drops it after PR 5 confirms fail-closed behavior in production.
- `notify-puppy-inquiry` webhook is unchanged. It fires on the row insert
  (now performed by the service role) so the admin notification email is
  unaffected.
- All other entry points to `PuppyInterestForm` (Puppies page,
  PuppyDetailModal, etc.) automatically benefit because the change is
  inside the form component.

### Acceptance — to verify after deploy

- [ ] Submitting from `/contact?subject=puppy-inquiry` with a valid token
      succeeds and the admin notification email arrives.
- [ ] Submitting from a puppy detail modal / card → form succeeds and the
      `puppy_id`/`puppy_name`/`puppy_name_at_submit` fields are populated
      on the new row.
- [ ] Curl POST without a token → 403 `{"error":"Captcha verification
      failed","codes":["missing-input-response"]}`.
- [ ] Existing admin inbox + detail dialog flows still work.

---

## 6. Production verification checkpoint (PR 5)

Before any RLS removal (PR 6), each captcha gate must pass these checks
on production:

- [ ] `testimonials` — valid token → 200; missing token → 403.
- [ ] `contact_messages` — valid token → 200; missing token → 403.
- [ ] `puppy_inquiries` — valid token → 200; missing token → 403.
- [ ] `training_plan_submissions` — already production-verified 2026-04-25.

The "missing token" check should be done with a `curl POST` directly against
the edge function URL with an empty or malformed token, **not** by
fiddling with the browser form (which can't easily produce a missing-token
state because the submit button is disabled until the widget reports
success).

Each result should be appended to the verification log at the bottom of this
doc.

---

## 7. Wave 2.6 PR-5 — drop public INSERT RLS

Only ship after PR 5 is fully checked off.

### Plan

1. New migration `<timestamp>_remove_public_insert_form_tables.sql` that:
   - `DROP POLICY public_insert_testimonials ON testimonials;`
   - `DROP POLICY public_insert_training ON training_plan_submissions;`
   - `DROP POLICY "Allow public insert on contact_messages" ON contact_messages;`
   - `DROP POLICY "Allow public insert on puppy_inquiries" ON puppy_inquiries;`
2. Leave SELECT/UPDATE/DELETE policies alone.
3. Document rollback SQL inline (the four `CREATE POLICY` statements).
4. Verify each form's edge-function path still works (the service role
   bypasses RLS, so the writes continue from the new edge functions).
5. Verify a direct anon `from('<table>').insert(...)` from a browser console
   on `puppyheavenllc.com` now returns `42501 new row violates row-level
   security policy`.

### Risks

- If any non-edge-function code path still does a direct anon INSERT into
  one of these tables, this migration will silently break it. Grep
  `src/` for `from('<table>').insert` once more **immediately before**
  drafting the migration PR to confirm.
- Photo upload to `testimonial-photos` is a separate write through a
  storage policy, not table RLS — out of scope for this migration.

---

## 8. Wave 2.4 — `profiles` schema divergence

### What diverges

`supabase-schema.sql` lines 83-87:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('admin', 'public')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Migration [`20250208000000_consultation_puppy_flows.sql:57-63`](../../supabase/migrations/20250208000000_consultation_puppy_flows.sql):

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('admin', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

The two definitions are **structurally incompatible** (one has an `id` column,
the other doesn't). Both use `CREATE TABLE IF NOT EXISTS`, so whichever
runs first wins on a fresh database.

### Which shape is in production today

The fix migration
[`20260413000000_fix_rls_profiles_user_id.sql`](../../supabase/migrations/20260413000000_fix_rls_profiles_user_id.sql)
states (line 7):

> Bug: Migrations 20260410000000, 20260411000001-4 mistakenly used
> `profiles.id = auth.uid()` instead of `profiles.user_id = auth.uid()` in
> admin USING clauses. Since `profiles.id` is an auto-generated PK, the
> check always failed and admins could not access protected rows.

This is only consistent with the **migration shape** (`id` is a separate
auto-gen PK). In the schema.sql shape there is no `id` column at all and
those policies would have failed parsing rather than silently denying.

App code corroborates: `src/contexts/AuthContext.tsx:28` selects from
`profiles` by `user_id`, which works in both shapes — but the very existence
of the fix migration is hard evidence that production has the migration
shape.

### Why both files exist

Per the audit-roadmap decision (line 91):

> `supabase-schema.sql` was kept by decision, not deleted: migrations under
> `supabase/migrations/*.sql` only ALTER the base tables, never CREATE them,
> so this file is still the genuine fresh-DB bootstrap.

This is true for most tables. For `profiles` specifically, both the
bootstrap and migration `20250208000000` issue a `CREATE TABLE IF NOT
EXISTS`, so on a fresh `supabase db reset` whichever ran first creates the
table and the other becomes a silent no-op.

### Production shape (verified 2026-04-26 via Supabase MCP)

Query against project `xwudsqswlfpoljuhbphr`:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

Result:

| column_name | data_type | is_nullable | column_default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `role` | text | NO | `'public'::text` |
| `created_at` | timestamp with time zone | YES | `now()` |

Constraints in production: PK on `id` (`profiles_pkey`), UNIQUE on
`user_id` (`profiles_user_id_key`), FK on `user_id` → `auth.users(id)`
(`profiles_user_id_fkey`), CHECK on `role IN ('admin','public')`
(`profiles_role_check`). Indexes: `profiles_pkey` and
`profiles_user_id_key`. (The `idx_profiles_user_id` index added in
`20250209100000_admin_dashboard_setup.sql` was a no-op — the UNIQUE
constraint already creates an index on `user_id`.)

This is exactly the shape declared in
[`20250208000000_consultation_puppy_flows.sql:57-63`](../../supabase/migrations/20250208000000_consultation_puppy_flows.sql).
The previous `supabase-schema.sql` definition (with `user_id` as the PK
and no `id` column) was stale. Confirms Option A in the task brief.

### Fix landed

[`supabase-schema.sql`](../../supabase-schema.sql) `profiles` block updated
to mirror the migration exactly:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('admin', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

A short comment was added immediately above to record why the file mirrors
the migration shape (and to point at the `20260413000000_fix_rls_profiles_user_id`
incident as the reason this divergence matters).

No production schema change. No new migration. `supabase-schema.sql` is
**not** deleted (per Wave 2.4 decision).

### Acceptance for PR 8 — done

- [x] Production shape captured in this doc.
- [x] `supabase-schema.sql` updated to match production.
- [x] No destructive ALTER issued against the live `profiles` table.
- [x] `supabase-schema.sql` retained.

---

## 9. Wave 1.1 — credential rotation runbook

### Status

**Runbook published.** Rotation itself remains operator action.

### What landed

[`docs/security/credential-rotation-runbook.md`](credential-rotation-runbook.md) —
covers `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_DB_PASSWORD`, with for each secret:

- Where it lives and where it's consumed (every edge function, webhook
  header, env var, and admin-script reference enumerated).
- Step-by-step rotation procedure that **does not** require the operator
  to revoke the old key before confirming the new one works.
- Smoke-test list specific to the secret (e.g. service-role rotation
  triggers all four public form paths + all three notify-webhook paths
  + admin scripts).
- Failure-mode + recovery notes per secret.
- Explicit reminder that the three `notify-*` Database Webhook
  Authorization headers must be re-saved with any new service-role JWT
  before the old one is revoked (this is the same precondition as PR 7).

The runbook also enumerates **out-of-scope secrets** so future operators
have a single place to look when they become a concern
(`TURNSTILE_SECRET_KEY`, `CRON_SECRET`, `TWILIO_*`, `ANTHROPIC_API_KEY`,
`VITE_SUPABASE_ANON_KEY`).

### Acceptance — done

- [x] Runbook lives at `docs/security/credential-rotation-runbook.md`.
- [x] Each section names where to rotate, every consumer, smoke tests,
      and rollback steps.
- [x] No secret values are printed, requested, or committed.
- [x] The Wave 2.1 PR-B / webhook header coupling is called out
      explicitly so the operator doesn't break notifications during a
      service-role rotation.

---

## Production verification log

Append entries here as Dashboard checks and PR-level verifications complete.

- _2026-04-26: doc created (PR 1 discovery only — no behavior changed)._
- _2026-04-26: PR 2 (testimonials captcha) implemented in code. Deploy + production smoke pending._
- _2026-04-26: PR 3 (contact_messages captcha) implemented in code. Deploy + production smoke pending._
- _2026-04-26: PR 4 (puppy_inquiries captcha) implemented in code. Deploy + production smoke pending._
- _2026-04-26: PR 8 (profiles schema) — production shape verified via Supabase MCP `information_schema` query. `supabase-schema.sql` updated to mirror production (Option A). No production schema change._
- _2026-04-26: PR 9 (credential rotation runbook) — `docs/security/credential-rotation-runbook.md` published. Rotations themselves remain operator action._
