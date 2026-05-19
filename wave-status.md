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

## Reservation redesign (PRs 1–7)

> **Note:** Waves A–G described below were superseded by the May 2026 reservation
> redesign. The operator-initiated wizard flow (PRs 1–7) replaces the buyer-self-serve
> intake from Waves B/C and extends Wave D/H. See
> [`docs/RESERVATION_REDESIGN_HANDOFF_2026-05-19.md`](docs/RESERVATION_REDESIGN_HANDOFF_2026-05-19.md)
> and [`docs/DEPOSIT_REQUEST_FLOW.md`](docs/DEPOSIT_REQUEST_FLOW.md) for the current spec.

| PR | Description | Status |
|----|-------------|--------|
| PR 1 | Retire public intake; add operator-initiated `/admin/reservations` page | ✅ Complete |
| PR 2 | Wizard skeleton (`WizardShell`, first 4 steps) | ✅ Complete |
| PR 3 | Signature adoption (`StepAdoptSignature`) + 11-clause initials step | ✅ Complete |
| PR 4 | Simplified payment flow: remove H1/H2 gates; `senderHandle` optional | ✅ Complete |
| PR 5 | Pickup handover redesign: 3-step tablet flow; new DB columns | ✅ Complete |
| PR 6 | Bill-of-sale PDF generation via shared `generateBillOfSalePdf` helper | ✅ Complete |
| PR 7 | Tests + docs: wizard unit tests, integration test fixes, docs rewrite | ✅ Complete |

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
| H1 | ✅ Done | `payment_attestations` table (`20260506000006_payment_attestations.sql`); H1Form in `PaymentDashboard.tsx`; `submit-payment-attestation` edge function (302 lines); IP/UA/geolocation capture |
| H2 | ✅ Done | H2Form in `PaymentDashboard.tsx`; `confirmation_screenshot_path`, `transaction_reference_id`, `payment_memo_used` columns; `mark-payment-sent` gates on all H1+H2 preconditions (422 with missing field name if not met) |
| H3 | ✅ Done | `operator_verified_sender_handle` + `operator_handle_mismatch_flagged` columns (`20260506000007_h3_operator_handle_mismatch.sql`); mismatch banner in `AgreementDetailPanel.tsx`; non-blocking flag for chargeback evidence |
| H4 | ✅ Done | `pickup_handovers` table (`20260506000008_pickup_handovers.sql`); `PickupHandover.tsx` (567 lines); `finalize-pickup-handover` edge function (241 lines); `Reserved → Sold` puppy transition; `pickup-evidence` bucket (`20260506000010`) |
| H5 | ✅ Done | `agreement_communications` table (`20260506000009_agreement_communications.sql`); `_shared/email/send.ts` auto-logs every outbound email; `AgreementCommunicationsCard.tsx` in admin detail panel; manual log UI |
| H6 | ✅ Done | Contract clauses encoded in Wave E; no new code in Wave H |
| H7 | ✅ Done | `docs/ops/payment-handle-hygiene.md` — Square merchant descriptor + Zelle/Venmo/CashApp handle hygiene checklist; operator action items documented |
| H8 | ✅ Done | `generate-dispute-evidence-packet` edge function (491 lines); ZIP with all PDFs + screenshots + communications JSON + audit trail; `dispute-evidence` storage bucket; "Generate evidence packet" button wired in `AgreementDetailPanel.tsx` |

---

## Pending operator actions (production deploy)

1. Apply all pending migrations to production via `supabase db push` or the Supabase dashboard SQL editor.
   Key migrations not yet deployed (verify with `supabase migrations list`):
   - `20260506000006_payment_attestations.sql` (H1)
   - `20260506000007_h3_operator_handle_mismatch.sql` (H3)
   - `20260506000008_pickup_handovers.sql` (H4)
   - `20260506000009_agreement_communications.sql` (H5)
   - `20260506000010_pickup_evidence_bucket.sql` (H4 storage)
   - `20260506000013_agreements_storage_bucket.sql` (F storage — PDF uploads)
2. Deploy all edge functions: `supabase functions deploy --no-verify-jwt` (public functions: `submit-payment-attestation`, `mark-payment-sent`, `agreement-download-url`) and `supabase functions deploy` (JWT-gated: `finalize-agreement`, `finalize-pickup-handover`, `generate-agreement-pdf`, `generate-dispute-evidence-packet`, `send-deposit-link`, `send-deposit-receipt`).
3. Confirm `PUBLIC_SITE_URL` Edge Function secret is set to `https://puppyheavenllc.com`.
4. Confirm `RESEND_API_KEY`, `NOTIFY_EMAIL`, `RESEND_FROM` secrets are current.
5. Run the full smoke test per `docs/ops/reservation-flow-smoke-test.md` on staging before promoting to production.
