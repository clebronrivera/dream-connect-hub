# Documentation index

Quick reference for where to find **specs, change history, ops runbooks, and active plans** in the Dream Puppies project.

---

## Specifications and active plans

| Document | Purpose |
|---|---|
| **[CLAUDE.md](../CLAUDE.md)** | The implementation plan. 8 sequential waves (A–H) covering audit/cleanup, token-gating, operator review form, buyer payment dashboard, schema completeness, PDF generation, tests/docs, and chargeback-defense / pickup handover. Read this for *what is being built next.* |
| **[docs/spec/dream-connect-hub.md](spec/dream-connect-hub.md)** | Stable product & field specification: 21 resolved product decisions, system surface inventory, payment-method registry, acknowledgment registry, intake + agreement field map, PDF preconditions. Read this for *what the system is and why.* |
| **[docs/status-enums.md](status-enums.md)** | Canonical source of truth for every status column (`deposit_requests.request_status`, `deposit_agreements.agreement_status`, `puppies.status`, etc.). All TypeScript types, RLS policies, and edge functions must agree with this file. |
| **[docs/IMPLEMENTATION_PLAN_UPCOMING_FEATURES.md](IMPLEMENTATION_PLAN_UPCOMING_FEATURES.md)** | Active plan for puppy pricing, upcoming-litters lifecycle, and feature visibility changes. |
| **[docs/HANDOFF_UPCOMING_LITTERS_SIMPLIFICATION.md](HANDOFF_UPCOMING_LITTERS_SIMPLIFICATION.md)** | Handoff notes for the May 2026 simplification of `upcoming_litters` (slot/deposit machinery dissolved). |

---

## Change tracking

| Document | Purpose |
|---|---|
| **[CHANGELOG.md](../CHANGELOG.md)** | **Primary change log.** Records what was added, changed, fixed, and any known issues, by date. |
| **[wave-status.md](../wave-status.md)** | Status of the security/hardening waves currently in flight (deploy + verification state per step). |

---

## Setup, deploy, and operations

| Document | Purpose |
|---|---|
| **[README.md](../README.md)** | Project overview, setup, environment variables, build/deploy, deployment troubleshooting, tech stack. |
| **[docs/NOTIFICATIONS.md](NOTIFICATIONS.md)** | Email + SMS notifications: Supabase Edge Functions, webhooks, Resend, Twilio. |
| **[docs/ops/](ops/)** | Operator runbooks (smoke tests, edge-deploy procedures). |
| **[supabase/migrations/README_MIGRATION.md](../supabase/migrations/README_MIGRATION.md)** | How to run and manage Supabase migrations. |
| **[BACKEND_CONTRACT.md](../BACKEND_CONTRACT.md)** | Backend data contract: tables, status values, storage buckets, auth model, RLS, edge functions. |

---

## Security and credentials

| Document | Purpose |
|---|---|
| **[docs/security/wave-2-pending-hardening.md](security/wave-2-pending-hardening.md)** | Outstanding Wave 2.x security hardening items (parked after the 2026-04-25 production-verification). |
| **[docs/security/credential-rotation-runbook.md](security/credential-rotation-runbook.md)** | Operator runbook for rotating Supabase, Resend, and other secrets the stack depends on. |

---

## Architectural decisions (ADRs)

| ADR | Topic |
|---|---|
| **[001](decisions/001-check-excludes-build.md)** | `npm run check` excludes the production build. |
| **[002](decisions/002-typescript-strictness-strategy.md)** | TypeScript strictness strategy. |
| **[003](decisions/003-service-layer-convention.md)** | Service-layer convention. |

Add a new ADR under `docs/decisions/` whenever you make a non-obvious architectural choice that future contributors should understand.

---

## Features and data

| Document | Purpose |
|---|---|
| **[MANAGING_PUPPIES.md](../MANAGING_PUPPIES.md)** | How to manage puppies: schema, adding/editing/sold/deleting, photos (storage bucket, admin form), litters. |
| **[docs/DEPOSIT_REQUEST_FLOW.md](DEPOSIT_REQUEST_FLOW.md)** | End-to-end deposit-request → approval → agreement workflow. State machine, RLS, edge functions, key files, verification checklist. *(Will be rewritten in Wave G2 to reflect the post-completion 13-step flow.)* |

---

## When to update what

- **Code or behavior change, or a fix:** Add an entry to **[CHANGELOG.md](../CHANGELOG.md)** (date, Added/Changed/Fixed/Known issues).
- **A wave step lands:** Update **[CLAUDE.md](../CLAUDE.md)** (mark the step done) and **[wave-status.md](../wave-status.md)** if it's a security wave.
- **Status enum value added or removed:** Update **[docs/status-enums.md](status-enums.md)** *first*, then propagate through TypeScript types, RLS, and edge functions.
- **Architectural choice with downstream consequences:** Add an ADR under `docs/decisions/`.
- **Spec change (workflow / field / decision):** Update **[docs/spec/dream-connect-hub.md](spec/dream-connect-hub.md)** so the canonical reference stays accurate.
- **New doc or major restructure:** Add it here in the right section.

---

*Last refreshed during Wave A7, 2026-05-05.*
