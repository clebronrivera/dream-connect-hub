# Audit Remediation — Wave Status

Tracking deploy + verification state for all active waves. Update **Deployed**
and **Smoke-tested** columns as each step lands in production.

---

## Security audit waves (2.x)

| Wave | PR # | Description | Merged | Deployed | Smoke-tested | Status |
|------|------|-------------|--------|----------|--------------|--------|
| 2.1 PR-A | #44 | Gate unauthenticated edge functions (`send-pending-reminders` requires `X-Cron-Secret`; `finalize-agreement` validates JWT + admin role) | 2026-04-25 | | | Merged, awaiting deploy |
| 2.2 | #46 | CORS allowlist for edge functions — replaces `*` wildcard with `puppyheavenllc.com`, `www.puppyheavenllc.com`, `localhost:8080` | 2026-04-25 | | | Merged, awaiting deploy |
| 2.3 | #48 | Retire dangerous one-shot scripts | 2026-04-25 | | | Merged; deploy = N/A (no runtime artifact) |

**Footer notes — 2.x waves:**
- **Wave 2.1 PR-B:** parked. Pick up after 2.1 PR-A, 2.2, and 2.3 are verified.
- **Wave 2.6:** blocked on captcha vendor decision.
- **Before re-enabling cron in 2.1:** set `CRON_SECRET` in Edge Function secrets, configure scheduler to send `X-Cron-Secret`, run one manual test.

---

## Dream Connect Hub completion waves (A–H)

| Wave | Description | Code done | Migration applied | Smoke-tested | Status |
|------|-------------|-----------|-------------------|--------------|--------|
| A | Critical drift + repo cleanup (flat $300 deposit, drop rogue RLS policies, remove `buyer_signed` enum, docs) | ✅ | ✅ | | Code + migrations merged |
| B | Token-gate `/deposit` behind `?requestId=` | ✅ | N/A | | Merged |
| C | Operator Review Form (Step 8) | ✅ | N/A | | Merged |
| D | Buyer Payment Dashboard + `buyer_access_token` | ✅ | ✅ | | Code + migrations merged |
| E | Schema completeness — new ack columns, pickup prefs, city/state/zip | ✅ | ✅ | | Code + migrations merged |
| F | Finalized PDF generation — pdf-lib edge function, AcroForm fill, storage bucket, tokenized download | ✅ | ✅ | | Code + migrations merged |
| G | Tests, docs, `puppies.status='Reserved'` transition, smoke checklist | ✅ | N/A | | In progress (this wave) |
| H | Chargeback defense / identity capture / pickup handover / dispute evidence | ⏳ | ⏳ | | Pending — Wave G must complete first |

### Wave G sub-tasks

| Task | Status |
|------|--------|
| G3 — `puppies.status='Reserved'` transition in `generateDepositPdf.ts` | ✅ Done |
| G1 — Unit + integration tests (18 test files, 136 tests) | ✅ Done |
| G2 — Docs: rewrite `DEPOSIT_REQUEST_FLOW.md`, update `CHANGELOG.md`, `MANAGING_PUPPIES.md`, `wave-status.md` | ✅ Done |
| G4 — `docs/ops/reservation-flow-smoke-test.md` smoke checklist | ✅ Done |

### Wave H sub-tasks (next up)

| Task | Description |
|------|-------------|
| H1 | Payment-time identity capture — `payment_attestations` table, attestation form on PaymentDashboard |
| H2 | Post-payment confirmation capture — confirmation screenshot + tx ref |
| H3 | Operator payment verification — sender handle comparison + mismatch flag |
| H4 | Pickup-day handover module — `pickup_handovers` table, `PickupHandover.tsx` page |
| H5 | Communication archive — `agreement_communications` table, auto-log all emails |
| H6 | Contract clauses — already encoded in Wave E; no new code |
| H7 | Merchant descriptor hygiene — Square dashboard + documentation |
| H8 | Dispute evidence packet generator — `generate-dispute-evidence-packet` edge function |

---

## Pending operator actions (before Wave H ships)

1. Apply migration `20260506000013_agreements_storage_bucket.sql` to production
   (`supabase db push` or via Supabase dashboard SQL editor) before PDF uploads
   will work.
2. Confirm `PUBLIC_SITE_URL` Edge Function secret is set to
   `https://puppyheavenllc.com`.
3. Confirm `RESEND_API_KEY`, `NOTIFY_EMAIL`, `RESEND_FROM` secrets are current.
