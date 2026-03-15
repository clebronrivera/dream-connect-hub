# Changelog

All notable changes, additions, fixes, and known problems for **Puppy Heaven (Dream Connect Hub)** are recorded here. Use this file to track what changed and why.

Format: entries are grouped by date (newest first). Each entry lists **Added**, **Changed**, **Fixed**, or **Known issues** as applicable.

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
