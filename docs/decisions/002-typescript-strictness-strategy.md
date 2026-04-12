# ADR-002: TypeScript strictness strategy

**Status**: Accepted (updated 2026-04-12)
**Date**: 2026-04-12

## Context

The project started with `"strict": false` in `tsconfig.app.json` but
individually enabled several strict flags:

- `strictNullChecks: true`
- `noImplicitAny: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

The root `tsconfig.json` previously contradicted these by setting them all
to `false`, causing IDE behavior to diverge from the build.

## Decision

1. **Done**: Removed contradictory overrides from root `tsconfig.json`.

2. **Done**: Enabled `"strict": true` in `tsconfig.app.json`. The
   individually enabled flags already covered the strict set — flipping
   to `strict: true` introduced zero new type errors. Removed the
   now-redundant individual `strictNullChecks` and `noImplicitAny` flags.

3. The app config now enforces the full strict suite: `strictNullChecks`,
   `noImplicitAny`, `strictBindCallApply`, `strictFunctionTypes`,
   `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`,
   and `useUnknownInCatchVariables`.

## Consequences

- IDE and build agree on type checking rules.
- Full strict mode is enforced — new code must be strict-compliant.
- No behavior changes were needed; this was a config-only change.
