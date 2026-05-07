# Wave F completion summary — May 2026

**Completed:** 2026-05-07  
**Scope:** Finalized PDF generation via pdf-lib edge function  
**Commits (in order):**

| Hash | Label | Date |
|---|---|---|
| `53f9990` | docs(wave-f0): AcroForm field inventory + disambiguation spec | 2026-05-07 00:03 |
| `81ea378` | feat(wave-f0-f2): real AcroForm PDFs confirmed, spec revised, templates copied, field map written | 2026-05-07 09:06 |
| `9d47574` | feat(wave-f3-f5): verifyAdmin helper, PDF generation edge fn, finalize-agreement wired | 2026-05-07 09:11 |
| `979ffde` | feat(wave-f6-f7): buyer download page + edge fn + admin PDF download button | 2026-05-07 09:14 |

---

## F0 — AcroForm field inventory + spec

**Commits:** `53f9990` (initial docs) · `81ea378` (spec rewritten against real field names)

### What it produced

Two spec documents rewritten against the actual PDF field names discovered via `pdf-lib`:

**`docs/spec/pdf-acroform-fields.md`** — canonical AcroForm field registry:
- `deposit_agreement_template.pdf`: **95 fields**, camelCase naming, 4 pages
- `purchase_agreement_template.pdf`: **47 fields**, `pa_*` prefix naming, 6 pages
- Payment method, authorized seller, and acknowledgments are **checkboxes**, not text fields
- Ack1–Ack7 mapped to DB `ack_*_at` columns; ack4/ack5 fall back to `buyer_signed_at`
- PA mirror fields documented (`pa_sig_*`)

**`docs/spec/pdf-field-disambiguation.md`** — resolves every naming ambiguity:
- Puppy DOB vs buyer DOB (buyer DOB not collected → no field)
- Signature mirror rule (`_2` suffix = same DB source, second appearance)
- Payment method + authorized seller as text with lookup maps
- Ack fields filled as read-only timestamp text (not live checkboxes)
- `balance_due` computed formula, combined vs split address, parked field blocklist
- `assertAllFieldsPresent` behavior spec

**P3 confirmed:** All Dream Puppies PDF templates are blank AcroForm-ready; no existing buyer data.

### Infrastructure change
- `.gitignore` + `.husky/pre-commit`: carved out `supabase/functions/_shared/pdf/templates/*.pdf`  
  so blank AcroForm templates can be committed without triggering the business-doc block.

---

## F1 — PDF templates committed

**Commit:** `81ea378`

Blank AcroForm templates copied into the edge-function shared layer:

| File | Size | Fields | Pages |
|---|---|---|---|
| `supabase/functions/_shared/pdf/templates/deposit_agreement_template.pdf` | 78 KB | 95 AcroForm fields | 4 |
| `supabase/functions/_shared/pdf/templates/purchase_agreement_template.pdf` | 104 KB | 47 AcroForm fields | 6 |

Read at runtime via `Deno.readFile(new URL("./templates/...", import.meta.url))`.

---

## F2 — Field-map module

**Commit:** `81ea378`

New: `supabase/functions/_shared/pdf/depositAgreementFieldMap.ts`

Complete `fillDepositAgreement()` function with:
- All lookup tables: `HOW_HEARD`, `pcq1-6`, pickup time/day, payment method, authorized seller, ack1-7
- Date formatters
- Buyer initials derivation
- `AUTHORIZED_SELLERS` constant
- `assertAllFieldsPresent(form)` — throws loudly with a list of missing field names if template drifts from the map

---

## F3 — Shared `verifyAdmin` helper extracted

**Commit:** `9d47574`

New: `supabase/functions/_shared/auth/verifyAdmin.ts`

Extracts the JWT + profile-role check previously inlined in `finalize-agreement` (lines 25–66).  
Returns a discriminated-union result matching the `verifyBuyerToken` pattern.  
Consumed by `finalize-agreement` (refactored, no behavior change), `generate-agreement-pdf`, and Wave H functions (`finalize-pickup-handover`, `generate-dispute-evidence-packet`).

---

## F4 — `generate-agreement-pdf` edge function + `agreements` storage bucket

**Commit:** `9d47574`

**Migration:** `supabase/migrations/20260506000013_agreements_storage_bucket.sql`  
- Creates private `agreements` bucket with admin-only RLS  
- Buyers download via signed URLs (Wave F6), never direct access

**New shared module:** `supabase/functions/_shared/pdf/generateDepositPdf.ts` (240 lines)

Full logic:
1. Fetches agreement row with puppy + litter join (for dam/sire/sex)
2. Loads `deposit_agreement_template.pdf` via `Deno.readFile`
3. Calls `assertAllFieldsPresent(form)` — fails loudly on drift
4. Calls `fillDepositAgreement(form, agreement, puppy, litter)`
5. `form.flatten()` → bytes
6. Uploads to `agreements/{agreement_id}/{agreement_number}.pdf`
7. Updates `deposit_agreements.signed_pdf_storage_path` (service role)
8. Sets `agreement_status = 'complete'` (terminal happy-path state)
9. **Idempotent:** returns early if `signed_pdf_storage_path` already set

**New edge function:** `supabase/functions/generate-agreement-pdf/index.ts` (86 lines)  
Thin admin-auth wrapper around `generateDepositPdf` for direct admin UI calls (F7) and retries.  
Returns `{ pdf_path, download_url }` on success.

---

## F5 — Wire PDF generation into `finalize-agreement`

**Commit:** `9d47574`

`finalize-agreement/index.ts` updated:
- After the existing `admin_approved` UPDATE, calls `generateDepositPdf` synchronously (no HTTP hop, no queue)
- PDF failure is **logged but does not block** buyer/admin emails — agreement stays `admin_approved`; admin can retry via `generate-agreement-pdf` standalone
- `agreementFinalizedBuyer` email template gains an optional `downloadUrl` parameter — when present, renders a CTA button + "link active for 30 days" copy above the closing paragraph

---

## F6 — Tokenized buyer PDF download

**Commit:** `979ffde`

**New edge function:** `supabase/functions/agreement-download-url/index.ts` (92 lines)  
Public (no JWT). Takes `{ agreement_id, buyer_access_token }`, validates via `verifyBuyerToken`, confirms `signed_pdf_storage_path` is set, mints a 1-hour signed URL from the `agreements` bucket, and returns it. Each call mints fresh — URL never cached, never emailed directly.

**New page:** `src/pages/AgreementDownload.tsx` (139 lines)  
React page at route `/agreements/:agreementId/:buyerToken/download`.  
On mount: calls `agreement-download-url`, redirects to signed URL.  
Handles all error states: not found, token expired, PDF not ready yet.

**Route wired:** `src/App.tsx` — lazy import + route for `AgreementDownload`.

**Email copy pattern:** "This link is active for 30 days; the file download itself opens for 1 hour after each click."

---

## F7 — Admin PDF download button

**Commit:** `979ffde`

**Service layer:** `src/lib/admin/agreements-service.ts` — `getAgreementPdfUrl(storagePath)` mints a 1-hour signed URL from the `agreements` bucket on each call.

**Admin UI:** `src/pages/admin/AgreementDetailPanel.tsx` — `AgreementPdfCard` component appears when `signed_pdf_storage_path` is set. "Download Agreement PDF" button calls `getAgreementPdfUrl` on each click (fresh URL per click, never stale).

---

## Files shipped in Wave F

| Path | Status |
|---|---|
| `supabase/functions/_shared/pdf/templates/deposit_agreement_template.pdf` | New |
| `supabase/functions/_shared/pdf/templates/purchase_agreement_template.pdf` | New |
| `supabase/functions/_shared/pdf/depositAgreementFieldMap.ts` | New |
| `supabase/functions/_shared/pdf/generateDepositPdf.ts` | New |
| `supabase/functions/_shared/auth/verifyAdmin.ts` | New |
| `supabase/functions/generate-agreement-pdf/index.ts` | New |
| `supabase/functions/agreement-download-url/index.ts` | New |
| `supabase/migrations/20260506000013_agreements_storage_bucket.sql` | New |
| `docs/spec/pdf-acroform-fields.md` | Rewritten |
| `docs/spec/pdf-field-disambiguation.md` | Rewritten |
| `src/pages/AgreementDownload.tsx` | New |
| `src/lib/admin/agreements-service.ts` | Updated (added `getAgreementPdfUrl`) |
| `src/pages/admin/AgreementDetailPanel.tsx` | Updated (added `AgreementPdfCard`) |
| `supabase/functions/finalize-agreement/index.ts` | Updated (verifyAdmin refactor + generateDepositPdf call) |
| `supabase/functions/_shared/email/templates.ts` | Updated (downloadUrl param in buyer template) |
| `src/App.tsx` | Updated (AgreementDownload route) |
| `.gitignore` | Updated (PDF template carve-out) |
| `.husky/pre-commit` | Updated (PDF template carve-out) |

---

## Open items at Wave F close

| Item | Status |
|---|---|
| Local end-to-end test (real PDF fill + verify) | **Not run yet — Step 2 of pre-deploy checklist** |
| `assertAllFieldsPresent` against real template | Passes in unit tests with mocked form; not verified against actual loaded template in staging |
| Buyer download URL integration test | Not run against staging |
| Admin download button signed URL flow | Not verified against real storage |
| FL venue clause (`ack_florida_venue_at`) | Column exists; **attorney review required before production** |
