# ADR-003: Service layer convention for data access

**Status**: Accepted
**Date**: 2026-04-12

## Context

The admin side of the app accesses Supabase data through service files
in `src/lib/admin/` (e.g., `puppies-service.ts`, `litters-service.ts`,
`agreements-service.ts`). These encapsulate all Supabase client calls —
queries, inserts, updates, and RPC calls — behind named functions.

Components consume these via TanStack React Query hooks, never calling
the Supabase client directly.

## Decision

All data access goes through `src/lib/admin/*-service.ts` files.
Components must not import or use the Supabase client directly.

This is a service-layer pattern (not a full repository pattern — there is
no abstract interface or dependency injection). The naming convention is
`{entity}-service.ts` with exported async functions.

### Rules

1. New data access = new or updated service file.
2. Service functions return typed data; Supabase error handling happens
   inside the service.
3. Components use React Query hooks that call service functions.
4. If a service function needs Zod validation, the schema import goes
   in the service file, not the component.

## Consequences

- Supabase client usage is centralized and auditable.
- Changing the database schema requires updating service files, not
  hunting through components.
- Testing can mock at the service boundary.
- This is not a full repository abstraction — swapping Supabase for another
  backend would still require rewriting service internals. That trade-off
  is acceptable for this project's scale.
