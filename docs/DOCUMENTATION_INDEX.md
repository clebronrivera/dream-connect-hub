# Documentation index

Quick reference for where to find **changes, mistakes, additions, and problems** in the Puppy Heaven (Dream Connect Hub) project.

---

## Change tracking and history

| Document | Purpose |
|---------|--------|
| **[CHANGELOG.md](../CHANGELOG.md)** | **Primary place for change tracking.** Records what was added, changed, fixed, and any known issues, by date. Use this to see recent work and problems that were fixed. |
| **[docs/TECHNICAL_AUDIT_REPORT.md](TECHNICAL_AUDIT_REPORT.md)** | Audit outcomes, implementation summary, and file map from the Deep Technical Audit. Describes what was refactored, where things live, and how the system is wired. Use for historical context and “where to find what.” |

---

## Setup, deploy, and operations

| Document | Purpose |
|---------|--------|
| **[README.md](../README.md)** | Project overview, setup, environment variables, build/deploy, deployment troubleshooting, tech stack, links to other docs. |
| **[docs/NOTIFICATIONS.md](NOTIFICATIONS.md)** | Email notifications (puppy inquiry, contact message): Supabase Edge Functions, webhooks, Resend. |
| **[supabase/migrations/README_MIGRATION.md](../supabase/migrations/README_MIGRATION.md)** | How to run and manage Supabase migrations. |

---

## Features and data

| Document | Purpose |
|---------|--------|
| **[MANAGING_PUPPIES.md](../MANAGING_PUPPIES.md)** | How to manage puppies: schema, adding/editing/sold/deleting, photos (storage bucket, admin form), litters. |
| **[BACKEND_CONTRACT.md](../BACKEND_CONTRACT.md)** | Backend API / data contracts if used by the app or scripts. |
| **[docs/PLAN_GOLDENDOODLE_NAMES_DESCRIPTIONS.md](PLAN_GOLDENDOODLE_NAMES_DESCRIPTIONS.md)** | Plan for Goldendoodle names/descriptions (and audit note). |
| **[docs/IMPLEMENTATION_PLAN_UPCOMING_FEATURES.md](IMPLEMENTATION_PLAN_UPCOMING_FEATURES.md)** | Plan for upcoming features. |

---

## When to update what

- **Code or behavior change, or a fix:** Add an entry to **[CHANGELOG.md](../CHANGELOG.md)** (date, Added/Changed/Fixed/Known issues).
- **New doc or major restructure:** Add it here in the right section and, if relevant, mention it in the README or CHANGELOG.
- **Audit or refactor that changes architecture:** Update **[TECHNICAL_AUDIT_REPORT.md](TECHNICAL_AUDIT_REPORT.md)** (or add a note there pointing to CHANGELOG for ongoing changes).

---

*This index was added 2025-03-15 to keep change tracking and documentation locations in one place.*
