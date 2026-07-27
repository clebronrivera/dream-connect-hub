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

---

## Puppy media library + admin close-out (2026-07-26)

Shipped and live. Migrations applied to production and edge functions deployed
at merge time, so nothing here is waiting on an operator step.

| Item | Status | Notes |
|------|--------|-------|
| `puppy_media` table | ✅ Applied + deployed | `20260726000000`. One row per photo/video with `kind`, `sort_order`, `is_public`, `is_primary`, `derived_from_media_id`. Admin-only RLS. |
| Two-way sync with `puppies.photos` | ✅ Applied + deployed | `20260726000001`. `puppies.photos` / `primary_photo` / `video_path` are now a projection of the public media rows. Triggers scoped `OF photos, primary_photo, video_path`, so status churn and litter bulk edits never fire sync. |
| Backfill | ✅ Applied | `20260726000002`. Self-verifying — refuses to commit unless every puppy's rendered photo list is byte-identical. Result: 0 mismatches across 45 puppies, 131 media rows. |
| `breeder-media` edge function | ✅ Deployed (v1) | New, standalone. Media ops deliberately NOT added to `breeder-write`, which is load-bearing for every breeder screen. |
| `breeder-upload-photo` / `-video` | ✅ Deployed (v4) | Optional `record=1` also creates the `puppy_media` row server-side. Absent `record`, behaviour is unchanged. |
| `breeder-write` | ⬜ Not redeployed — intentional | Left exactly as-is. The legacy `replacePuppyPhoto` op stays live so stale client bundles keep working; the arrays→media trigger reconciles whatever they write. |
| Breeder media manager (`/breeder/photos`) | ✅ Merged + deployed | Two lanes (On the site / Staging), multi-select from the phone library, bulk publish. Now has its own nav tab — the route previously had none. |
| In-browser edit sheet | ✅ Merged + deployed | Crop/rotate, enhance, on-device background removal. Saves as a new *staged* row with `derived_from_media_id`; originals are never overwritten. |
| Inline puppy status + visibility | ✅ Merged + deployed | `/admin/puppies`. Picking a non-Available status also pulls the puppy off the site in one write (via `puppies_enforce_visibility`). |
| Sold-puppy close-out queue | ✅ Applied + deployed | `20260726000003` adds a 4th `get_aging_action_items()` kind. Surfaced 22 real items on day one (38–153 days stale) — every sold puppy was missing its `sale_price`. |

### Still open, needs a human decision

| PR | Why it isn't merged |
|----|--------------------|
| #85 Security audit remediation (Phases 1–3) | **Conflicting** with `main`, last touched 2026-05-26. +535/−164 across 22 files. Needs conflict resolution and a re-review; overlaps the RLS/CORS work that has since landed. |
| #55 Galactic public-page redesign | **Conflicting**, last touched 2026-05-05. +2372/−1253 across 36 files. Changes the public site's appearance — wants an explicit design sign-off, not an autonomous merge. |
| #31 react-router-dom 6 → 7 | Major version, breaking changes. Also the only remaining source of the 2 moderate `npm audit` findings. |
| #37, #36, #30, #29, #27, #33 | Conflicting dependabot bumps (react-hook-form, react-dom, lucide-react, autoprefixer, sonner, vite). Several are majors — `lucide-react` 0.462 → 1.x and `sonner` 1.x → 2.x both need an icon/API sweep. |
| #102, #97 | GitHub Actions bumps (`setup-node`, `checkout` v6 → v7). CI-only, low risk, but untested here. |

`npm audit` went from 5 findings (2 high) to 3 (0 high) — `brace-expansion`,
`sucrase`, and `postcss` patched via #107 and #106.
