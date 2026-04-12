# ADR-001: npm run check excludes build

**Status**: Accepted
**Date**: 2026-04-12

## Context

The repo needs a fast feedback loop for local development and CI on PRs.
The existing `health:check` script runs lint + typecheck + test + build,
which takes significantly longer due to the Vite production build step.

Build failures in this project are almost always caused by type errors
or missing imports — both of which are already caught by `tsc --noEmit`
and ESLint. A full build adds time without catching meaningfully different
issues during normal iteration.

## Decision

- `npm run check` = lint + typecheck + test (fast, used in PRs and local dev)
- `npm run health:check` = check + build (full validation, used on main branch CI)

## Consequences

- PRs run faster. Developers get feedback in under a minute.
- Build-only failures (e.g., Vite plugin issues, asset problems) are caught
  on merge to main, not on every PR push.
- If build failures become frequent and hard to debug, we can add build back
  to PR CI as a separate job.
