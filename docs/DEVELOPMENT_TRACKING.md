# Development Tracking Workflow

This document defines the default workflow for tracking code changes in Puppy Heaven.

## Goals

- Keep GitHub and local development in sync.
- Keep a clear written history of why changes were made.
- Ensure every shipped change passes a health check.

## Required process for every code change

1. Create or switch to the intended branch.
2. Make code changes.
3. Run the health check:
   - `npm run health:check`
4. Update tracking docs:
   - Add an entry to `CHANGELOG.md` under the newest date.
   - Add a short delivery note to `docs/DEVELOPMENT_LOG.md`.
5. Commit with a clear message explaining intent.
6. Push to GitHub.

## Fast path (recommended)

Use one command to do the full workflow:

- `npm run ship -- "your commit message"`

This command will:

- run `npm run health:check`
- append a delivery note to `docs/DEVELOPMENT_LOG.md`
- stage all changes
- commit with your message
- push current branch to `origin`

Optional bypass (for emergency or docs-only changes):

- `npm run ship:skip-health -- "your commit message"`

## Commit message guideline

Use this format:

- First line: concise action and outcome.
- Body: why this change was needed and what behavior it protects.

Example:

`Fix consent handling to preserve unspecified preference.`

## Minimum tracking checklist before push

- [ ] `npm run health:check` passes
- [ ] `CHANGELOG.md` updated
- [ ] `docs/DEVELOPMENT_LOG.md` updated
- [ ] Commit created
- [ ] Branch pushed to GitHub

## Post-migration verification (after moving Supabase calls to services)

When migrating pages from direct `supabase.from()` calls to service functions:

1. **Remove the value import** (`import { supabase }`) and add service imports.
2. **Replace every `supabase.from()`** call in the file — not just mutations, but also `useQuery` queryFn bodies.
3. **Verify with grep:** `grep -rn 'supabase\.' src/pages/` — every match must either import `supabase` directly (e.g. for storage URLs) or call a service function.

**Why:** TypeScript does not flag a missing value import if the variable name exists as an ambient export from another module in the bundle. A file can use `import type { Foo } from '@/lib/supabase'` (type-only) and still reference `supabase.from()` without a compile error. The variable is `undefined` at runtime, crashing React. This caused a production blank page on 2026-04-01.

