# AGENTS.md — Dream Puppies Operations App

## Project Summary

Internal operations app for Dream Puppies (DBA of Dream Enterprises LLC).
Manages puppies, contacts, meet-and-greets, sales workflows, documents,
policies, breeding dogs, litters, and upcoming litters. Includes a public
buyer portal, PDF purchase agreement generation, email notifications via
Resend (from Supabase Edge Functions), and AI-powered training plan
generation via Supabase edge functions.

## Stack

- **Frontend**: React 18, Vite 5, TypeScript 5.8, Tailwind CSS 3, shadcn/ui (Radix primitives)
- **State / data**: TanStack React Query, Supabase JS client
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions)
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest, Testing Library
- **Linting**: ESLint 9 (flat config), typescript-eslint
- **Build tooling**: Husky pre-commit hooks, tsx for scripts

## Key Paths

| What | Where |
|---|---|
| Supabase migrations | `supabase/migrations/` |
| Edge functions | `supabase/functions/` (notify-puppy-inquiry, notify-contact-message, finalize-agreement, send-pending-reminders, generate-training-plan) |
| Service layer (data access) | `src/lib/admin/*-service.ts` |
| Zod schemas | `src/lib/puppy-interest-form-schema.ts`, `src/pages/admin/puppies/puppy-form-schema.ts` |
| Constants (single source) | `src/lib/constants/` (business.ts, deposit.ts, trainingPlan.ts) |
| Additional constants | `src/lib/inquiry-subjects.ts`, `src/lib/upcoming-pick-labels.ts` |
| Email templates | `src/lib/email/templates.ts` |
| PDF agreement template | `DreamLitter_PuppyPurchaseAgreement.pdf` (repo root) |
| Project docs | `docs/` |
| Architecture decisions | `docs/decisions/` |

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run check` | Lint + typecheck + test (fast feedback loop) |
| `npm run health:check` | Lint + typecheck + test + build (full validation) |
| `npm test` | Run vitest |
| `npm run lint` | Run ESLint |
| `supabase db push` / `npm run db:push` | Push migrations to Supabase |

## Definition of Done

- [ ] `npm run check` passes (lint, typecheck, tests)
- [ ] Manual smoke test of the affected screen(s)
- [ ] `/scratch` is clean (no leftover debug files)
- [ ] Service-layer convention preserved (no direct Supabase calls in components)
- [ ] Zod schemas updated if any data shape changed
- [ ] Constants come from single-source files, not inlined

## Folder Rules

| Folder | Purpose |
|---|---|
| `/scratch` | Temporary exploration, audits, debugging output. Git-ignored. |
| `/docs` | Permanent documentation |
| `/docs/decisions` | Architecture Decision Records (ADRs) |
| `/plans` | Active plans and proposals |
| `/plans/archive` | Completed plans |

No loose `.md` files at repo root (except AGENTS.md and README).

## Do Not Touch Without Asking

These require explicit approval before modification:

- **Supabase migrations** (`supabase/migrations/`) — never edit committed migrations; create new ones
- **Zod schema files** — changes ripple through validation and types
- **Constants files** (`src/lib/constants/`) — single source of truth for business logic values
- **Email templates** (`src/lib/email/templates.ts`)
- **Sale agreement PDF template** (`DreamLitter_PuppyPurchaseAgreement.pdf`)
- **Edge functions** (`supabase/functions/`) — deployed to production

> **Note on fal.ai**: Project docs reference a fal.ai Instagram carousel generator,
> but no active implementation exists in this branch. Do not create placeholder code for it.

## Architecture Rules

Enforce these; do not rewrite the patterns without a plan.

1. **Service layer for data access** — all Supabase queries go through
   `src/lib/admin/*-service.ts` files. Components never call Supabase directly.
2. **Zod at the boundary** — all data shapes entering or leaving the app are
   validated with Zod schemas.
3. **Constants from single-source files** — business values (prices, labels,
   deposit amounts, training plan config) come from `src/lib/constants/`,
   never inlined in components.
4. **No broad refactors mixed with features** — structural changes get their
   own branch and plan.

## Before Writing Code

1. State your assumptions
2. Propose a plan
3. Wait for approval if touching >3 files or anything in "Do Not Touch"
