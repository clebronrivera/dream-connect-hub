# Upcoming Litters Simplification - Handoff

## Objective

Simplify upcoming litters to remove reservation/deposit/slot mechanics and move to a cleaner lifecycle flow:

- `pre_birth` + active litters are shown on public upcoming page.
- `post_birth` litters are not shown in public upcoming.
- Post-birth puppy generation is driven by male/female counts with total count tracking.
- Puppy public display/deceased behavior is controlled by explicit booleans.

## Outcome Summary

- Removed reserve/deposit/slot UI from public upcoming litters.
- Updated upcoming hero tag copy to pre-reserve messaging.
- Simplified admin upcoming-litter form fields.
- Added count-driven post-birth sync behavior.
- Added explicit puppy visibility/deceased booleans in app contract.
- Added a Supabase migration for schema/policy cleanup and new fields.

## Migration Applied in Codebase

New migration file:

- `supabase/migrations/20260505065200_upcoming_litters_simplify_remove_slots_add_visibility_flags.sql`

### Migration intent

1. Add `puppies.is_publicly_visible` and `puppies.is_deceased`.
2. Backfill visibility from current status.
3. Replace public puppies SELECT policy with boolean-based guard.
4. Add `male_puppy_count` and `female_puppy_count` to `upcoming_litters`.
5. Retire placeholder-slot infrastructure and related triggers/functions/FKs.
6. Drop upcoming-litter deposit/slot-era columns.

## Key App-Level Changes

### Public Upcoming Litters

- `src/pages/UpcomingLitters.tsx`
  - hero tag changed to: `Text us to pre-reserve and get first pick`

- `src/components/upcoming/UpcomingLittersSection.tsx`
  - removed:
    - reserve modal flow
    - slot tiles
    - deposit amount/refundable lines
    - deposit request CTA button
  - kept:
    - dam/sire cards + parent detail modal
    - timing windows
    - past dogs from this line images

- `src/lib/upcoming-litters.ts`
  - now fetches only active pre-birth litters:
    - `is_active = true`
    - `lifecycle_status = 'pre_birth'`
  - no longer relies on placeholder-slot join for upcoming rendering

### Admin Upcoming Litters

- `src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx`
  - removed fields:
    - deposit amount
    - refundable deposit amount
    - deposits shown as filled
    - max deposit slots
    - description
    - placeholder image path
    - deposit link
    - contact CTA link
    - sort order
  - added/retained:
    - breeding date
    - expected whelping date
    - lifecycle status
    - date of birth
    - `male_puppy_count`
    - `female_puppy_count`
    - auto-calculated `total_puppy_count`
    - dam/sire selection
    - display breed
    - past-line images
    - active toggle
  - sync behavior:
    - idempotent creation of litter-linked puppies
    - prevents duplicates on repeated save/sync
    - hides excess generated puppies instead of deleting
    - sets puppy `ready_date` from DOB

- `src/pages/admin/upcoming-litters/UpcomingLittersList.tsx`
  - removed deposit/slot columns
  - shows total + male/female counts and lifecycle/active data

- `src/lib/admin/upcoming-litters-service.ts`
  - removed sort-order dependency in fetch ordering

### Puppy Visibility / Deceased Controls

- `src/lib/supabase.ts`
  - `Puppy` includes:
    - `is_publicly_visible?: boolean`
    - `is_deceased?: boolean`
  - upcoming litter type updated for simplified contract

- `src/lib/puppies-api.ts`
  - public query now requires:
    - `is_publicly_visible = true`
    - `is_deceased = false`
    - `status = 'Available'`

- `src/pages/admin/puppies/puppy-form-schema.ts`
  - added:
    - `is_publicly_visible`
    - `is_deceased`

- `src/pages/admin/puppies/puppy-form-defaults.ts`
  - defaults:
    - `is_publicly_visible: true`
    - `is_deceased: false`

- `src/pages/admin/puppies/PuppyForm.tsx`
  - added checkboxes:
    - Show on public site
    - Mark as deceased (kept for accounting)
  - mutation guard:
    - deceased forces public visibility false

- `src/pages/admin/puppies/PuppiesList.tsx`
  - updated grouping:
    - Available = public visible, not deceased, status available
    - Sold section now includes sold/hidden/deceased

### Litter-to-Puppy Defaults

- `src/lib/litter-api.ts`
  - new puppies from litter now default:
    - `is_publicly_visible: true`
    - `is_deceased: false`

## Verification Already Run

- `npm run check` passed (lint warnings only; no errors).
- Typecheck and tests are passing after this refactor.

## What To Verify In Another Environment

## 1) Database schema + policy checks

Run in SQL editor:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'puppies'
  and column_name in ('is_publicly_visible', 'is_deceased');
```

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'upcoming_litters'
  and column_name in ('male_puppy_count', 'female_puppy_count', 'total_puppy_count');
```

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'puppies';
```

## 2) Public UI checks

- `/upcoming-litters`
  - no reserve/slot/deposit widgets
  - hero tag text uses pre-reserve wording
  - only pre-birth active litters appear

- `/puppies`
  - only public-visible, non-deceased, available puppies appear

## 3) Admin checks

- `/admin/upcoming-litters/:id/edit`
  - removed deposit/slot fields
  - male/female count updates total
  - post-birth + DOB + counts sync puppy records without duplicate creation

- `/admin/puppies/:id/edit`
  - new visibility/deceased controls available

## Notes / Known Context

- Two empty migration files were created by hung CLI attempts during local execution and removed.
- This handoff documents implemented code + migration file in repo; if running in another environment, apply migration before app smoke tests.
