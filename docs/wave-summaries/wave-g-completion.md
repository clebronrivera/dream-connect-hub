# Wave G completion summary — May 2026

**Completed:** 2026-05-07  
**Scope:** Tests, docs, puppy status transition  
**Commits:**

| Hash | Label | Date |
|---|---|---|
| `9dc3f1d` | fix(deposit): auto-sync puppies.status with agreement lifecycle (Wave G partial) | 2026-05-07 (pre-G) |
| `c7d3c48` | Wave G — tests, docs, puppy status transition | 2026-05-07 09:29 |

---

## G1 — Test suite additions

**Commit:** `c7d3c48`  
**Total new tests: 36 across 4 files** (28 in the Wave G commit; `9dc3f1d` added partial coverage)

### `src/pages/AgreementDownload.test.tsx` — 8 Vitest component tests

Tests buyer PDF download page in all states:
- Happy path: mounts, calls `agreement-download-url`, redirects to signed URL
- Not-found state (404 from edge function)
- Token-expired state
- PDF-not-ready state (signed_pdf_storage_path not set)
- Loading state rendering
- Error boundary behavior
- Re-mount idempotency (does not double-call edge function)
- Correct URL construction from params

### `src/test/integration/reservation-flow.test.tsx` — 9 Vitest integration tests

Covers the service-layer contracts that the UI depends on:
- `fetchAgreement` — happy path + not found
- `confirmDepositPayment` — happy path, mismatch flag, missing senderHandle rejection
- `getAgreementPdfUrl` — returns signed URL, propagates storage errors
- `markPaymentSent` — pre-H1-gate failure (422), success path, idempotent repeat

### `supabase/functions/generate-agreement-pdf/index.test.ts` — 8 Deno unit tests

Exercises the exported `handler()` function with dependency injection (mock `generateDepositPdf`):
- Non-admin JWT → 401
- Missing `agreement_id` → 400
- `generateDepositPdf` throws → 500 with error forwarded
- Success → 200 with `pdf_path` + `download_url`
- Idempotent: second call when `signed_pdf_storage_path` already set → 200 with `already_generated: true`
- Service-role client passed (not anon)
- Agreement-not-found propagation
- Wrong-status guard (non-admin_approved) propagation

### `supabase/functions/mark-payment-sent/index.test.ts` — 11 Deno unit tests

Exercises `handler()` with mock client:
- Mismatched buyer token → 403
- Expired buyer token → 403
- Already-marked (idempotent) → 200 with `{ already_marked: true }`
- H1 gate: `attestation_status ≠ 'signed'` → 422 with `{ missing: 'attestation' }`
- H2 gate: `buyer_payment_handle_screenshot_path` null → 422 with `{ missing: 'handle_screenshot' }`
- H2 gate: `confirmation_screenshot_path` null → 422 with `{ missing: 'confirmation_screenshot' }`
- H2 gate: `transaction_reference_id` null → 422 with `{ missing: 'transaction_reference_id' }`
- Race condition: concurrent calls resolve to one winner (idempotent UPDATE WHERE NULL)
- Success: sets `buyer_marked_payment_sent_at`, sends one admin email
- Admin email not re-sent on repeat calls (idempotency)
- Wrong `agreement_status` (not 'sent') → 400

### Refactoring required to enable DI-based testing

Both `generate-agreement-pdf/index.ts` and `mark-payment-sent/index.ts` were refactored to export a testable `handler(req, { client?, generator? })` function. `Deno.serve(handler)` wire-up is unchanged. Optional client/generator injection allows tests to pass mocks without patching globals.

Package added: `@testing-library/user-event` (for component interaction tests).

---

## G2 — Documentation rewrite

**Commit:** `c7d3c48`

### `docs/DEPOSIT_REQUEST_FLOW.md` — complete rewrite

Canonical 13-step reference for the post-Wave-G flow:
- Each step: actor, action, system state change, files involved
- State machines for `deposit_requests.request_status`, `deposit_agreements.agreement_status + deposit_status`, `puppies.status`
- Edge-function dependency graph (which functions call which shared modules)
- Key-file index (page → service → edge fn → migration)
- Wave F/H integration points called out explicitly
- Verification checklist per step

### `CHANGELOG.md`

Appended "2026-05-07 — Workflow completion (Waves A–G)" section (95 lines):
- Wave F: PDF generation, shared modules, buyer/admin download
- Wave G: test suite, smoke checklist, puppy status transition
- Wave A: drift cleanup, deposit model, RLS policy drops
- (Earlier waves A–E referenced retroactively for completeness)

### `wave-status.md`

Full A–H status table added (86 lines net change):
- Each wave: status (✅ complete / 🔜 complete / ⏳ blocked), brief description, key deliverables
- H sub-tasks H1–H8 each listed individually

### `MANAGING_PUPPIES.md`

55 lines added:
- Puppy status lifecycle: `Available` → `Reserved` (on agreement complete) → `Sold` (on pickup handover)
- How to use the Operator Review Form (Wave C) from the admin deposit-request panel
- How to create a puppy record inline vs. pre-populating from a litter

### `docs/ops/reservation-flow-smoke-test.md` — new file (274 lines)

13-step browser smoke checklist for manual pre-deploy verification:
- Each step: exact URL to visit, actions to take, expected state changes, how to verify
- Pass/fail criteria table
- Failure triage: common failures + root-cause pointers
- Environment setup (staging vs. production toggle)

---

## G3 — `puppies.status = 'Reserved'` transition

**Commits:** `9dc3f1d` (partial, pre-G) · `c7d3c48` (wired into `generateDepositPdf`)

**Location:** `supabase/functions/_shared/pdf/generateDepositPdf.ts`

After `agreement_status` is set to `'complete'` and `signed_pdf_storage_path` is written:
```ts
// idempotent — only transitions Available → Reserved, ignores Reserved/Sold
await supabase.from('puppies')
  .update({ status: 'Reserved' })
  .eq('id', puppy_id)
  .eq('status', 'Available');
```

- Idempotent: `.eq('status', 'Available')` guard means already-Reserved or Sold puppies are untouched.
- Runs in the same service-role client as the PDF upload — no additional auth.
- Litter-only agreements (no `puppy_id`) skip this step silently.

Full `puppies.status` lifecycle after G3:
```
Available → Reserved (generateDepositPdf, agreement_status='complete')
Reserved → Sold     (finalize-pickup-handover, handover_status='in_person_verified')
```

Cancellation path: agreement cancelled → puppy returns to `Available`. **Not yet wired** (open item).

---

## G4 — Smoke checklist

**Commit:** `c7d3c48`

`docs/ops/reservation-flow-smoke-test.md` — 13 steps, each with:
- Actor (buyer / admin / system)
- URL + UI actions
- Expected database state after step
- Expected email(s) sent
- Pass criteria + failure pointer

---

## Files shipped in Wave G

| Path | Status |
|---|---|
| `src/pages/AgreementDownload.test.tsx` | New (8 tests) |
| `src/test/integration/reservation-flow.test.tsx` | New (9 tests) |
| `supabase/functions/generate-agreement-pdf/index.test.ts` | New (8 tests) |
| `supabase/functions/mark-payment-sent/index.test.ts` | New (11 tests) |
| `supabase/functions/generate-agreement-pdf/index.ts` | Updated (handler DI export) |
| `supabase/functions/mark-payment-sent/index.ts` | Updated (handler DI export) |
| `supabase/functions/_shared/pdf/generateDepositPdf.ts` | Updated (puppies.status transition) |
| `docs/DEPOSIT_REQUEST_FLOW.md` | Complete rewrite |
| `docs/ops/reservation-flow-smoke-test.md` | New |
| `CHANGELOG.md` | Updated (Waves A–G entry) |
| `wave-status.md` | Updated (full A–H table) |
| `MANAGING_PUPPIES.md` | Updated (status lifecycle + Operator Review Form) |
| `package.json` + `package-lock.json` | Updated (@testing-library/user-event added) |

---

## Open items at Wave G close

| Item | Status |
|---|---|
| Local end-to-end test (browser, real agreement → real PDF) | **Not run — Step 2 of pre-deploy checklist** |
| Cancellation → puppy back to `Available` | Not wired; open item |
| G4 smoke test actually executed | Not run; checklist written for operator to run |
| Wave H migrations applied to staging | Unknown — not verified in this session |
| FL venue clause attorney review | Blocking production deploy of Wave E/H6 |
