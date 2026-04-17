# Changelog

All notable changes, additions, fixes, and known problems for **Puppy Heaven (Dream Connect Hub)** are recorded here. Use this file to track what changed and why.

Format: entries are grouped by date (newest first). Each entry lists **Added**, **Changed**, **Fixed**, or **Known issues** as applicable.

---

## 2026-04-15

### Added

- **Deposit Request Flow** — End-to-end request → approval → agreement workflow that bridges the gap between a customer expressing interest and the existing legal deposit form. See `docs/DEPOSIT_REQUEST_FLOW.md` for full details.
  - Public-facing **"Request a Deposit Reservation"** form replaces the prior generic inquiry modal on `/upcoming-litters`. Phone is now required (used for SMS). Includes 24-48hr review messaging, "no guarantee of placement" disclaimer, and an expedite phone CTA.
  - New admin page at `/admin/deposit-requests` with status badges (Pending / Accepted / Link Sent / Converted / Declined), search, expandable cards, and contextual actions per status.
  - Admin can **Accept**, **Decline with reason**, **Send Deposit Link** (email + SMS), or **Resend Link**.
  - Admin-initiated requests via **"+ New Request"** dialog — creates request and sends link in one action.
  - When the customer completes the deposit agreement form (now linked via `?request=...`), the originating request is automatically marked `converted` and linked to the new agreement.
  - Dashboard stat card showing pending deposit requests count.
- **Twilio SMS integration** — New edge function `send-deposit-link` sends the deposit agreement link via Resend (email) and Twilio (SMS) with partial-failure handling. Required new secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `SITE_URL`.
- **Database webhook + admin notification** — New edge function `notify-deposit-request` fires on `deposit_requests` INSERT and emails `NOTIFY_EMAIL` recipients with request details and a deep link to `/admin/deposit-requests`.

### Changed

- **Database Schema** — Added `deposit_requests` table with phone E.164 normalization trigger and state-machine enforcement trigger. Added `deposit_request_id` FK column to `deposit_agreements`. Two unique partial indexes enforce 1-to-1 linkage between requests and agreements.
- **`src/lib/deposit-service.ts`** — `submitDepositAgreement` now accepts an optional `deposit_request_id` and writes the conversion update. Added `validateDepositRequest` helper used by `/deposit` to validate stale links and show a non-blocking warning banner when the link can't be verified.
- **Admin nav** — Added "Deposit Requests" link between Agreements and Inquiries.

### Fixed

- **`deposit_agreements` RLS bug (pre-existing)** — Prior to today, the `deposit_agreements` table had no public INSERT policy, so the `/deposit` form could not actually be submitted by buyers. Migration `20260415000000_deposit_agreements_public_insert.sql` adds a constrained public INSERT policy (admin/finalization fields must remain null) and a narrow time-window SELECT policy so the buyer's success screen can read the agreement number after submitting.

### Known issues

- **Twilio trial limitation** — SMS only delivers to phone numbers verified in the Twilio Console (Phone Numbers → Manage → Verified Caller IDs). Upgrade Twilio (~$20 credit) to send to any US number.
- **Deposit link domain** — `SITE_URL` is set to the production domain `https://puppyheavenllc.com`. For local testing, temporarily set it to `http://localhost:8080` in Edge Function secrets so email/SMS links route to the running dev server.
- **Notification email link only valid post-deploy** — The "Review in Admin" button in the new-request notification email points to `${SITE_URL}/admin/deposit-requests`, which won't resolve until the production site is deployed (or `SITE_URL` is flipped to localhost during testing).

---

## 2026-04-08

### Changed

- **Upcoming litter placeholders** — Public reservation tiles are driven by **Max deposit slots** (1–8), not min/max expected puppy count capped at six. Existing litters are trimmed/filled to match on migration.
- **Post-birth puppy records** — Saving an upcoming litter (or **Sync puppy records**) creates or updates `puppies` rows when status is Post-birth or Previous, date of birth is set, and total puppy count is positive; breed and parsed **price label** → `base_price` copy to each pup; siblings share `upcoming_litter_id`.

---

## 2026-04-07

### Added

- **Upcoming Litters Enhancements** — Added dog's name (sire/dam), estimated due date, and estimated puppy count to the public upcoming litters display.
- **Puppy Placeholders** — Implemented auto-generated puppy placeholders for upcoming litters, showing unique IDs, breed, and gender.
- **Reservation Urgency** — Added a display showing "X out of Y reserve spots have been deposited" to create urgency.
- **Consolidated Flow** — Added a link from the Available Puppies page to the Upcoming Litters section to unify the user journey.
- **Admin Lifecycle Management** — Reorganized the admin Upcoming Litter form into a two-column layout. Added a "Lifecycle & Post-Birth" section to manage pre-birth, post-birth, and previous litters.
- **Auto-Generate Puppy Slots** — Added a button in the admin dashboard to automatically generate puppy records based on the `total_puppy_count` for post-birth litters.
- **Supabase Agent Skills** — Installed Supabase MCP agent skills for better database management.

### Changed

- **Database Schema** — Added `site_settings` table, `upcoming_litter_puppy_placeholders` table, and new columns (`lifecycle_status`, `date_of_birth`, `total_puppy_count`, `deposits_reserved_count`, `max_deposit_slots`) to `upcoming_litters`. Added `upcoming_litter_id` to `puppies`.
- **Public UI** — Replaced the upcoming litters table with a card-based layout featuring a "family tree" style display with pink/blue puppy silhouettes.

### Fixed

- **Migration Syntax Error** — Fixed a syntax error in the `20250407120000_upcoming_litter_placeholders_deposits.sql` migration file and successfully pushed it to the live database.

---

## 2026-04-01 — Hotfix

### Fixed

- **Blank page on production** — `UpcomingLittersList.tsx` and `BreedingDogsList.tsx` still referenced `supabase.from()` in their `queryFn` after the `supabase` import was removed in Phase 5 service layer migration. The variable resolved to `undefined` at runtime, crashing React before any route could render. TypeScript did not catch this because `supabase` existed as a re-export in the bundled module scope — the name was ambient but not actually imported into the file. Fixed by adding `fetchAdminUpcomingLitters` and `fetchAdminBreedingDogs` to the service layer and wiring both list pages to use them.

### Lesson learned

- **Type-only imports mask missing value imports.** When a file has `import type { Foo } from '@/lib/supabase'` and also uses `supabase.from()`, removing the value import while keeping the type import does not produce a TypeScript error if the variable name `supabase` is available as an ambient module export. Runtime crash, no compile error. **Mitigation:** after any service layer migration, run `grep -rn 'supabase\.' src/pages/` and verify every match either imports `supabase` or uses it through a service function. Add smoke tests for admin list pages to catch this class of error at test time.

---

## 2026-04-01 (Phase 7)

### Changed

- **Dead code removal** — removed unused `import type { Product }` from `src/pages/admin/inventory/ProductForm.tsx` (type was inferred from service return; not referenced explicitly).

- **`docs/DOCUMENTATION_INDEX.md`** — added entry for `docs/TRANSLATIONS_PUBLIC_SITE.md` (i18n strategy).

- **`docs/TECHNICAL_AUDIT_REPORT.md`** — added Section 6 "Stabilization outcome (Phases 1–7)" with before/after comparison table, dormant tabs standing rule, and updated file map for all new files created during stabilization. Updated Section 7 "What to do next" to remove resolved items (TypeScript tightening, PuppyForm split) and add current actionable items (UpcomingLitterForm, vendor bundle, consultation inbox).

---

## 2026-04-01 (Phase 6)

### Added

- **Critical-path integration tests** — 5 new test files, 31 new tests (57 total across 9 test files):
  - `src/components/ErrorBoundary.test.tsx` — renders default fallback, custom fallback prop, and children normally (3 tests).
  - `src/lib/puppy-interest-form-schema.test.ts` — schema validation (required fields, email, phone, breed array), consent tri-state (`true` / `false` / `undefined`), `formatUSPhone` utility (16 tests).
  - `src/lib/contact-messages.test.ts` — `insertContactMessage` happy path, error propagation, optional field pass-through (3 tests).
  - `src/contexts/AuthContext.test.tsx` — no-session default, admin role detection, non-admin role, PGRST116 no-profile case (4 tests).
  - `src/pages/UpcomingLitters.test.tsx` — loading spinner, empty state, single card, multiple cards, fetch error state (5 tests).

### Changed

- **TypeScript flags tightened** (`tsconfig.app.json`)
  - `noImplicitAny: true` — no implicit any types anywhere in source.
  - `noUnusedLocals: true` — unused local variables are compile errors.
  - `noUnusedParameters: true` — unused function parameters are compile errors.
  - `noFallthroughCasesInSwitch: true` — prevents accidental switch fallthrough.
  - All four flags produced zero errors against the existing codebase (zero regressions).

- **Quality gate strengthened** (`package.json` `health:check` script)
  - Added `tsc --noEmit` step between tests and build.
  - New gate: `npm run lint && npm run test -- --run && tsc --noEmit && npm run build`.

---

## 2026-04-01 (Phase 5)

### Changed

- **Admin service layer** (`src/lib/admin/`) — all admin page components now import from domain service modules instead of calling `supabase.from()` directly.
  - `puppies-service.ts` — added `fetchAdminPuppies`, `deletePuppy` (alongside existing `fetchAdminPuppy`, `fetchPuppyNames`, `updatePuppy`, `createPuppy`).
  - `breeding-dogs-service.ts` — added `fetchBreedingDog`, `createBreedingDog`, `updateBreedingDog` (alongside existing `deleteBreedingDog`).
  - `inventory-service.ts` — added `fetchAdminProduct`, `updateProduct`, `createProduct` (alongside existing Kit and delete functions).
  - `litters-service.ts` — new file; `fetchLitter`, `updateLitter`.
  - `upcoming-litters-service.ts` — already existed; `PuppiesList`, `LitterForm`, `BreedingDogForm`, `ProductForm` migrated to use their respective services.
  - `business-events-service.ts` — already existed; `BusinessModes.tsx` migrated: removed local `BusinessEventRow` interface (now imported from service), replaced inline Supabase calls with `fetchBusinessEvents`, `createBusinessEvent`, `deleteBusinessEvent`.
  - Updated files: `PuppiesList.tsx`, `BreedingDogForm.tsx`, `LitterForm.tsx`, `ProductForm.tsx`.

- **Supabase client isolation** (`src/lib/supabase-client.ts`)
  - Extracted `createClient` call into `src/lib/supabase-client.ts`; `src/lib/supabase.ts` re-exports from it so all 41+ existing imports continue without change.
  - All new `src/lib/admin/` service files and storage helpers now import directly from `supabase-client`.

- **Storage helpers updated** (`src/lib/puppy-photos.ts`, `src/lib/product-photos.ts`)
  - Both now import `supabase` from `./supabase-client` instead of `./supabase`.
  - Storage consolidation (`storage-utils.ts`) skipped: the two helpers have different error contracts (throw vs. null return) making a shared factory more complex than the savings justify.

- **i18next removed**
  - `i18next` and `react-i18next` removed from `package.json` (confirmed 100% unused — never imported in any source file).
  - `npm install` run to update lockfile.
  - Authoritative i18n strategy documented in `docs/TRANSLATIONS_PUBLIC_SITE.md`: `LanguageContext` + `translations.ts` (EN/ES/PT static keys) is the sole system; Google Translate runtime is a progressive enhancement for non-keyed content.

- **Mutation pattern hook** — skipped: admin forms use two different toast libraries (`useToast` from shadcn/ui vs `sonner`), so they do not share the exact same pattern needed to justify extraction.

---

## 2026-04-01 (Phase 4)

### Changed

- **PuppyForm.tsx split** (`src/pages/admin/puppies/`) — 1,119 → ~650 lines
  - `puppy-form-schema.ts` — Zod schema (`puppySchema`), `optionalNumber` helper, `PuppyFormValues` type.
  - `puppy-form-defaults.ts` — `getPuppyFormDefaults()` (blank form) and `puppyToFormValues(puppy)` (edit mode mapping with breed canonicalization).
  - `PuppyFormPhotoSection.tsx` — file input + preview image + upload spinner.
  - `PuppyLitterSection.tsx` — litter management panel (create litter, add littermate, generate littermates, edit litter defaults).
  - `AddLittermateDialog.tsx` — self-contained dialog with own mutation: adds a single littermate, immediately navigates to edit.
  - `GenerateLittermatesDialog.tsx` — self-contained dialog with own mutation: bulk-creates N male + M female littermates and shows edit links.
  - `PuppyForm.tsx` (orchestrator) now imports all of the above; retains submit handler with all payload normalization (date nulling, price clamping, `dam_photo_path`/`sire_photo_path` denormalization preserved).

- **Puppies.tsx split** (`src/pages/`) — 932 → ~330 lines
  - `src/lib/puppy-display-utils.ts` — `getPuppyImage`, `getDisplayPrice`, `getSizeCategory`, `isPoodleOrDoodle`, `isSmallBreed` (shared display helpers).
  - `src/hooks/use-favorites.ts` — `FAVORITES_KEY` constant + `useFavorites()` hook with `localStorage` persistence.
  - `src/hooks/use-puppy-filters.ts` — `usePuppyFilters(puppies)`: encapsulates all filter/sort state (`categoryFilter`, `sizeFilter`, `breedFilter`, `sortBy`), URL `?breed=` sync, and `filteredAndSorted` memoized list.
  - `src/pages/PuppyCard.tsx` — individual puppy card (image, status badge, favorite button, share button, price, Send Interest button).
  - `src/pages/PuppyDetailModal.tsx` — full-screen detail modal (health/vaccination/microchip indicators, price, Send Interest, Contact Us).
  - `src/pages/PuppyShareDialog.tsx` — share modal with Facebook, copy-link, download-image, and native Web Share API options; share handlers are internal to the component.
  - `Puppies.tsx` (orchestrator) now imports all of the above; retains per-puppy SEO, interest form dialog, and URL routing for deep-linked puppies.

- **Breeds.tsx data extraction** (`src/pages/Breeds.tsx`) — 754 → 445 lines
  - `src/data/breeds-content.ts` — `BreedStats`, `BreedCare`, `Breed` interfaces + `BREEDS_DATA` array (7 breeds).
  - `Breeds.tsx` imports `BREEDS_DATA`, `Breed`, `BreedStats` from the new data file; contains only `BreedImage`, `formatStatKey`, and the `Breeds` page component.

---

## 2026-04-01

### Added

- **ErrorBoundary component** (`src/components/ErrorBoundary.tsx`)
  - New React class component error boundary applied at the app route level (`AppRoutes` in `src/App.tsx`).
  - Catches uncaught render errors in any route component and displays a user-friendly "Something went wrong" message with a reload button instead of a blank/crashed screen.
  - Accepts an optional `fallback` prop for custom fallback UI.
  - Logs caught errors to the console via `componentDidCatch` for debugging.

### Changed

- **Public route code-splitting** (`src/App.tsx`)
  - All public pages (`Index`, `Puppies`, `UpcomingLitters`, `Breeds`, `Contact`, `NotFound`, and dormant pages `Consultation`, `Essentials`) converted from direct static imports to `React.lazy()`.
  - These pages are already inside the existing `<Suspense>` wrapper so route transitions continue to show the loading fallback.
  - Admin pages were already lazy-loaded; this change closes the gap for public pages.
  - Result: the main JS bundle shrinks materially — each public page is now a separate chunk loaded on demand.

- **Vite chunk size warning threshold** (`vite.config.ts`)
  - Removed `chunkSizeWarningLimit: 1000` override. Vite's default (500 KB) is now active.
  - Future bundle growth that exceeds 500 KB will produce a visible warning instead of being silently hidden.

### Added

- **Independent dashboard query hooks** (`src/hooks/`)
  - `use-dashboard-stats.ts` — 5 parallel queries: active puppy count + avg days listed, unseen puppy inquiries, unseen contact messages, unseen consultations, unseen product inquiries.
  - `use-dashboard-analytics.ts` — 9 parallel queries: total inquiry counts, earliest inquiry date, sold-by-breed breakdown, breed inquiry distribution.
  - `use-dashboard-inventory.ts` — 2 parallel queries: available product count, kit count.
  - `use-dashboard-recent.ts` — 2 parallel queries: most recent 10 puppy inquiries + contact messages (typed as `RawPuppyInquiry[]` / `RawContactMessage[]`).
  - `daysSince` utility extracted to `src/lib/date-utils.ts` (was duplicated inline).

### Changed

- **Dashboard refactored to 4 independent sections** (`src/pages/admin/Dashboard.tsx`)
  - Replaced the single `useQuery(['admin-stats'])` block (18 parallel queries — all-or-nothing) with 4 independent `useQuery` calls, each with its own loading and error state.
  - Each visual section renders as soon as its own data resolves. A slow analytics query no longer blocks the operational counts from displaying. A failed recent-inquiries query shows an inline error in only that section, not the entire page.
  - Removed the full-page blocking spinner. The three clickable cards (puppies, inquiries, messages) are visible as soon as stats load — typically the fastest section.

### Changed

- **TypeScript null safety** (`tsconfig.app.json`)
  - Enabled `strictNullChecks: true` in the app TypeScript config. The codebase compiled cleanly with zero errors — existing `?.` and `??` usage was already sufficient.
  - This is the first step in progressively tightening the TypeScript config; `noImplicitAny` and other flags will follow in a later phase.

- **Defensive render guards** (`src/pages/admin/Dashboard.tsx`)
  - Added `?? []` fallback before the array casts for `stats.recentPuppyInquiries` and `stats.recentContact`. If either field is `null` or `undefined` in the API response, `.map()` now safely iterates over an empty array instead of throwing a runtime error.
  - All other audited files (`Puppies.tsx`, `UpcomingLitters.tsx`, `Consultation.tsx`, `Essentials.tsx`, `PuppyInterestForm.tsx`) were already properly guarded — no changes needed.

---

## 2026-03-31

### Changed

- **Local folder reorganization**
  - Resolved nested duplicate: local project was stored at `~/Documents/Dream Connect/dream-connect-hub/dream-connect-hub/` (double-nested). Active project moved to `~/Documents/Dream Connect/Dream Enterprises Puppy Heaven LLC/`.
  - Deleted the outer empty `dream-connect-hub/` wrapper folder.
  - `Dream-Puppies-Website` (separate repo → `github.com/clebronrivera/dream-puppies-website-version-two`) moved to `~/Documents/Archive/Dream-Puppies-Website/` — no longer actively maintained.
  - Git remote for this project unchanged: `origin` still points to `github.com/clebronrivera/dream-connect-hub`.

### Added

- **Development tracking workflow**
  - Added `docs/DEVELOPMENT_TRACKING.md` with a standard process to run health checks, update logs, commit, and push each change.
  - Added `docs/DEVELOPMENT_LOG.md` as a chronological delivery log for quick project-progress tracking.
  - Added `npm run health:check` script to run lint + tests + build in one command before shipping.
  - Added `npm run ship -- "message"` and `npm run ship:skip-health -- "message"` to automate track + commit + push flow.

### Fixed

- **Puppy inquiry communications consent handling**
  - Updated `src/components/PuppyInterestForm.tsx` to preserve tri-state consent values by storing `consentCommunications` as `true`, `false`, or `null` (unspecified), instead of converting unspecified to `false`.
  - Updated consent section heading text from `Stay Connected *` to `Stay Connected (Optional)` to match schema behavior and avoid required-field confusion.

---

## 2025-03-15

### Added

- **Upcoming Litters – Past dogs from this line (up to 3 images)**
  - Admin: In **Admin → Upcoming Litters → Edit**, new section **“Past dogs from this line (up to 3 images)”** lets you upload up to 3 photos per litter. Stored in `upcoming_litters.example_puppy_image_paths` and in the `puppy-photos` bucket.
  - Public: On the **Upcoming Litters** page, when a litter has at least one past-dog image, a section is shown with the heading **“Past puppies from our lines”** and those images (max 3). If a litter has no past-dog images, that section is **not rendered** (no blank block).
- **Documentation and change tracking**
  - **CHANGELOG.md** (this file): Central place for changes, mistakes, additions, and problems.
  - **docs/DOCUMENTATION_INDEX.md**: Index of all project docs and what each is for.

### Changed

- **Dam and sire photos on Upcoming Litters cards**
  - Card photos for dam/sire now come from the **selected** dam/sire in **Breeding Dogs** (joined via `dam_id` / `sire_id`). No change to where photos are uploaded: still **Admin → Breeding Dogs** only. Public fetch in `src/lib/upcoming-litters.ts` joins `breeding_dogs` so each card uses the correct `photo_path` for the chosen dam/sire.
  - **Upcoming Litters** page: Defensive handling so dam/sire are read correctly even if the API returns them as a single-element array; fallback chain remains: joined `dam/sire.photo_path` → legacy `dam_photo_path`/`sire_photo_path` → placeholder.
  - Important clarification from debugging: a dog can show a photo in **Admin → Breeding Dogs** and still fail to show on upcoming litter cards if the browser cannot read joined `breeding_dogs` rows (RLS/policy not applied) and the litter row's fallback `dam_photo_path` / `sire_photo_path` is blank. To prevent that, `src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx` now denormalizes the selected dogs' current `photo_path` values onto the litter row when saving.
- **QueryClient location**
  - `createAppQueryClient()` moved from `src/App.tsx` to **src/lib/query-client.ts** so the app entry only exports components (fixes react-refresh lint). `scripts/postbuild-seo.tsx` updated to import from the new module.

### Fixed

- **Homepage banner / SEO image 400**
  - The visible homepage hero already used the local asset `/puppy-heaven-banner.jpg`, but SEO/social metadata was still defaulting to a Supabase `site-assets` URL that returned `400` in the browser.
  - Default social image resolution in `src/lib/seo.ts` now uses the same local banner image (resolved from `VITE_SITE_URL` or current origin), so `og:image` / `twitter:image` no longer request the broken Supabase banner path unless `VITE_BANNER_IMAGE_URL` explicitly overrides it.
- **ESLint (health check)**
  - **App.tsx:** Removed export of `createAppQueryClient`; import from `@/lib/query-client` to satisfy react-refresh/only-export-components.
  - **ContactMessageDetailDialog.tsx:** `useEffect` dependency array set to `[message]` to satisfy react-hooks/exhaustive-deps.
  - **PuppyInquiryDetailDialog.tsx:** `useEffect` dependency array set to `[inquiry]` for the same rule.
  - **ContactMessageInboxList.tsx:** `messages` wrapped in `useMemo(() => data?.rows ?? [], [data?.rows])` so the effect dependency is stable.
  - **PuppyInquiryInboxList.tsx:** `inquiries` wrapped in `useMemo(() => data?.rows ?? [], [data?.rows])` for the same reason.
- **Build / test:** Lint passes with 0 errors and 0 warnings; `npm run build` and `npm run test` succeed (25 tests).

### Notes

- Dam and sire photos are **not** uploaded from the Upcoming Litter form; they are managed only under **Admin → Breeding Dogs**. Assign dam/sire per litter in **Admin → Upcoming Litters → Edit** (Parents section); the public card then shows that breeding dog’s photo when available.
- Troubleshooting shortcut for missing upcoming litter parent photos:
  - 1. Check **Admin → Breeding Dogs** for the dog's `photo_path` / thumbnail.
  - 2. Check the upcoming litter row has `dam_id` / `sire_id` set to the intended dogs.
  - 3. If cards still show placeholders, verify whether browser-side joins to `breeding_dogs` are returning `null`; if so, confirm the public-read policy from `supabase/migrations/20250318000000_breeding_dogs_public_read.sql` is actually applied in Supabase.
  - 4. If the policy is not yet applied, the site should rely on `upcoming_litters.dam_photo_path` / `sire_photo_path`, so re-save the litter or backfill those columns from the selected breeding dogs.

### Reference: dam/sire pairings for upcoming litters

Official pairings (used by seed and assign script):

| Litter order | Dam  | Sire |
|--------------|------|------|
| 1            | Star | Bruno |
| 2            | Trixie | Coco |
| 3            | Luna | Bruno |
| 4            | Puerto | Rico |

- **Seed (creates dogs + litters with these pairings):** `node scripts/seed-breeding-dogs-and-litters.js`
- **Assign pairings to existing litters only:** `node scripts/assign-dam-sire-to-upcoming-litters.js` (assigns by order: 1st litter → Star/Bruno, 2nd → Trixie/Coco, etc.)

---

## Earlier work (pre–changelog)

For earlier refactors, audit outcomes, and file map, see **[docs/TECHNICAL_AUDIT_REPORT.md](docs/TECHNICAL_AUDIT_REPORT.md)**. That report covers:

- Supabase/env consolidation, inquiry contracts, admin inquiry UI, performance (staleTime, pagination), dead code removal, and related file locations.

---

*When adding new entries: keep the newest date at the top; use Added / Changed / Fixed / Known issues; and add a short note when something was reverted or deprecated.*
