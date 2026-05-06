# Dream Connect Hub — Audit, Cleanup & Workflow Completion Plan

## Context

The May 5 Cowork handoff doc (`local_be449291-.../outputs/CLAUDE.md`) describes Dream Connect Hub as a 13-step reservation workflow (DRAFT → SUBMITTED → OPERATOR_REVIEW → APPROVED → AWAITING_PAYMENT → PAYMENT_CONFIRMED → AGREEMENT_FINALIZED → ACTIVE_RESERVATION) and treats the project as if little had been built. **Reality:** the codebase is far more developed — full Vite + React + TS + Supabase app with 47 migrations, 16 edge functions, branded email templates, RLS hardening waves in flight, and most of the core workflow already wired.

The audit (3 parallel Explore agents + verification reads + live-DB introspection) surfaced four classes of work:

1. **Drift between code and the canonical CLAUDE.md spec** — most importantly the deposit-amount calculation (code: fractional 1/4 + 1/3 tiers; spec: flat $300).
2. **Drift between live RLS policies and migrations** — two policies exist in production that no migration created. See "Live policy audit" below.
3. **Stale artifacts** — loose mockups/PDFs at the repo root, superseded docs, dead scripts/configs, dead local tooling folders.
4. **Missing workflow pieces** — buyer payment dashboard (Step 9), structured operator review form (Step 8), finalized-PDF generation (Step 11), and the entire chargeback-defense / identity-capture / pickup-handover layer (Wave H).

User decisions (locked in):
- **Deposit model:** flat $300 default + per-puppy / per-litter override.
- **Form access:** `/deposit` token-gated to operator-issued links only.
- **PDF generation:** in scope; JS Edge Function with `pdf-lib`.
- **Security wave deploys (2.1, 2.2, 2.6 PR-2/3/4):** out of scope; tracked separately.
- **Buyer access model:** dedicated `buyer_access_token` (uuid) with 30-day expiration, not the agreement UUID.
- **Driver's license at deposit time:** out of scope. Replaced with `buyer_age_attestation_at`.
- **Pickup-day ID verification:** in scope (Wave H4) — last-4 + state + expiration confirmation only, never full DL number.
- **`buyer_signed` enum value drift:** Option B — remove the unused enum value rather than widen the INSERT policy.
- **Chargeback-defense layer (Wave H):** in scope; folded into this plan.

This plan ships in eight sequential waves (A–H). **Run waves sequentially.** Several waves touch overlapping files; do not parallelize.

---

## Audit findings

### P1 — Committed-secrets audit ✅ CLEAN
- `git log -p --all` matched only:
  - One JWT-shaped string in `src/lib/supabase.ts` history. Decoded: `{"iss":"supabase","ref":"xwudsqswlfpoljuhbphr","role":"anon",…}` — the **anon key**, public by design, documented in `.gitleaksignore`.
  - `package-lock.json` `sha512-…==` integrity hashes.
  - Documentation references in `docs/security/credential-rotation-runbook.md` (env var names, no values).
- No service-role JWT, no `re_…`, no `sk_live`/`sk_test`, no `AKIA…`, no `BEGIN PRIVATE`.
- No `.env`/`.env.local` ever committed.
- **Conclusion:** no secret rotation needed.

### P2 — Committed contract-PII audit ✅ CLEAN
- `git log --all --full-history -- "*Chloe*" "Contrato_*" "Email_Bienvenida_*" "Guia_NuevoDueno_*"` returned nothing. `git ls-files` returned nothing.
- `.gitignore` has `*.pdf` rule that would block accidental commit.
- **Conclusion:** no Git history purge. The original plan's instruction to *move* into `docs/contracts-executed/` would have been the *first* commit. Files are removed from the working tree to private storage outside the repo (Wave A4).

### Live policy audit (corrected — user was right)

`SELECT polname, polcmd, polqual, polwithcheck FROM pg_policy WHERE polrelid = 'public.deposit_agreements'::regclass` returned **four** policies, not two. The two extra are not present in any migration:

| Policy | Cmd | Source | Concern |
|---|---|---|---|
| `admin_all_deposit_agreements` | ALL | [20260410000000:208](supabase/migrations/20260410000000_deposit_workflow.sql:208) | Correct. |
| `public_insert_deposit_agreement` (singular) | INSERT | [20260422000000:32](supabase/migrations/20260422000000_fix_deposit_and_audit_rls.sql:32) | Correct — locks initial state to `agreement_status='sent'` and every admin/PDF/payment field NULL. |
| **`public_insert_deposit_agreements` (plural)** | INSERT | **NOT IN ANY MIGRATION** | Permissive: `agreement_status IN ('sent','buyer_signed')`, fewer NULL constraints. Lets a stranger insert a row claiming `buyer_signed`. **Must drop** in Wave A6. |
| **`public_read_recent_deposit_agreements`** | SELECT | **NOT IN ANY MIGRATION** | Public reads any row inserted in the last 60 seconds — leaks buyer PII for one-minute windows. **Must drop** in Wave A6 + replace with token-based SELECT in Wave D. |

Postgres RLS uses OR across permissive policies, so the permissive plural policy currently wins over the strict singular one. **Wave A6 is no longer "defensive — possibly no-op";** it actively closes two real holes.

### Live-data findings
- `puppies.status` distinct values: `Sold` (16), `Available` (10). Only two. **No normalization needed** in Wave A; just document them in `docs/status-enums.md`. The transition to `Reserved` will be wired by Wave G when an agreement reaches `complete`.
- `deposit_agreements` row count: 0. Safe to drop columns directly without backfill.
- `deposit_requests` row count: 8. Real test data; preserve.

---

## Preconditions (must complete before Wave A starts; verify before each subsequent wave)

| # | Description | Status | Owner |
|---|---|---|---|
| P1 | Audit Git history for committed secrets | ✅ Done — clean | n/a |
| P2 | Audit Git history for executed-contract PII | ✅ Done — clean | n/a |
| P3 | Confirm PDF templates are blank (no real buyer data, signatures, AcroForm fields) before copying into `supabase/functions/_shared/pdf/templates/` | ⏳ Required before Wave F | User (visual review) |
| P4 | Drop driver's license from deposit form; replace with 18+ attestation | 📝 Encoded into Wave E | n/a |
| P5 | Approve `docs/status-enums.md` content | ⏳ Drafted in §P5 below; approve before A1 writes the file | User |
| P6 | Author `supabase/functions/_shared/pdf/depositAgreementFieldMap.ts` with `assertAllFieldsPresent` | 📝 Encoded into Wave F2 | Claude |
| P7 | Confirm PostgREST exposes request headers to RLS via `current_setting('request.headers', true)` in this Supabase project tier; build a 10-line proof-of-concept against staging before any Wave D code lands | ⏳ Required before Wave D | Claude (POC), user (run) |
| P8 | Confirm migration filename slot availability (`20260506000000`–`20260509000000`) — bump if anything else lands today | 📝 Verify at start of each migration-bearing wave | Claude |
| P9 | Add a stable copy of CLAUDE.md to the repo at `docs/spec/dream-connect-hub.md` with explicit supersession comments for the deposit-tier model and driver's-license decisions | 📝 Encoded into Wave A7 | Claude |

### P5 — Draft `docs/status-enums.md` (for approval)

```markdown
# Status enum source of truth

This file is the canonical list of allowed values for every status column in
the reservation workflow. All TypeScript types, RLS policies, edge functions,
and documentation must agree with this file. Update *here first*, then
propagate.

## deposit_requests.request_status
- pending — buyer submitted /request-deposit; operator has not reviewed.
- accepted — operator clicked Accept in OperatorReviewForm. Puppy/price/deposit captured. Link not yet emailed.
- deposit_link_sent — operator clicked Send Deposit Link. send-deposit-link emailed the URL with ?requestId=… .
- converted — buyer submitted the formal agreement, creating a deposit_agreements row with deposit_request_id set. Set by trigger link_deposit_agreement_to_request, not by client UPDATE.
- declined — operator declined. decline_reason populated. Terminal.

State diagram:
  pending → accepted → deposit_link_sent → converted (terminal)
  pending → declined (terminal)
  accepted → declined (terminal)

## deposit_agreements.agreement_status
- sent — row created by buyer submission. buyer_signed_at set on insert. Initial state — NEVER transitioned to "buyer_signed" (that value was removed; see Wave A5).
- admin_approved — finalize-agreement edge function set admin_approved_at after verifying buyer_signed_at + admin_signed_at + deposit_status='admin_confirmed'.
- complete — set after generate-agreement-pdf wrote signed_pdf_storage_path and the buyer email was sent. Terminal happy-path state.
- cancelled — operator voided. Terminal.

## deposit_agreements.deposit_status
- pending — initial. Awaiting payment confirmation.
- admin_confirmed — operator marked payment received via /admin/agreements.
- rejected — operator rejected within the 48-hour breeder window. Terminal.
- refunded — operator processed an explicit refund. Terminal.

## puppies.status
- Available — listed publicly, accepting deposits. (Title-case is the existing convention.)
- Reserved — has an active non-terminal deposit_agreement. Set when an agreement reaches `complete`. Cleared on agreement cancellation.
- Sold — picked up. Terminal.
(Confirmed against live DB: only "Available" and "Sold" exist today; "Reserved" is added by the workflow.)

## final_sales.final_payment_status
- pending — balance not yet collected.
- admin_confirmed — operator marked balance received.

## payment_attestations.attestation_status (Wave H1)
- draft — buyer started the attestation form.
- signed — buyer completed and signed the attestation. Required before mark-payment-sent fires.

## pickup_handovers.handover_status (Wave H4)
- scheduled — pickup window opened.
- in_person_verified — operator confirmed buyer ID, photos uploaded, signatures captured. Terminal.
```

---

## Wave A — Critical Drift + Repo Cleanup (one PR)

### A1. Author `docs/status-enums.md`
Create the file with the §P5 content (verbatim, after user approval).

### A2. Retire fractional deposit tier; standardize on flat $300 + override
`deposit_agreements` has 0 rows — drop the column directly.

Files to change:
- [src/lib/constants/deposit.ts](src/lib/constants/deposit.ts) — replace `DEPOSIT_TIERS` with `DEFAULT_DEPOSIT_AMOUNT = 300`. Drop `PRE_8_WEEKS`/`POST_8_WEEKS`. Keep `PUPPY_GO_HOME_AGE_DAYS = 56`.
- [src/lib/utils/depositCalc.ts](src/lib/utils/depositCalc.ts) — delete `getDepositTier()`, `getDepositExplanation()`. Replace `calculateDepositAmount` with `resolveDepositAmount({ puppyOverride, litterOverride })` returning `puppyOverride ?? litterOverride ?? DEFAULT_DEPOSIT_AMOUNT`. Keep `calculateBalanceDue`, `getEarliestPickupDate`, `getPickupClockStart`, `getPickupDeadline`, `isValidPickupDate`, `generatePaymentMemo`, `generateAgreementNumberPreview`.
- [src/lib/utils/depositCalc.test.ts](src/lib/utils/depositCalc.test.ts) — delete tier tests; add override-precedence tests.
- [src/components/deposit/DepositForm.tsx](src/components/deposit/DepositForm.tsx) — lines 107–154 + 186 + 218: replace `purchasePrice * tier.fraction` with `resolveDepositAmount(...)`. Drop `deposit_tier` from payload.
- [src/components/deposit/DepositSummary.tsx](src/components/deposit/DepositSummary.tsx) — remove `1/4`/`1/3` labels; show `Deposit: $X` plus `(custom for this puppy)` badge when override applies.
- [src/lib/deposit-service.ts](src/lib/deposit-service.ts) — drop `deposit_tier` from `CreateDepositPayload`.
- [src/pages/admin/AgreementsPage.tsx](src/pages/admin/AgreementsPage.tsx) — strip references.
- New `supabase/migrations/20260506000000_drop_deposit_tier_column.sql`:
  ```sql
  ALTER TABLE deposit_agreements DROP COLUMN deposit_tier;
  COMMENT ON COLUMN deposit_agreements.deposit_amount IS
    'Flat $300 default; overridden per-puppy/per-litter via puppies.deposit_amount or upcoming_litters.deposit_amount.';
  ```

### A3. Fix branding & README drift
- [README.md](README.md) — line 1: `# Dream Puppies — puppyheavenllc.com`. Line 7: `cd dream-enterprises-puppy-heaven`. Strip "Dream Connect Hub" from user-facing copy. Internal repo name retained.
- Re-grep `src/`, `public/`, `index.html` for `Dream Connect`, `Dream Litter`, `Puppy Heaven LLC`, `Dream Puppies LLC` — confirm zero hits after edits.
- Move `DreamLitter_PuppyPurchaseAgreement.pdf` → outside-repo private storage (filename violates branding).

### A4. Delete dead code, scripts, root cruft

Delete from working tree:
- `Form_Mockups_All_Templates.jsx` (root, 69 KB).
- `Form_Mockups_Mobile.html` (root, 64 KB).
- `.lovable/`, `scratch/`, `--version/` — empty/abandoned.
- `.~lock.Dream_Enterprises_Financial_Projections.xlsx#` — stale lock.
- `scripts/setup-database.js` — calls non-existent `exec_sql` RPC.
- All `.DS_Store`: `find . -name '.DS_Store' -delete`.

**Archive (do not delete, do not commit elsewhere in repo):**
- `supabase-schema.sql` — move to `archive/supabase-schema-2026-05.sql` *outside the repo* (private storage), then delete from working tree. Keeps a debugging artifact without leaving a stale schema dump in-repo. Note in `supabase/migrations/README_MIGRATION.md` where the archive lives.
- `docs/TECHNICAL_AUDIT_REPORT.md` — move to outside-repo archive, then delete in-repo.
- `docs/DEVELOPMENT_LOG.md`, `docs/DEVELOPMENT_TRACKING.md` — same treatment.

**Move OUT of the repo entirely (private storage at `~/Documents/Dream Enterprises Puppy Heaven LLC - Private/`):**
- `Contrato_Chloe_*.pdf`, `Email_Bienvenida_Chloe_*.pdf`, `Guia_NuevoDueno_Chloe_*.pdf` — executed customer contracts.
- `Dream_Enterprises_Business_*.docx`, `Dream_Enterprises_Financial_Projections.xlsx`.
- `PLANTILLA_*.pdf`, `TEMPLATE_PuppyPurchaseAgreement_DreamPuppies.pdf` — legacy templates.

### A5. Resolve `agreement_status='buyer_signed'` drift — Option B

Remove the unused `buyer_signed` enum value. INSERT stays locked to `'sent'`. The lifecycle marker is `buyer_signed_at` (timestamp), not status.

- New `supabase/migrations/20260506000002_drop_buyer_signed_status.sql`:
  ```sql
  ALTER TABLE deposit_agreements
    DROP CONSTRAINT IF EXISTS deposit_agreements_agreement_status_check;
  ALTER TABLE deposit_agreements
    ADD CONSTRAINT deposit_agreements_agreement_status_check
    CHECK (agreement_status IN ('sent','admin_approved','complete','cancelled'));
  ```
  (Safe — 0 existing rows have `agreement_status='buyer_signed'`; we already verified.)
- [src/types/deposit.ts:30](src/types/deposit.ts:30) — drop `'buyer_signed'` from the union.
- Search `src/` and `supabase/functions/` for any remaining reference to `'buyer_signed'`; remove.
- `finalize-agreement` already gates on `buyer_signed_at` (timestamp), not status. Confirm no behavioral change.

### A6. Drop the two out-of-migration RLS policies (CONFIRMED hot)

Live DB has both `public_insert_deposit_agreements` (plural, permissive INSERT allowing `buyer_signed`) and `public_read_recent_deposit_agreements` (60-second public SELECT window). Neither is in any migration; both must be dropped now. The token-based public SELECT replacement lands in Wave D — until then, public SELECT on `deposit_agreements` is admin-only.

New `supabase/migrations/20260506000001_drop_out_of_band_policies.sql`:
```sql
DROP POLICY IF EXISTS public_insert_deposit_agreements ON deposit_agreements;
DROP POLICY IF EXISTS public_read_recent_deposit_agreements ON deposit_agreements;
COMMENT ON TABLE deposit_agreements IS
  'Public INSERT only via public_insert_deposit_agreement (singular, locked initial state). Public SELECT is added by Wave D via a buyer-token RLS policy. Operator/admin path uses admin_all_deposit_agreements.';
```

After this migration, the public deposit submission flow needs to verify it still works (the singular `public_insert_deposit_agreement` policy already covers it; the plural one was permissive overlap, not load-bearing). The "show success card with agreement_number after submit" path in [DepositForm.tsx:245](src/components/deposit/DepositForm.tsx:245) currently relies on the INSERT returning the row — that uses the writer's own row visibility, not the SELECT policy, so it survives the drop. Confirm with a manual smoke test.

### A7. Add stable spec doc + retire stale docs

- New `docs/spec/dream-connect-hub.md` — copy of CLAUDE.md from the Cowork session, with a header block:
  ```
  > **Supersessions (May 2026):**
  > - Deposit amount: original spec said 1/4 or 1/3 of purchase price. **Replaced by flat $300 + per-puppy/per-litter override.** See docs/status-enums.md and Wave A2 of the completion plan.
  > - Driver's license collection at deposit time: original Step 7 included DL number. **Removed.** Replaced with `buyer_age_attestation_at`. Pickup-day ID verification (last-4 + state + expiration) is in Wave H4.
  ```
- Delete (after archiving outside the repo per A4):
  - `docs/DEVELOPMENT_LOG.md`
  - `docs/DEVELOPMENT_TRACKING.md`
  - `docs/TECHNICAL_AUDIT_REPORT.md`
  - `docs/TRANSLATIONS_PUBLIC_SITE.md`
  - `docs/LOCAL_NOTES.md`
  - `docs/PLAN_GOLDENDOODLE_NAMES_DESCRIPTIONS.md`
- **Do NOT** rewrite `docs/DEPOSIT_REQUEST_FLOW.md` here — that rewrite is deferred to Wave G2 once the final flow exists.
- Update [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md) — append section for `deposit_agreements`, `deposit_requests`, `final_sales`, `payment_methods_config` and the 16 current edge functions.
- Update `docs/DOCUMENTATION_INDEX.md` — refresh.
- Update README.md links — point at `wave-status.md` and `docs/security/wave-2-pending-hardening.md` instead of the deleted `TECHNICAL_AUDIT_REPORT.md`. Add link to `docs/spec/dream-connect-hub.md`.

### A8. Migration hygiene
- Document the duplicate `20250308000000_rename_goldendoodle_*` and `20250308100000_rename_golden_doddle_*` pair in `supabase/migrations/README_MIGRATION.md` (typo-fix pair, intentional, no consolidation).
- Verify migration slot availability (P8) before pushing.

**Verification for Wave A:**
- `npm run check` passes.
- `npm run build` passes.
- `npm run db:push` applies cleanly to staging.
- After push, re-run the live policy query — only `admin_all_deposit_agreements` and `public_insert_deposit_agreement` remain on `deposit_agreements`.
- Manual: load `/`, `/puppies`, `/request-deposit`, `/admin/deposit-requests`, `/admin/agreements`. Submit a `/request-deposit` end-to-end. Submit a `/deposit?puppyId=…` (still public until Wave B) end-to-end and confirm it persists.
- Grep confirms no remaining `1/4 Rate`, `1/3 Rate`, `getDepositTier`, `DEPOSIT_TIERS`, `pre_8_weeks`, `post_8_weeks`, `'buyer_signed'`, or `Dream Connect Hub` (user-facing) in `src/` or `public/`.

---

## Wave B — Token-gate `/deposit` (one PR, follows A)

The plumbing is half-built: [src/lib/deposit-service.ts:78](src/lib/deposit-service.ts:78) has `validateDepositRequest`; [src/components/deposit/DepositForm.tsx:54](src/components/deposit/DepositForm.tsx:54) accepts `requestId?: string`; `deposit_requests.deposit_link_url` is populated; the `deposit_link_sent` status is the gate.

The `requestId` is the deposit-request UUID (122 bits of entropy, only handed to the buyer via email after operator approval). Adequate as a one-time token. The buyer-side payment dashboard in Wave D uses a *separate*, expiring `buyer_access_token`.

### B1. Enforce gate in page wrapper
- [src/pages/DepositAgreement.tsx](src/pages/DepositAgreement.tsx) — read `requestId` from `useSearchParams()`. If absent → render "Operator-only entry — please start at /request-deposit". If present, call `validateDepositRequest(requestId)`. Specific message per `reason`. Pass validated `requestId` (and the request's `puppyId`/`litterId`) into `<DepositForm requestId={...} … />`.
- Show a "Reservation #DEP-…" banner on the form when `requestId` is set.

### B2. Update `send-deposit-link`
- [supabase/functions/send-deposit-link/index.ts](supabase/functions/send-deposit-link/index.ts) — confirm URL stored in `deposit_requests.deposit_link_url` and emailed is `${PUBLIC_SITE_URL}/deposit?requestId={uuid}` (env fallback `https://puppyheavenllc.com`). Email template renders the URL as a CTA button.

### B3. Update internal admin link generators
- [src/components/admin/DepositRequestDetailPanel.tsx](src/components/admin/DepositRequestDetailPanel.tsx) — append `?requestId=...` if missing when displaying the deposit link.

### B4. Tests
- New `src/pages/DepositAgreement.test.tsx` covering all gate states.
- New `src/lib/deposit-service.test.ts` for `validateDepositRequest`.

**Verification for Wave B:**
- Hit `/deposit` (no params) → gating landing page.
- Hit `/deposit?requestId=<random-uuid>` → "Request not found".
- Operator accepts → Send Deposit Link → buyer receives email → link opens form populated with that request's puppy/litter context.
- Submitting the form converts the request via `link_deposit_agreement_to_request` trigger.

---

## Wave C — Structured Operator Review Form (Step 8) (one PR, follows B)

### C1. New component `OperatorReviewForm`
- New file `src/components/admin/OperatorReviewForm.tsx`. Replaces inline accept-flow inside `DepositRequestDetailPanel.tsx`.
- Fields: `puppy_id` (select existing puppies of the requested litter, or hand off to `PuppyForm` to create), `purchase_price` (required), `deposit_amount` (default `DEFAULT_DEPOSIT_AMOUNT = 300`, editable for override), `confirmed_pickup_date` (optional override), `notes_to_buyer` (optional).
- On submit: persists `purchase_price` and `deposit_amount` to the puppy row (or upcoming-litter slot), updates request status to `accepted`, exposes "Send Deposit Link Now" button that triggers `sendDepositLink()` → `deposit_link_sent`.

### C2. Wire into detail panel
- [src/components/admin/DepositRequestDetailPanel.tsx](src/components/admin/DepositRequestDetailPanel.tsx) — replace "Accept" button with "Open Review Form". Decline path unchanged.

### C3. Schema check
- `puppies.deposit_amount`, `puppies.base_price`, `upcoming_litters.deposit_amount` already exist (verified [src/lib/deposit-service.ts:118-138](src/lib/deposit-service.ts:118)). No migration needed.

**Verification for Wave C:** operator opens pending request, fills form, submits → puppy row gets `purchase_price`+`deposit_amount`, request → `accepted`, email triggered with link → buyer's `/deposit?requestId=...` shows correct (overridden) deposit amount.

---

## Wave D — Buyer Payment Dashboard with `buyer_access_token` (Step 9) (one PR, follows C)

### Precondition P7: PostgREST header-passthrough proof of concept

Before any Wave D code lands, run a 10-line PoC against staging to confirm the policy pattern works on this Supabase project:

```sql
-- staging only
ALTER TABLE deposit_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY tmp_token_test ON deposit_agreements FOR SELECT TO anon
  USING (
    buyer_access_token::text =
      current_setting('request.headers', true)::json->>'x-buyer-token'
  );
-- Then from a client with the global header set:
const c = createClient(URL, ANON_KEY, { global: { headers: { 'x-buyer-token': '<known-token>' } } });
const { data } = await c.from('deposit_agreements').select('*');
```

If `current_setting('request.headers', true)` returns NULL (PostgREST not configured to expose them on this tier), fall back to the alternate design: a custom edge function `get-agreement-by-token` (public, no JWT) that validates the token server-side using the service role and returns the row. Decision before Wave D ships.

### D1. Schema + RLS migration

New `supabase/migrations/20260507000000_buyer_access_token.sql`:
```sql
ALTER TABLE deposit_agreements
  ADD COLUMN buyer_access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN buyer_access_token_expires_at timestamptz NOT NULL
    DEFAULT (now() + interval '30 days'),
  ADD COLUMN buyer_marked_payment_sent_at timestamptz;

CREATE INDEX idx_deposit_agreements_buyer_access_token
  ON deposit_agreements(buyer_access_token);

-- (Defensive: A6 already dropped this; repeat in case it was reintroduced.)
DROP POLICY IF EXISTS public_read_recent_deposit_agreements ON deposit_agreements;

-- Token-based public SELECT, expiration-checked.
CREATE POLICY public_read_via_buyer_token ON deposit_agreements
  FOR SELECT
  USING (
    buyer_access_token::text =
      current_setting('request.headers', true)::json->>'x-buyer-token'
    AND buyer_access_token_expires_at > now()
  );
```
No public UPDATE policy — buyer writes go through the `mark-payment-sent` edge function (D3) running as service-role.

### D2. Route, redirect, scoped Supabase client
- Route `/payment/:agreementId/:buyerToken` (in [src/App.tsx](src/App.tsx)). New page `src/pages/PaymentDashboard.tsx`.
- After `submitMutation.onSuccess` ([src/components/deposit/DepositForm.tsx](src/components/deposit/DepositForm.tsx)), redirect to `/payment/{agreementId}/{buyer_access_token}` (update `submitDepositAgreement` to `.select()` the new columns).
- `PaymentDashboard` constructs a one-shot client with `x-buyer-token` global header bound to the URL token, then SELECTs the agreement. RLS gates.
- Page displays: deposit amount, payment handle for chosen method (from `payment_methods_config`), payment memo (`generatePaymentMemo()`), Wave H1 attestation form (gates the action button), then the "I have sent payment" button.
- States: not found / token expired / already marked sent.

### D3. Single edge function `mark-payment-sent`
New `supabase/functions/mark-payment-sent/index.ts`:
1. Public function (no JWT). Reads `{ agreement_id, buyer_access_token }` from body.
2. Calls new shared helper `verifyBuyerToken(supabase, agreement_id, buyer_access_token)` → returns the agreement row or 403.
3. **Gate (Wave H integration):** verifies `payment_attestations.attestation_status = 'signed'` exists for this agreement, both screenshots are present, and `transaction_reference_id` is set. If not, return 422 with which precondition failed. (See Wave H1/H2 for the table.)
4. Updates `buyer_marked_payment_sent_at = now()` only if currently NULL and `agreement_status = 'sent'` and `deposit_status = 'pending'`.
5. Sends admin email "Buyer says payment sent for #DP-…" via `_shared/email/send.ts` + new template `adminBuyerMarkedPaymentSent`.
6. Idempotent — repeat calls after the first are no-ops on email send.

### D4. Update buyer email CTA + token-longevity copy
- [supabase/functions/notify-deposit-request/index.ts](supabase/functions/notify-deposit-request/index.ts) (and any other relevant template) — include `/payment/{agreementId}/{buyerToken}` URL as CTA.
- Email copy: "This link is active for 30 days. After that, contact us at (321) 697-8864 to reissue."

### D5. Shared helper `verifyBuyerToken`
- New `supabase/functions/_shared/auth/verifyBuyerToken.ts` — validates `(agreement_id, buyer_access_token)` pair against `deposit_agreements`, checks expiration, returns row or `{ ok:false, status, body }`. Used by `mark-payment-sent`, `agreement-download-url` (Wave F6), all Wave H functions.

**Column-name discipline:** `buyer_marked_payment_sent_at` everywhere — no aliases.

**Verification for Wave D:**
- Submit deposit form → auto-redirect to `/payment/<id>/<token>`.
- Page shows correct method + handle + memo.
- Click "I have sent payment" before completing H1 attestation → 422; UI surfaces the missing step.
- After H1 complete, click again → button disables, status updates, admin gets one email.
- Visiting `/payment/<id>/<wrong-token>` → "not found / unauthorized".
- Visiting after token expiry → "link expired; contact us" state.
- Direct `mark-payment-sent` call with mismatched token → 403.

---

## Wave E — Schema completeness for spec field map + contract clauses (one PR, follows D)

### E1. Migration `supabase/migrations/20260508000000_deposit_agreement_field_completeness.sql`

Add columns to `deposit_agreements`:
- `buyer_city text`, `buyer_state text`, `buyer_zip text` — promoted from `buyer_address`.
- `how_heard text`, `how_heard_referral_name text`, `how_heard_other_text text` — promoted from `deposit_requests`.
- `pickup_time_preference text` (CHECK ∈ `morning|afternoon|evening`), `pickup_day_preference text` (CHECK ∈ `weekday|weekend|either`), `pickup_alt_date date`, `pickup_alt_time text`, `pickup_alt_day text`, `pickup_notes text`.
- **No `driver_license_number`. No `buyer_dob`.**
- New ack timestamps for the H6 clauses below: `ack_age_attestation_at`, `ack_payment_authorization_at`, `ack_identity_attestation_at`, `ack_pre_dispute_contact_at`, `ack_pickup_acceptance_at`, `ack_florida_venue_at`. All `timestamptz` nullable.
- `ack_*_at` columns from existing form (`ack_full_agreement_at`, `ack_statutory_rights_at`, `ack_esign_valid_at`, `ack_genetic_disclaimer_at`, `ack_arbitration_at`, `ack_age_accuracy_at` (RENAME or drop — superseded by `ack_age_attestation_at`), `ack_welfare_responsibility_at`) — confirm they exist; add if missing.

### E2. Update form, Zod schema, types, service
- [src/components/deposit/DepositForm.tsx](src/components/deposit/DepositForm.tsx) — extend Zod schema, add the H6 clause checkboxes (each separately timestamped), the city/state/zip fields, the pickup-detail fields, the 18+ attestation. Drop the existing `age_accuracy` ack (replaced by `ack_age_attestation_at`).
- [src/types/deposit.ts](src/types/deposit.ts) — extend `DepositAgreement` and `CreateDepositPayload`.
- [src/lib/deposit-service.ts](src/lib/deposit-service.ts) — pass new fields through.

### E3. H6 contract clauses (added to the rendered "Agreement Terms" block + as separate acks)

Append to the `<div>` containing agreement terms in `DepositForm.tsx`:
- **Payment authorization:** "I authorize a deposit payment of $[amount] to Dream Enterprises LLC (DBA Dream Puppies) via [method]. The payment handle/account I will use is in my legal name." → checkbox `ack_payment_authorization_at`.
- **Identity attestation:** "I confirm the name, address, phone, and email I have provided match my legal identification, and I will present matching photo ID at pickup." → checkbox `ack_identity_attestation_at`.
- **Pre-dispute contact requirement:** "Buyer agrees to contact Dream Puppies at (321) 697-8864 to attempt resolution before initiating any payment dispute, chargeback, or bank reversal. Failure to attempt resolution constitutes breach." → checkbox `ack_pre_dispute_contact_at`.
- **Pickup acceptance clause:** "Signing the pickup handover document at the time of physical delivery constitutes final acceptance of the puppy and waives any claim of non-delivery or non-receipt." → checkbox `ack_pickup_acceptance_at`.
- **Florida venue clause:** "Disputes are resolved under Florida law in Orange County courts." → checkbox `ack_florida_venue_at`. **Confirm with attorney before deploy** — note in the wave PR.

Three explicit non-refundable acknowledgments at three points of the form (intro / before signature / after signature) — reuse the existing `ack_arbitration_at` + `ack_genetic_disclaimer_at` + `ack_welfare_responsibility_at` style; ensure each has its own `at` timestamp.

**Verification for Wave E:**
- Submit form with every field populated → row in `deposit_agreements` has every value; every `ack_*_at` is its own distinct timestamp.
- Existing data isn't broken (all new columns nullable; no NOT NULL backfill).

---

## Wave F — Finalized PDF generation via pdf-lib edge function (one PR, follows E)

### F1. Confirm template blankness (P3) and embed
After visual review confirms the two PDFs in `~/Documents/Dream Enterprises Puppy Heaven LLC/Agreements and Contracts/` contain no real buyer data and only empty AcroForm fields, copy them into:
- `supabase/functions/_shared/pdf/templates/deposit_agreement_template.pdf`
- `supabase/functions/_shared/pdf/templates/purchase_agreement_template.pdf`

Read via `Deno.readFile(new URL("./templates/deposit_agreement_template.pdf", import.meta.url))`.

### F2. Field-map module (P6)

New `supabase/functions/_shared/pdf/depositAgreementFieldMap.ts`:
```ts
import type { PDFForm } from "https://esm.sh/pdf-lib@1.17.1";

export const DEPOSIT_AGREEMENT_FIELD_MAP = {
  buyer_name: "buyer_name",
  buyer_email: "buyer_email",
  // … every field from CLAUDE.md spec map …
} as const satisfies Record<string, string>;

export function assertAllFieldsPresent(form: PDFForm): void {
  const onTemplate = new Set(form.getFields().map((f) => f.getName()));
  const missing = Object.values(DEPOSIT_AGREEMENT_FIELD_MAP).filter(
    (n) => !onTemplate.has(n)
  );
  if (missing.length > 0) {
    throw new Error(
      `PDF template missing AcroForm fields: ${missing.join(", ")}. ` +
      `Update the template or the field map.`
    );
  }
}
```

### F3. Extract shared admin-auth helper

New `supabase/functions/_shared/auth/verifyAdmin.ts` containing the JWT+profile-role check currently inlined at [supabase/functions/finalize-agreement/index.ts:25-66](supabase/functions/finalize-agreement/index.ts:25). Refactor `finalize-agreement` in this same wave. Both `finalize-agreement` and the new `generate-agreement-pdf` consume the helper. Pair with the `verifyBuyerToken` helper from D5 — both live under `_shared/auth/`.

### F4. New edge function `generate-agreement-pdf`
1. `verifyAdmin` → 401/403 if not admin.
2. Parse `{ agreement_id }`. Fetch row.
3. Verify `agreement_status === 'admin_approved'` and `deposit_status === 'admin_confirmed'`. Otherwise 400.
4. Read template via `Deno.readFile`.
5. `import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1"`. Load template, get form.
6. `assertAllFieldsPresent(form)` — fail loudly if drift.
7. Fill fields per `DEPOSIT_AGREEMENT_FIELD_MAP`. `form.flatten()`.
8. Upload to Supabase Storage `agreements/{agreement_id}/{agreement_number}.pdf`.
9. Update `deposit_agreements.signed_pdf_storage_path` (service role).
10. Set `agreement_status = 'complete'` (terminal happy state per status-enums.md).

Storage bucket: new `supabase/migrations/20260509000000_agreements_storage_bucket.sql` creating the `agreements` bucket. RLS: admin-only direct read; buyer-token download path (F6) uses service role to mint short-lived signed URLs.

### F5. Trigger from `finalize-agreement`
- After the existing UPDATE ([finalize-agreement/index.ts:106](supabase/functions/finalize-agreement/index.ts:106)), invoke `generate-agreement-pdf` synchronously (server-side PDF generation during finalization — no queue, no worker).
- On success, include the buyer-tokenized download URL (F6) in the buyer email template.

### F6. Tokenized buyer download route
- New route `/agreements/:agreementId/:buyerToken/download` in [src/App.tsx](src/App.tsx). New page `src/pages/AgreementDownload.tsx`.
- New edge function `supabase/functions/agreement-download-url/index.ts` (public, no JWT):
  1. `verifyBuyerToken` (D5).
  2. Confirm `signed_pdf_storage_path` is set.
  3. Mint `createSignedUrl(path, 3600)` (1-hour TTL).
  4. Return URL.
- Page redirects browser to the signed URL. Each visit re-mints; storage URL never lives in inboxes.
- Email copy: "This link works for 30 days; the file download itself opens for 1 hour after each click."

### F7. Operator UI to view/download PDF
- [src/components/admin/AgreementDetailPanel.tsx](src/components/admin/AgreementDetailPanel.tsx) — when `signed_pdf_storage_path` is set, show "Download Agreement PDF" using `supabase.storage.from('agreements').createSignedUrl(path, 3600)`.

**Verification for Wave F:**
- Run a test agreement through buyer-sign → admin-sign → admin-confirm-payment → finalize.
- PDF lands in `agreements` bucket, `signed_pdf_storage_path` set, `agreement_status='complete'`.
- `assertAllFieldsPresent` passes (or fails loudly if drift).
- Admin download — all fields populated, form flattened.
- Buyer email link `/agreements/<id>/<token>/download` mints a fresh 1-hour signed URL each visit; wrong token → 403; expired buyer token → "link expired".
- Refactored `finalize-agreement` still works.

---

## Wave G — Tests, docs, manual smoke (one PR, follows F)

### G1. Tests
- Integration: `src/test/integration/reservation-flow.test.tsx` — happy-path intake → admin review → token-gated agreement → payment dashboard (with H1 attestation) → finalize → PDF.
- Unit: `OperatorReviewForm`, `PaymentDashboard`, `AgreementDownload`.
- Edge function (Deno): `supabase/functions/generate-agreement-pdf/index.test.ts` (mock template, assert fill+flatten), `supabase/functions/mark-payment-sent/index.test.ts` (mismatched-token + idempotency + H1-precondition tests).

### G2. Docs
- Now (post-completion) rewrite `docs/DEPOSIT_REQUEST_FLOW.md` as the canonical post-Wave-G flow: 13 steps, file paths, edge-function dependency graph, references to `docs/status-enums.md` and `docs/spec/dream-connect-hub.md`.
- Append "Workflow completion — May 2026" section to `CHANGELOG.md`.
- Update `wave-status.md` with section tracking Waves A–H.
- Refresh `MANAGING_PUPPIES.md` (Wave C added the structured review form; document it).

### G3. Wire `puppies.status='Reserved'` transition
- After `agreement_status='complete'` is set, update the linked `puppies.status` to `Reserved`. Implement either inline in `generate-agreement-pdf` (simpler) or via DB trigger (more robust). Decision: inline, with a `// idempotent` comment — same path that writes `signed_pdf_storage_path`.

### G4. Manual smoke
- Run end-to-end flow described in `docs/ops/smoke-test.md` in a real browser. Confirm every email arrives, every screenshot uploads.

**Verification for Wave G:**
- `npm run check` green; `npm run health:check` green.
- Manual: 100% of the 13 spec steps observable.
- Live DB: `SELECT status, COUNT(*) FROM puppies` shows `Available`, `Reserved`, `Sold` only.

---

## Wave H — Chargeback defense / Identity capture / Pickup handover / Dispute evidence

This is a substantial wave — **may be split into multiple PRs (H1–H3 first, H4 second, H5–H8 third)**. It adds the evidence layer that protects against payment disputes and chargebacks. Critical for Square (which has formal chargeback flow) and useful for Zelle/Venmo/Cash App small-claims disputes.

### H1. Payment-time identity capture (PaymentDashboard enhancements)

New table `payment_attestations`:
```sql
CREATE TABLE payment_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES deposit_agreements(id) ON DELETE CASCADE,
  attestation_status text NOT NULL DEFAULT 'draft'
    CHECK (attestation_status IN ('draft','signed')),
  payment_method_handle_to_use text NOT NULL,    -- the operator handle the buyer pays TO
  buyer_payment_handle text,                     -- buyer's own Zelle email / $Cashtag / @username
  buyer_payment_handle_screenshot_path text,     -- Supabase Storage path
  buyer_phone_at_payment text,
  payment_attestation_text text,                 -- the full text the buyer signed
  payment_attestation_signed_at timestamptz,
  payment_attestation_ip text,
  payment_attestation_user_agent text,
  payment_attestation_geolocation jsonb,         -- { lat, lng, accuracy } if granted
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_id)
);
ALTER TABLE payment_attestations ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_rw_via_buyer_token ON payment_attestations
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM deposit_agreements a
    WHERE a.id = payment_attestations.agreement_id
      AND a.buyer_access_token::text =
        current_setting('request.headers', true)::json->>'x-buyer-token'
      AND a.buyer_access_token_expires_at > now()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM deposit_agreements a
    WHERE a.id = payment_attestations.agreement_id
      AND a.buyer_access_token::text =
        current_setting('request.headers', true)::json->>'x-buyer-token'
      AND a.buyer_access_token_expires_at > now()
  ));
CREATE POLICY admin_all_payment_attestations ON payment_attestations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
```
New Supabase Storage bucket `payment-evidence` (private; admin direct, buyer-token via signed URL).

PaymentDashboard updates (`src/pages/PaymentDashboard.tsx`):
- Before exposing the "I have sent payment" button, render a step-2 form:
  - Payment-method-specific instructions ("Send to **{handle_to_use}** via Zelle").
  - Input: buyer's own payment handle (Zelle email / $Cashtag / @username).
  - File upload: screenshot of buyer's payment app showing handle + name as it appears in the app. Uploaded to `payment-evidence/{agreement_id}/handle-{ts}.png`. Path stored in `buyer_payment_handle_screenshot_path`.
  - Re-confirm phone.
  - Attestation text rendered in full: "I confirm I am [Name from agreement] and I am sending payment from my own [method] account [@handle] to Dream Puppies. I authorize this payment and understand the deposit is non-refundable per the agreement I signed on [date]."
  - On submit: capture IP + UA on the server side via the edge function call; capture browser geolocation via `navigator.geolocation.getCurrentPosition` if granted (no fallback).
  - Edge function `submit-payment-attestation` (public + buyer-token via verifyBuyerToken) inserts/updates the attestation row to `attestation_status='signed'`.

### H2. Post-payment confirmation capture

Add columns to `payment_attestations`:
- `confirmation_screenshot_path text`
- `transaction_reference_id text`
- `payment_memo_used text`
- `confirmation_captured_at timestamptz`

After buyer clicks "I have sent payment" (which they can only do after H1 is complete), show a step-3 form requiring:
- Confirmation screenshot upload (showing amount, recipient, date/time, transaction ID).
- Transaction reference ID input.
- Confirm the memo string used matches `generatePaymentMemo()`.

The `mark-payment-sent` edge function (D3) gates on:
- `attestation_status = 'signed'`
- `buyer_payment_handle_screenshot_path` set
- `confirmation_screenshot_path` set
- `transaction_reference_id` set

If any precondition fails, return 422 with the missing field.

### H3. Operator payment verification

Add column to `deposit_agreements`:
- `operator_verified_sender_handle text`
- `operator_verified_sender_handle_at timestamptz`
- `operator_handle_mismatch_flagged boolean DEFAULT false`

In `/admin/agreements` (`src/components/admin/AgreementDetailPanel.tsx`), the "Confirm Payment Received" action requires the operator to type/paste the sender handle as it appeared in their payment app. On submit:
- Compare against `payment_attestations.buyer_payment_handle` (case-insensitive, trim).
- If mismatched, set `operator_handle_mismatch_flagged = true`, write to `agreement_audit_log`, render a banner: "Sender handle mismatch — verify before finalizing." Mismatch does NOT block; just records evidence.

### H4. Pickup-day handover module

New table `pickup_handovers`:
```sql
CREATE TABLE pickup_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL UNIQUE REFERENCES deposit_agreements(id) ON DELETE RESTRICT,
  handover_status text NOT NULL DEFAULT 'scheduled'
    CHECK (handover_status IN ('scheduled','in_person_verified')),
  pickup_date date NOT NULL,
  pickup_lat numeric(9,6),
  pickup_lng numeric(9,6),
  buyer_signature_canvas text,            -- base64 PNG from signature pad
  buyer_signature_at timestamptz,
  buyer_id_type text CHECK (buyer_id_type IN ('drivers_license','passport','state_id','other')),
  buyer_id_last_four text CHECK (buyer_id_last_four ~ '^\d{4}$'),
  buyer_id_state_or_country text,
  buyer_id_expiration_verified boolean,
  staff_member_initials text,
  staff_signature_at timestamptz,
  photo_buyer_with_puppy_path text NOT NULL,
  photo_buyer_with_id_path text NOT NULL,
  photo_pickup_location_path text,
  health_acknowledgment_signed_at timestamptz,
  vet_certificate_handed_over boolean DEFAULT false,
  vet_certificate_acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pickup_handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_pickup_handovers ON pickup_handovers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
```
**Important:** only `buyer_id_last_four`, `buyer_id_state_or_country`, `buyer_id_expiration_verified` — never the full DL number. (Same compromise as P4.)

New Storage bucket `pickup-evidence` (private, admin-only).

New page `src/pages/admin/PickupHandover.tsx` at `/admin/pickup/:agreementId` — operator-facing tablet flow:
- Header: agreement summary.
- Form: ID type select, last-4 input, state/country, expiration confirmation checkbox.
- Two required photo uploads (buyer with puppy, buyer holding ID next to face).
- One optional photo (location context).
- Buyer signature pad (existing `BuyerSignature` component or new `SignaturePad`).
- Health acknowledgment checkbox.
- Vet certificate handover checkbox.
- Operator initials input + auto-stamp.

Edge function `finalize-pickup-handover`:
- `verifyAdmin`.
- Sets `handover_status='in_person_verified'`.
- Generates pickup-handover PDF using the pdf-lib infrastructure from Wave F (template `pickup_handover_template.pdf` — needs to be created; gating P3 visual review).
- Sends "welcome home" buyer email.
- Updates `puppies.status = 'Sold'` (transition from `Reserved`).

### H5. Communication archive

New table `agreement_communications`:
```sql
CREATE TABLE agreement_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES deposit_agreements(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  channel text NOT NULL CHECK (channel IN ('email','sms','phone','in_person_note')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  summary text NOT NULL,
  attachment_paths text[],
  recorded_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agreement_communications_agreement ON agreement_communications(agreement_id, occurred_at DESC);
```
- Auto-log: every Resend email send via `_shared/email/send.ts` writes a row with `direction='outbound'`, `channel='email'`. Centralize via `_shared/email/send.ts` so all sites benefit without per-call wiring.
- Manual: operator UI in `AgreementDetailPanel` → "Log communication" form with channel + summary + optional attachment.

### H6. Contract clauses
Already encoded into Wave E3 above. No new work in Wave H.

### H7. Merchant descriptor / handle hygiene
- **Square:** in Square dashboard, set merchant descriptor to `DREAMPUPPIES 321-697-8864`. **Operator action; not code.** Document in `docs/ops/payment-handle-hygiene.md`.
- **Zelle/Venmo/Cash App:** confirm receiving accounts display business name (not personal). Document in same file.
- No code changes; checklist + verification only.

### H8. Idempotent dispute-evidence packet generator
New edge function `generate-dispute-evidence-packet`:
- `verifyAdmin`.
- Input: `{ agreement_id }`.
- Output: a single ZIP file containing:
  - Signed deposit agreement PDF (from Wave F)
  - Signed pickup handover PDF (from H4)
  - All payment screenshots (H1+H2)
  - Communication log export (`agreement_communications` rows as JSON + relevant attachments)
  - Audit trail JSON (all timestamps, IPs, signatures)
- Uses Deno's `JSZip` equivalent (`https://esm.sh/jszip@3.10.1`).
- Stored in new `dispute-evidence` bucket, admin-only read.
- Triggered manually via "Generate evidence packet" button in `AgreementDetailPanel`.
- Returns signed URL to admin (1-hour TTL).

### H — explicit non-goals
- Do **not** collect full DL numbers. Last-4 + state + expiration confirmation only (H4).
- Do **not** collect SSN, full DOB, or financial account numbers.
- Do **not** integrate Plaid or any identity-verification API. Revisit if dispute volume becomes meaningful.
- Do **not** auto-submit dispute responses to Square. Operator uploads the H8 packet manually via Square's portal.

**Verification for Wave H:**
- Buyer signs H1 attestation; row in `payment_attestations` with `attestation_status='signed'`, IP/UA captured, geolocation if granted.
- Buyer uploads H2 confirmation screenshot + transaction ID; row updated.
- Click "I have sent payment" before completion → 422; after completion → admin email arrives.
- Operator confirms payment with mismatched sender handle → banner shows mismatch flag; row recorded.
- Operator runs pickup handover → both photos uploaded, signatures captured, ID last-4 stored, handover PDF generated, puppy → `Sold`.
- Email sent? → `agreement_communications` has matching outbound row.
- Operator clicks "Generate evidence packet" → ZIP appears in `dispute-evidence` bucket with all required artifacts.
- Square dashboard shows merchant descriptor `DREAMPUPPIES 321-697-8864`.

---

## Files most likely to change (quick reference)

| Wave | Key files |
|---|---|
| A | New: `docs/status-enums.md`, `docs/spec/dream-connect-hub.md`, three migrations (`20260506000000_drop_deposit_tier_column.sql`, `20260506000001_drop_out_of_band_policies.sql`, `20260506000002_drop_buyer_signed_status.sql`). Update: [src/lib/constants/deposit.ts](src/lib/constants/deposit.ts), [src/lib/utils/depositCalc.ts](src/lib/utils/depositCalc.ts), [src/components/deposit/DepositForm.tsx](src/components/deposit/DepositForm.tsx), [src/components/deposit/DepositSummary.tsx](src/components/deposit/DepositSummary.tsx), [src/lib/deposit-service.ts](src/lib/deposit-service.ts), [src/pages/admin/AgreementsPage.tsx](src/pages/admin/AgreementsPage.tsx), [src/types/deposit.ts](src/types/deposit.ts), [README.md](README.md), [BACKEND_CONTRACT.md](BACKEND_CONTRACT.md). Delete + archive per A4/A7. |
| B | Update: [src/pages/DepositAgreement.tsx](src/pages/DepositAgreement.tsx), [src/lib/deposit-service.ts](src/lib/deposit-service.ts), [supabase/functions/send-deposit-link/index.ts](supabase/functions/send-deposit-link/index.ts), [supabase/functions/_shared/email/templates.ts](supabase/functions/_shared/email/templates.ts), [src/components/admin/DepositRequestDetailPanel.tsx](src/components/admin/DepositRequestDetailPanel.tsx). New tests. |
| C | New: `src/components/admin/OperatorReviewForm.tsx`. Update detail panel + service. |
| D | New: `src/pages/PaymentDashboard.tsx`, `supabase/functions/mark-payment-sent/index.ts`, `supabase/functions/_shared/auth/verifyBuyerToken.ts`, `supabase/migrations/20260507000000_buyer_access_token.sql`. Update [src/App.tsx](src/App.tsx), deposit-service, DepositForm, email templates. |
| E | New: `supabase/migrations/20260508000000_deposit_agreement_field_completeness.sql`. Update DepositForm (H6 clauses), types, service. |
| F | New: `supabase/functions/generate-agreement-pdf/index.ts`, `supabase/functions/agreement-download-url/index.ts`, `supabase/functions/_shared/pdf/templates/*.pdf`, `supabase/functions/_shared/pdf/depositAgreementFieldMap.ts`, `supabase/functions/_shared/auth/verifyAdmin.ts`, `src/pages/AgreementDownload.tsx`, `supabase/migrations/20260509000000_agreements_storage_bucket.sql`. Update [supabase/functions/finalize-agreement/index.ts](supabase/functions/finalize-agreement/index.ts), [src/components/admin/AgreementDetailPanel.tsx](src/components/admin/AgreementDetailPanel.tsx), [src/App.tsx](src/App.tsx). |
| G | `src/test/integration/reservation-flow.test.tsx`, `docs/DEPOSIT_REQUEST_FLOW.md`, `CHANGELOG.md`, `wave-status.md`, `MANAGING_PUPPIES.md`. Wire `puppies.status='Reserved'` transition. |
| H | New: `payment_attestations`, `pickup_handovers`, `agreement_communications` tables (3 migrations). New buckets: `payment-evidence`, `pickup-evidence`, `dispute-evidence`. New edge functions: `submit-payment-attestation`, `finalize-pickup-handover`, `generate-dispute-evidence-packet`. New pages: PaymentDashboard updates, `src/pages/admin/PickupHandover.tsx`. Update: [src/components/admin/AgreementDetailPanel.tsx](src/components/admin/AgreementDetailPanel.tsx), [supabase/functions/_shared/email/send.ts](supabase/functions/_shared/email/send.ts) (auto-log to `agreement_communications`). New ops doc: `docs/ops/payment-handle-hygiene.md`. |

---

## Existing utilities to reuse
- `generatePaymentMemo` — [src/lib/utils/depositCalc.ts:103](src/lib/utils/depositCalc.ts:103)
- `getEarliestPickupDate` — [src/lib/utils/depositCalc.ts:42](src/lib/utils/depositCalc.ts:42)
- `validateDepositRequest` — [src/lib/deposit-service.ts:78](src/lib/deposit-service.ts:78)
- `getAdminRecipients`, `sendEmail` — `supabase/functions/_shared/email/send.ts`
- `link_deposit_agreement_to_request` trigger — [supabase/migrations/20260422000000_fix_deposit_and_audit_rls.sql:76](supabase/migrations/20260422000000_fix_deposit_and_audit_rls.sql:76)
- CORS allowlist — `supabase/functions/_shared/cors.ts`
- Admin route wrapper — `src/components/ProtectedRoute.tsx` + `src/components/admin/AdminLayout.tsx`
- TanStack Query client — `src/lib/query-client.ts`

---

## Out of scope
- Driver's license collection at deposit time (replaced by `buyer_age_attestation_at`).
- Background-job / queue / worker infrastructure (PDF generation is synchronous from `finalize-agreement`).
- Public UPDATE on raw agreement UUID (replaced by buyer-token + edge-function-only writes).
- Wave 2.x security deploys (tracked in `wave-status.md`).
- Spanish/Portuguese translations of new operator/buyer screens.
- Plaid / external identity-verification API integration (revisit if needed).
- Auto-submission of dispute responses to Square.
- Edge-function rate limiting (Supabase doesn't natively rate-limit; if defense in depth becomes necessary, add a counter table or Cloudflare in front).

---

## End-to-end verification (after all waves)

1. Public buyer hits `/upcoming-litters` → "Reserve a spot" → `/request-deposit` → submits intake.
2. Admin email arrives ("New deposit request"); buyer email arrives (acknowledgment).
3. Admin opens `/admin/deposit-requests` → opens new request → opens Operator Review Form → fills puppy info + $300 deposit (or override) + price → submits → "Send Deposit Link".
4. Buyer email arrives with `https://puppyheavenllc.com/deposit?requestId=…` link.
5. Buyer follows link → form pre-populated → fills personal info (city/state/zip), pickup date + preferences, payment method, all acks (including 18+ attestation, payment auth, identity attestation, pre-dispute contact, pickup acceptance, FL venue), types arbitration phrase, signs → submits.
6. Buyer auto-redirected to `/payment/<agreementId>/<buyerToken>`.
7. Buyer reads payment instructions, enters their own payment handle, uploads handle screenshot, signs payment attestation (IP/UA/geolocation captured) → step-3 unlocked.
8. Buyer pays out-of-band, returns to dashboard, uploads confirmation screenshot, enters transaction ID, confirms memo string used, clicks "I have sent payment" → `mark-payment-sent` fires → admin email arrives.
9. Admin opens `/admin/agreements` → opens agreement → enters operator-verified sender handle (mismatch banner if applicable) → "Confirm Payment Received" → operator signature applied → "Finalize Agreement" → `finalize-agreement` invokes `generate-agreement-pdf` synchronously → PDF lands; `agreement_status='complete'`.
10. Buyer email arrives with `/agreements/<id>/<buyerToken>/download` link → fresh 1-hour signed URL on each visit.
11. **Pickup day:** operator opens `/admin/pickup/<agreementId>` on tablet → enters ID type/last-4/state/expiration → uploads buyer-with-puppy and buyer-with-ID photos → captures signatures → submits → handover PDF generated, "welcome home" email sent, `puppies.status='Sold'`.
12. Throughout: every email auto-logs to `agreement_communications`. Operator manually logs SMS/calls.
13. **If dispute filed:** operator clicks "Generate evidence packet" → ZIP minted with all PDFs + screenshots + communication log + audit trail → uploaded to Square dispute portal manually.

If every step is observable end-to-end, the spec is complete with chargeback defense.

---

## Confirmation requested before starting Wave A

1. **P1 secret audit:** ✅ Clean. No rotation needed.
2. **P2 contract-PII audit:** ✅ Clean. Files moved out of repo working tree as part of A4.
3. **`docs/status-enums.md` content:** drafted in §P5 above. Approve verbatim, amend, or reject.
4. **Driver's license at deposit:** ✅ removed. Pickup-day last-4 stays in Wave H4.
5. **Live-policy audit:** I was wrong in my previous reply — the duplicate `public_insert_deposit_agreements` and `public_read_recent_deposit_agreements` policies DO exist in production but not in any migration. A6 now drops both as load-bearing cleanup, not a defensive no-op. Confirm A6's drop is approved.
6. **`puppies.status` distinct values:** confirmed `Available` (10) + `Sold` (16). No normalization migration needed; only documentation in status-enums.md.
7. **PostgREST header passthrough (P7):** confirm the staging POC will be run before Wave D code lands. If `current_setting('request.headers', true)` returns NULL, fall back to `get-agreement-by-token` edge function design.
8. **Wave H scope:** large enough to potentially split into three PRs (H1–H3, H4, H5/H7/H8). Default in this plan: one wave; split if review feedback says so.
9. **FL venue clause (E3 / H6):** flagged for attorney review before deploy. Hold the wave or proceed with checkbox in place pending review?
