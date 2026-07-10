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
| G | Tests, docs, `puppies.status='Reserved'` transition, smoke checklist | ✅ | N/A | | Complete |
| H | Chargeback defense / identity capture / pickup handover / dispute evidence | ✅ | ✅ | | Code + migrations complete |

### Wave G sub-tasks

| Task | Status |
|------|--------|
| G3 — `puppies.status='Reserved'` transition in `generateDepositPdf.ts` | ✅ Done |
| G1 — Unit + integration tests (18 test files, 136 tests) | ✅ Done |
| G2 — Docs: rewrite `DEPOSIT_REQUEST_FLOW.md`, update `CHANGELOG.md`, `MANAGING_PUPPIES.md`, `wave-status.md` | ✅ Done |
| G4 — `docs/ops/reservation-flow-smoke-test.md` smoke checklist | ✅ Done |

### Wave H sub-tasks

| Task | Status | Notes |
|------|--------|-------|
| H1 | ✅ Done | `payment_attestations` table (`20260506000009_payment_attestations_and_h3.sql`); H1Form in `PaymentDashboard.tsx`; `submit-payment-attestation` edge function (302 lines); IP/UA/geolocation capture |
| H2 | ✅ Done | H2Form in `PaymentDashboard.tsx`; `confirmation_screenshot_path`, `transaction_reference_id`, `payment_memo_used` columns; `mark-payment-sent` gates on all H1+H2 preconditions (422 with missing field name if not met) |
| H3 | ✅ Done | `operator_verified_sender_handle` + `operator_handle_mismatch_flagged` columns (same migration as H1: `20260506000009_payment_attestations_and_h3.sql`); mismatch banner in `AgreementDetailPanel.tsx`; non-blocking flag for chargeback evidence |
| H4 | ✅ Done | `pickup_handovers` table (`20260506000010_pickup_handovers.sql`); `PickupHandover.tsx` (567 lines); `finalize-pickup-handover` edge function (241 lines); `Reserved → Sold` puppy transition; `pickup-evidence` bucket (same migration) |
| H5 | ✅ Done | `agreement_communications` table (`20260506000011_agreement_communications.sql`); `_shared/email/send.ts` auto-logs every outbound email; `AgreementCommunicationsCard.tsx` in admin detail panel; manual log UI |
| H6 | ✅ Done | Contract clauses encoded in Wave E; no new code in Wave H |
| H7 | ✅ Done | `docs/ops/payment-handle-hygiene.md` — Square merchant descriptor + Zelle/Venmo/CashApp handle hygiene checklist; operator action items documented |
| H8 | ✅ Done | `generate-dispute-evidence-packet` edge function (491 lines); ZIP with all PDFs + screenshots + communications JSON + audit trail; `dispute-evidence` storage bucket (`20260506000012_dispute_evidence_bucket.sql`); "Generate evidence packet" button wired in `AgreementDetailPanel.tsx` |

---

## 2026-05-25 maintenance session

| Item | Status | Notes |
|------|--------|-------|
| Login race condition fix | ✅ Merged + deployed | `Sign In` button no longer re-enables before redirect; commit `6c52893` |
| 6 FK indexes | ✅ Applied to live DB + migrated | `20260525000000_add_fk_indexes.sql`; commit `40733dd` |
| RLS initplan audit | ✅ Verified already fixed | All 70 policies already use `(SELECT auth.uid() AS uid)` — no changes needed |
| `@supabase/supabase-js` 2.95 → 2.106 | ✅ Merged + deployed | Drops `ws` dep, clears GHSA-3h5q-q39x-f9x3; commit `b4998f2` |
| `brace-expansion` CVE | ✅ Patched | 5.0.6 via `npm audit fix`; same commit |
| Breed copy (French Bulldog removed) | ✅ Merged + deployed | `index.html`, `seo.ts`, `Puppies.tsx`, `UpcomingLitters.tsx`; commit `ade874c` |
| Private-page noindex | ✅ Merged + deployed | `PrivatePageSeo` component, `netlify.toml` headers, `postbuild-seo.tsx` prerender; same commit |
| FAQ JSON-LD consolidation | ✅ Merged + deployed | `buildFaqPageJsonLd()` in `seo.ts`, postbuild injection; same commit |

---

## Pending operator actions (production deploy)

1. Apply all pending migrations to production via `supabase db push` or the Supabase dashboard SQL editor.
   Key migrations not yet deployed (verify with `supabase migrations list`):
   - `20260506000009_payment_attestations_and_h3.sql` (H1 + H3 + payment-evidence bucket)
   - `20260506000010_pickup_handovers.sql` (H4 + pickup-evidence bucket)
   - `20260506000011_agreement_communications.sql` (H5)
   - `20260506000012_dispute_evidence_bucket.sql` (H8 storage)
   - `20260506000013_agreements_storage_bucket.sql` (F storage — PDF uploads)
2. Deploy all edge functions: `supabase functions deploy --no-verify-jwt` (public functions: `submit-payment-attestation`, `mark-payment-sent`, `agreement-download-url`) and `supabase functions deploy` (JWT-gated: `finalize-agreement`, `finalize-pickup-handover`, `generate-agreement-pdf`, `generate-dispute-evidence-packet`, `send-deposit-link`, `send-deposit-receipt`).
3. Confirm `PUBLIC_SITE_URL` Edge Function secret is set to `https://puppyheavenllc.com`.
4. Confirm `RESEND_API_KEY`, `NOTIFY_EMAIL`, `RESEND_FROM` secrets are current.
5. Run the full smoke test per `docs/ops/reservation-flow-smoke-test.md` on staging before promoting to production.
