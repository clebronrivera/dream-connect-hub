# Technical Audit Report — Outcome & Implementation

This document is the **readable technical report** for the Deep Technical Audit of the Puppy Heaven (Dream Connect Hub) codebase. It describes what was audited, what was implemented, where changes live, and how to use the result.

---

## How to read this report

- **Sections 1–2:** Context and scope.  
- **Section 3:** Summary of outcomes (what was fixed or improved).  
- **Section 4:** Where to find everything (file map).  
- **Section 5:** How the system is wired after the implementation.  
- **Section 6:** What to do next (optional follow-ups).

The original audit findings and refactor plan live in the Cursor plan file (not in this repo): **Deep Technical Audit** plan. This report focuses on **outcomes** and **where things are** in the codebase.

---

## 1. Scope of the audit

The audit covered:

- Application architecture, routing, and component hierarchy  
- Data flow from forms → storage → admin → notifications  
- Database usage, Supabase integration, env/secrets  
- Duplication, dead code, drift, and complexity hotspots  
- Performance, build, and Netlify deployment impact  

Constraints: no live profiling; conclusions based on static inspection and repo wiring.

---

## 2. Implementation summary (by priority)

| Priority | Goal | Outcome |
|----------|------|---------|
| **P0** | Unify Supabase config and migration source-of-truth (profiles, env-driven) | Done: env-only client, no hardcoded URLs/keys; migrations/scripts/docs use `profiles`; `.gitignore` updated. |
| **P0** | Centralize inquiry contracts (subject/slug/status, shared mappers, single submit path) | Done: `inquiry-subjects`, `contact-messages`, `upcoming-litters` libs; Contact + UpcomingLitters use them; Dashboard/Inquiries use slugs. |
| **P1** | Reduce inquiry stack duplication (shared UI, single source for status/slugs) | Done: shared `Field`/`Section` and `toDatetimeLocal`; both detail dialogs use them; `StatusFilter` centralized. |
| **P1** | Dashboard/list performance (staleTime, pagination, selective fields) | Done: QueryClient `staleTime`; inbox lists paginated (50/page), selective columns; detail dialogs fetch full row by id. |
| **P2** | Remove dead code and noise | Done: legacy `leads` pages and `ConsultationDetailDialog` removed; unused UI (chart, command, drawer, carousel, calendar) removed; README and plan doc updated. |

---

## 3. Outcomes (what changed)

### Environment and backend

- **Supabase** is configured only via env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. No hardcoded project URL or anon key in app code.
- **Banner and storage URLs** (Index, Breeds) are derived from `VITE_SUPABASE_URL` or `VITE_BANNER_IMAGE_URL`. Banner overrides must use a public asset URL, not a Supabase dashboard URL, and the default banner object path is `site-assets/banner-puppies.png.jpeg`.
- **Profiles** are the single source of truth for admin; storage policies and scripts reference `profiles`, not `user_roles`.
- **Notification scripts and docs** use project ref from env (e.g. `VITE_SUPABASE_URL` or `SUPABASE_PROJECT_REF`), not a hardcoded ref.

### Inquiry and contact flows

- **Subject/slug/status** live in one place: `src/lib/inquiry-subjects.ts` (constants + `sourceToSlug`, `StatusFilter`).
- **Contact message inserts** go through `src/lib/contact-messages.ts`: `insertContactMessage`, `upcomingLitterPayloadToRow`, `ContactMessageInsert`.
- **Active upcoming litters** are loaded from one place: `src/lib/upcoming-litters.ts` (`fetchActiveUpcomingLitters`, shared query key). Used by Contact and UpcomingLitters.
- **Duplicate submit/fetch logic** for contact and upcoming-litter flows was removed; both pages use the shared libs.

### Admin inquiry UI

- **Shared building blocks:** `src/lib/date-utils.ts` (`toDatetimeLocal`), `src/components/admin/InquiryDetailShared.tsx` (`Field`, `Section`). Both Puppy and Contact detail dialogs use them.
- **Inbox lists** are paginated (50 per page), use selective columns, and detail dialogs load the full row by id when opened.
- **Dashboard** uses `sourceToSlug()` from `inquiry-subjects` for inquiry links; **Inquiries** page uses slug constants for tabs/source params.

### Performance and hygiene

- **QueryClient** has a default `staleTime` (e.g. 1 minute) to reduce refetches on tab focus.
- **Homepage banner resolution** uses the corrected default storage object path and shares the same resolver for hero and SEO/social image output.
- **Puppies page errors** now surface explicit Supabase diagnostics for missing client env vars and blocked public read access (RLS/policy), instead of a generic failure message.
- **Dead code removed:** legacy admin `leads` pages, `ConsultationDetailDialog`, `types/leads`, and unused UI components (chart, command, drawer, carousel, calendar).
- **.gitignore** includes `supabase/.temp/` to avoid commit noise.
- **README** describes the real project (setup, env, deploy, DB); **PLAN_GOLDENDOODLE** doc has a note about description-generation state.

---

## 4. Where to find everything (file map)

### New or heavily modified libs (contracts and data)

| Purpose | Location |
|--------|----------|
| Inquiry subject/slug/status constants and types | `src/lib/inquiry-subjects.ts` |
| Contact message insert type, mapper, insert function | `src/lib/contact-messages.ts` |
| Fetch active upcoming litters + shared query key | `src/lib/upcoming-litters.ts` |
| Date formatting for admin datetime-local inputs | `src/lib/date-utils.ts` |

### Supabase and env

| Purpose | Location |
|--------|----------|
| Supabase client (env-driven) + shared types | `src/lib/supabase.ts` |
| Env types for Vite | `src/vite-env.d.ts` |

### Shared admin inquiry UI

| Purpose | Location |
|--------|----------|
| Field/Section components for detail dialogs | `src/components/admin/InquiryDetailShared.tsx` |

### Pages and components that use the new flow

| Area | Files |
|------|--------|
| Contact page | `src/pages/Contact.tsx` — uses inquiry-subjects, upcoming-litters, contact-messages |
| Upcoming litters page | `src/pages/UpcomingLitters.tsx` — same |
| Admin Dashboard | `src/pages/admin/Dashboard.tsx` — uses `sourceToSlug` from inquiry-subjects |
| Admin Inquiries | `src/pages/admin/Inquiries.tsx` — uses slug constants and StatusFilter from inquiry-subjects |
| Puppy inquiry inbox/detail | `src/components/admin/PuppyInquiryInboxList.tsx`, `PuppyInquiryDetailDialog.tsx` — pagination, selective fields, fetch by id, shared Field/Section and date util |
| Contact message inbox/detail | `src/components/admin/ContactMessageInboxList.tsx`, `ContactMessageDetailDialog.tsx` — same pattern |

### Migrations and scripts

| Purpose | Location |
|--------|----------|
| Storage policies switched to `profiles` | `supabase/migrations/20250309000000_storage_policies_use_profiles.sql` |
| DB verification (profiles) | `scripts/verify-database.ts` |
| Integrations test (profiles) | `scripts/test-integrations.js` |
| Setup DB (profiles in embedded SQL) | `scripts/setup-database.js` |
| Notification deploy (env-driven project ref) | `scripts/setup-puppy-inquiry-notifications.sh` |

### Docs and config

| Purpose | Location |
|--------|----------|
| Notification setup (env-driven URLs) | `docs/NOTIFICATIONS.md` |
| Project setup, deploy, and Netlify troubleshooting | `README.md` |
| Goldendoodle plan (with audit note) | `docs/PLAN_GOLDENDOODLE_NAMES_DESCRIPTIONS.md` |
| Ignore Supabase CLI temp files | `.gitignore` (supabase/.temp/) |
| QueryClient default options | `src/App.tsx` |

### Removed (no longer in repo)

- `src/pages/admin/leads/` (PuppyInquiries, ContactMessages, ProductInquiries, Consultations, LeadsList)
- `src/components/admin/ConsultationDetailDialog.tsx`
- `src/types/leads.ts`
- `src/components/ui/chart.tsx`, `command.tsx`, `drawer.tsx`, `carousel.tsx`, `calendar.tsx`

---

## 5. Current architecture (after implementation)

- **Runtime:** Single-page React/Vite app; route-level lazy loading; global providers (QueryClient, Theme, Auth, Tooltip); client-side routing.
- **Public vs admin:** Public pages use `Layout`; admin routes are protected and use `AdminLayout`. Auth/admin role is determined via `profiles.role`.
- **Backend:** Supabase only; URL and anon key from env. Storage and tables used as before; storage policies and scripts aligned on `profiles`.
- **Inquiry flows:** One set of constants and slugs (`inquiry-subjects`), one insert path for contact/upcoming-litter (`contact-messages`), one fetch for active litters (`upcoming-litters`). Forms and admin use these; no duplicated submit or fetch logic for these flows.
- **Admin inquiry UI:** Two inbox types (puppy vs contact) with shared building blocks (Field, Section, toDatetimeLocal), pagination, selective list columns, and detail-by-id fetch.
- **State:** Local state and react-hook-form for forms; TanStack Query for server state; no global domain store. QueryClient has a default staleTime.

---

## 6. What to do next (optional)

- **PuppyForm / UpcomingLitterForm:** Still large; can be split by concern (photos, pricing, timeline, submit mapping) in a later refactor.
- **Consultation and product inquiries:** Still only reflected in dashboard counts; no dedicated admin inbox routes yet.
- **Validation:** Puppy interest uses Zod; other forms mostly HTML required. Consider centralizing validation for other intakes.
- **TypeScript:** Strict mode still off; can be tightened gradually in high-risk areas.
- **Webhooks:** Notification webhooks remain manual in the Dashboard; consider documenting or codifying per environment.

---

## Quick reference: where to look for what

| Need to… | Look at… |
|----------|----------|
| Change subject/slug/status for inquiries | `src/lib/inquiry-subjects.ts` |
| Change how contact messages are inserted | `src/lib/contact-messages.ts` |
| Change how active upcoming litters are loaded | `src/lib/upcoming-litters.ts` |
| Change Supabase URL/key or env | `.env.local` and `src/lib/supabase.ts` |
| Change shared admin detail dialog layout | `src/components/admin/InquiryDetailShared.tsx` and `src/lib/date-utils.ts` |
| Understand notification setup | `docs/NOTIFICATIONS.md` and `scripts/setup-puppy-inquiry-notifications.sh` |
| Onboard a developer | `README.md` and this report |

---

*Report generated from the Deep Technical Audit implementation. Original audit and refactor plan are in the Cursor plan file (Deep Technical Audit).*
