# Development Log

Chronological delivery notes for shipped development work.

## 2026-04-01 — Hotfix

- **Production blank page fix:** `UpcomingLittersList` and `BreedingDogsList` called `supabase.from()` without importing `supabase` after Phase 5 migration. TypeScript didn't flag it (ambient re-export). Fixed by adding fetch functions to services and wiring list pages.

## 2026-04-01 (Phase 7)

- Phase 7 cleanup: removed unused `Product` type import from `ProductForm.tsx`; updated `DOCUMENTATION_INDEX.md` with translations doc; added stabilization outcome summary to `TECHNICAL_AUDIT_REPORT.md` (before/after table, updated file map, resolved follow-ups).

## 2026-04-01 (Phase 6)

- Phase 6 testing & quality gates: added 5 critical-path test files (ErrorBoundary, PuppyInterestForm schema, contact-messages service, AuthContext, UpcomingLitters page) — 57 tests total; enabled `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` (zero errors); added `tsc --noEmit` to health:check gate.

## 2026-04-01 (Phase 5)

- Phase 5 architecture cleanup: created admin service layer (8 domain service files in `src/lib/admin/`), isolated Supabase client into `supabase-client.ts`, migrated all direct `supabase.from()` calls out of admin pages, removed unused `i18next`/`react-i18next` packages (~100 KB bundle saving), documented definitive i18n strategy in `docs/TRANSLATIONS_PUBLIC_SITE.md`.

## 2026-04-01 (Phase 4)

- Phase 4 large-file decomposition: split PuppyForm.tsx (1119→650 lines) into 6 co-located files; split Puppies.tsx (932→330 lines) into 3 page components + 2 hooks + 1 display-utils; extracted Breeds.tsx breed data (754→445 lines) to `src/data/breeds-content.ts`.

## 2026-04-01 (Phase 2)

- Phase 1 stabilization: lazy-loaded all public routes (code-splitting), added `ErrorBoundary` at app route level for crash containment, restored Vite 500 KB chunk warning threshold.
- Phase 3 Dashboard stabilization: split single 18-query `useQuery` into 4 independent hooks (`use-dashboard-stats`, `use-dashboard-analytics`, `use-dashboard-inventory`, `use-dashboard-recent`); each section now loads and fails independently.
- Phase 2 TypeScript safety: enabled `strictNullChecks` (zero compile errors); fixed two unsafe array casts in Dashboard.tsx (`recentPuppyInquiries`, `recentContact`) that could throw on null API responses.

## 2026-03-31

- Reorganized local folder structure: project moved from nested `dream-connect-hub/dream-connect-hub/` to `Dream Connect/Dream Enterprises Puppy Heaven LLC/`. Outer wrapper deleted. `Dream-Puppies-Website` archived to `~/Documents/Archive/`.
- Added repo-level health check script: `npm run health:check`.
- Fixed puppy inquiry consent handling to preserve tri-state values:
  - `true` (opt in), `false` (inquiry-only), `null` (unspecified).
- Updated Puppy Interest form UI copy from required (`*`) to optional wording for consent.
- Added development tracking workflow in `docs/DEVELOPMENT_TRACKING.md`.

