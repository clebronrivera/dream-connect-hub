# ADR-002: TypeScript strictness strategy

**Status**: Accepted
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

1. **Immediately**: Remove contradictory overrides from root `tsconfig.json`.
   The root uses project references and should not set strictness flags that
   override the app config.

2. **Current state**: Keep `"strict": false` with individual flags enabled.
   This is the enforced baseline right now.

3. **Future**: Move to `"strict": true` in a dedicated cleanup branch. This
   will additionally enable `strictBindCallApply`, `strictFunctionTypes`,
   `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, and
   `useUnknownInCatchVariables`. Each should be evaluated for the number
   of errors it introduces.

## Consequences

- IDE and build now agree on type checking rules.
- The codebase is not yet fully strict, but the path is clear.
- The strict-mode migration should be a separate branch, not mixed with
  feature work.
