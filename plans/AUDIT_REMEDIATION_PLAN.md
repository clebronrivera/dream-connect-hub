# Audit Remediation Plan — 2026-04-22

Source: multi-agent audit (security, RLS, code wiring, public/private, privacy/compliance, build health).
Backlog lives in `.claude/memory/audit_2026_04_22.md`.

Organized into 7 waves. Each wave should be shippable on its own. Waves 1–2 are urgent; 3+ is backlog.

## Status — 2026-04-25
- **Wave 1.2**: ✅ shipped (PR #38).
- **Wave 1.3**: ✅ shipped (PR #39); smoke test is operational.
- **Wave 2.1 PR-A**: ✅ shipped (PR #44) — `send-pending-reminders` requires `X-Cron-Secret`; `finalize-agreement` validates JWT + admin role. **Before re-enabling reminders later**: (1) set `CRON_SECRET` in Supabase Edge Function secrets, (2) configure the scheduler/external caller to send `X-Cron-Secret`, (3) trigger one manual test run.
- **Wave 2.1 PR-B**: ⏸ deferred — webhook gates for `notify-deposit-request`, `notify-contact-message`, `notify-puppy-inquiry`. Holding until Supabase dashboard verifies all three database webhooks send the service-role JWT in `Authorization`.
- **Wave 2.3**: 🟡 partial — only `scripts/fix-rls-policies.js` deleted (PR #42). Other dangerous scripts and the admin-promotion rename are still open.
- **Wave 2.4**: 🟡 partial — dangerous root SQL files retired (PR #42). `supabase-schema.sql` was **kept by decision**, not deleted: migrations under `supabase/migrations/` only `ALTER` base tables, never `CREATE` them, so this file is still the genuine fresh-DB bootstrap.
- **Wave 2.5**: ✅ shipped (PR #43) as `20260425000000_fix_admin_dashboard_create_policy_syntax.sql` (renamed from the originally proposed `20260422010000_*`).

---

## Wave 1 — STOP-THE-BLEED (today)

Unblocks the public deposit flow + closes the two critical credential/audit-log leaks. No feature changes.

### 1.1 Rotate compromised credentials (USER ACTION — I can't do this)
- [ ] Revoke Airtable PAT `patp1OR9GSkOOksHb.*` at https://airtable.com/create/tokens → issue new scoped PAT (only needed if edge-function proxy still reads Airtable).
- [ ] Rotate Resend API key at https://resend.com/api-keys (current value duplicated/corrupted in `.env.local`).
- [ ] Rotate Supabase `service_role` JWT in Supabase dashboard → project settings → API.
- [ ] Rotate Postgres DB password (`SUPABASE_DB_PASSWORD`) in dashboard → project settings → database.
- [ ] Verify git history is clean (from a terminal):
  ```bash
  git log --all -p -- .env.local .env
  git log --all -p -S "patp1OR9GSkOOksHb"
  git log --all -p -S "aSw2YbswXBfDS4mm"
  git log --all -p -S "re_HTetVdE1"
  ```
  If any match, treat every secret as compromised and use `git filter-repo` to scrub.
- [ ] Update `.env.local` with the rotated values (single copy of the Resend key).
- [ ] Redeploy production so the old anon bundle stops shipping.

### 1.2 Remove Airtable PAT from the client bundle (CODE) — ✅ shipped (PR #38)
- [x] Grep for every `VITE_AIRTABLE_*` consumer in `src/`.
- [x] Airtable was retired: callers deleted and env var dropped (no proxy needed).
- [x] `.env.local` `VITE_AIRTABLE_API_KEY` → no longer required.
- [x] `npm run build` confirms the PAT no longer appears in `dist/assets/*.js`.

### 1.3 New migration: `20260422000000_fix_deposit_and_audit_rls.sql` — ✅ shipped (PR #39)
One migration, two fixes:
- [x] Added `public_insert_deposit_agreement` policy on `deposit_agreements`.
- [x] Dropped `system_insert_audit_log` policy on `agreement_audit_log`. Audit writes now require `service_role`.
- [ ] Smoke test on staging: confirm deposit submit creates the agreement row and the audit row is written by the function, not the anon client. _(operational — your call when to run)_

---

## Wave 2 — P1 security hardening (this week)

### 2.1 Edge function auth gates — ✅ PR-A shipped (PR #44), PR-B deferred
- [x] `supabase/functions/send-pending-reminders/index.ts`: requires `X-Cron-Secret` header equal to `Deno.env.get('CRON_SECRET')`. **Before re-enabling reminders**: (1) set `CRON_SECRET` in Supabase Edge Function secrets, (2) configure the scheduler/external caller to send `X-Cron-Secret`, (3) trigger one manual test run. (PR-A — confirmed no active scheduler at merge time, 2026-04-25.)
- [x] `supabase/functions/finalize-agreement/index.ts`: validates JWT via `supabase.auth.getUser(jwt)` and asserts `profiles.role='admin'` (same pattern as `send-deposit-link`). (PR-A)
- [ ] `supabase/functions/notify-*` (`notify-deposit-request`, `notify-contact-message`, `notify-puppy-inquiry`): set `verify_jwt=true` in `supabase/config.toml` once dashboard verifies all three webhooks send the service-role JWT. **PR-B — deferred pending Supabase dashboard verification.**

### 2.2 CORS lockdown
- [ ] Edit `supabase/functions/_shared/cors.ts`: replace `Access-Control-Allow-Origin: *` with an allowlist `[production URL, 'http://localhost:5173']` chosen by matching request `Origin` header.

### 2.3 Dangerous scripts — 🟡 partial
- [ ] Rename `scripts/make-all-auth-users-admin.sql` → `scripts/promote-specific-user-to-admin.sql`. Add header:
  ```sql
  -- WARNING: do not replace VALUES (...) with a SELECT id FROM auth.users.
  -- Promoting every auth user to admin grants read access to all customer PII.
  ```
- [ ] Delete (or move to `scripts/archive/`): `remove-sample-puppies.js`, `delete-test-upcoming-litter.js`, `seed-breeding-dogs-and-litters.js`, `assign-dam-sire-to-upcoming-litters.js`, `fix-litters-rls-policies.sql`, `run-litters-migration.sql`.
- [x] `scripts/fix-rls-policies.js` deleted (PR #42).

### 2.4 Repo-root SQL cleanup — 🟡 partial / scope adjusted
- [x] `supabase-puppies-table.sql` deleted (PR #42); the safe `CREATE TABLE IF NOT EXISTS puppies` bootstrap was consolidated into `supabase-schema.sql`.
- [x] `fix-rls-policies.sql` deleted (PR #42); its public-INSERT policies were duplicated in `supabase-schema.sql`.
- [ ] ~~Delete `supabase-schema.sql`~~. **Decision (2026-04-25): keep.** Verified that `supabase/migrations/*.sql` only `ALTER` the base tables — none of them `CREATE` them. The file is still the genuine fresh-DB bootstrap. The `profiles` shape divergence remains a known issue tracked separately.
- [x] `supabase/migrations/README_MIGRATION.md` and `BACKEND_CONTRACT.md` updated to drop references to the deleted files (PR #42).

### 2.5 Fix invalid Postgres syntax — ✅ shipped (PR #43)
- [x] New migration `20260425000000_fix_admin_dashboard_create_policy_syntax.sql` (renamed from the originally proposed `20260422010000_fix_admin_dashboard_policies.sql`) replaces the broken `CREATE POLICY IF NOT EXISTS` calls in `20250209100000_admin_dashboard_setup.sql:22,33` with `DROP POLICY IF EXISTS … ; CREATE POLICY …`. Original migration file left untouched per convention.

### 2.6 Public-insert tightening (captcha + length caps)
- [ ] Add hCaptcha or Turnstile to `testimonials`, `training_plan_submissions`, `contact_messages`, `puppy_inquiries` forms. Verify token server-side via edge function that then does the insert under service role (public INSERT policy can be dropped entirely after).
- [ ] Add `storage.objects` INSERT constraint on `testimonial-photos` bucket: `WITH CHECK (storage.extension(name) IN ('jpg','jpeg','png','webp'))` and a per-object size limit.

---

## Wave 3 — Data scoping (this sprint)

### 3.1 Replace `select('*')` on public queries
- [ ] `src/lib/puppies-api.ts:29`: explicit column allowlist (id, name, breed, gender, color, date_of_birth, age_weeks, ready_date, base_price, discount_*, final_price, status, photos, primary_photo, description, mom_weight_approx, dad_weight_approx, vaccinations, health_certificate, microchipped, featured, display_order, listing_date).
- [ ] `src/pages/Contact.tsx:37`: same allowlist.
- [ ] `src/lib/deposit-service.ts:122` (`payment_methods_config`): explicit columns.
- [ ] Sweep `src/lib/*-api.ts` for remaining `select('*')` on anon-reachable queries.

### 3.2 Missing profile policy
- [ ] In the Wave 2.5 migration (or new one): add `admin_read_profiles` SELECT policy so admin UIs can list admins.

---

## Wave 4 — Compliance (1–2 weeks)

### 4.1 Legal pages
- [ ] Create `src/pages/PrivacyPolicy.tsx` and `src/pages/TermsOfService.tsx`. Route at `/privacy` and `/terms` in `src/App.tsx`. Link from footer and from every form's consent line.
- [ ] Privacy Policy must cover: data categories (name, email, phone, address, IP, UA, signature, dog info), purposes, retention, third parties (Supabase, Resend, Anthropic for training-plan AI, Google Translate), right to access/delete, contact email.

### 4.2 Data deletion pathway
- [ ] Add `src/pages/PrivacyRequest.tsx` form → edge function that writes to a `privacy_requests` table (new migration).
- [ ] Internal SOP doc in `docs/` for admin: which tables to delete from for a given email (`deposit_requests`, `deposit_agreements`, `contact_messages`, `testimonials`, `training_plan_submissions`, `puppy_inquiries`, `agreement_audit_log`).

### 4.3 Inline health guarantee in deposit agreement
- [ ] `src/components/deposit/DepositForm.tsx:381`: replace "as detailed in the Pet Guide" with the full warranty scope (illness expiry, genetic expiry — values already in DB), duration, buyer obligations (e.g., vet visit within N days), remedies. Have legal review before ship.

### 4.4 State-specific pet dealer disclosures
- [ ] Capture `buyer_address` state, and when state ∈ {NY, CA, IL, PA, FL}, render the statute-required addendum block in `DepositForm` before signature. Persist a flag `state_disclosure_version` on `deposit_agreements`.

### 4.5 Retention
- [ ] Document retention in Privacy Policy (audit log 7 years for contract defense; training submissions 2 years; inquiries 3 years).
- [ ] Add a pg_cron job to purge `training_plan_submissions` older than retention.

---

## Wave 5 — Build / CI health (half a day)

### 5.1 Lockfile + deps
- [ ] `git rm bun.lockb`, add `bun.lockb` to `.gitignore`.
- [ ] Downgrade `eslint` and `@eslint/js` from `^10.x` to `^9` (v10 doesn't exist on npm). Verify `npm run lint` still passes.
- [ ] Run `npm audit --json` → triage criticals/highs; patch or pin.
- [ ] Replace or audit `react-signature-canvas@1.1.0-alpha.2` (unmaintained alpha used for legally-binding signatures).

### 5.2 CI
- [ ] Remove the `if: github.ref == 'refs/heads/main'` gate on the `build` job in `.github/workflows/ci.yml` so PRs actually build.
- [ ] Add `vitest --coverage` with a threshold (start at 0 to baseline, then raise).

### 5.3 Pre-commit and ship
- [ ] Add `lint-staged` running `eslint --fix` + `tsc --noEmit` on staged files in `.husky/pre-commit`.
- [ ] `scripts/ship.ts` lines 121–123: replace `git add -A` with explicit named paths or `git add -u` (tracked files only).

---

## Wave 6 — Code cleanup (1 day)

- [ ] Move `src/pages/PuppyCard.tsx`, `PuppyDetailModal.tsx`, `PuppyShareDialog.tsx` → `src/components/puppies/`. Update imports in `Puppies.tsx`.
- [ ] Delete empty `src/pages/admin/leads/` directory.
- [ ] Delete or move `Social_Media_Post_Mockups.html` from repo root.
- [ ] Fix `@ts-expect-error` in `src/lib/admin/deposit-requests-service.ts:168` using `instanceof FunctionsHttpError`.
- [ ] Add setTimeout cleanup in `src/components/deposit/PaymentMethodSelector.tsx:41`.
- [ ] Gate the `form.reset` effect in `src/pages/admin/puppies/PuppyForm.tsx:91` with a ref so it doesn't clobber edits.
- [ ] Remove `sourceToSearchParam` wrapper in `src/pages/admin/Dashboard.tsx:20`.
- [ ] Dedupe `upcomingRefundableRest` / `upcomingRefundableGeneric` i18n keys.
- [ ] Remove `optimizeDeps.force: true` from `vite.config.ts`.
- [ ] Extract `useLanguage` hook into `src/hooks/use-language.ts` (consistency with `use-auth.ts`).
- [ ] Add `scripts/**/*.js` to `eslint.config.js` ignores or give Node globals.

---

## Wave 7 — Hardening + polish (backlog)

- [ ] Add `SET search_path = public, pg_temp` to all `CREATE FUNCTION` statements in migrations (Supabase linter flag).
- [ ] Add a Vitest smoke test that queries `pg_policies` and asserts every non-public table has at least one admin policy referencing `profiles.user_id = auth.uid()`.
- [ ] `satisfies Record<Language, Record<TranslationKey, string>>` on the translations object so es/pt parity is enforced by the type checker.
- [ ] Consider `tseslint.configs.recommendedTypeChecked` for a stronger ESLint baseline.

---

## Execution order recommendation

1. Start with **Wave 1** end-to-end (keys + RLS fix). Get the deposit flow working again.
2. Then **Wave 5** in parallel while waiting for legal review on Wave 4 — build/CI hygiene is fast and low-risk.
3. Then **Wave 2** (security hardening) — highest security ROI, medium effort.
4. Then **Wave 3** (data scoping) and **Wave 6** (code cleanup) as separate small PRs.
5. **Wave 4** (compliance) needs legal eyes on the Privacy Policy and warranty copy — start drafting now, ship when reviewed.
6. **Wave 7** is polish, backlog it.

---

## What I can't do without you

- Rotating real credentials (Airtable, Resend, Supabase service-role, DB password).
- Verifying git history for leaked secrets (needs terminal access outside the sandbox).
- Drafting legally-reviewed warranty and privacy copy (should go past a lawyer).
- Deciding the Airtable retirement question (keep+proxy vs delete).
- Production deploys after Wave 1.
