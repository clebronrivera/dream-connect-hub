# BACKEND_CONTRACT.md

Audit date: 2026-03-07
Scope: read-only audit of `/Users/lebron/Documents/Dream Connect/dream-connect-hub/dream-connect-hub`

This document reflects what the frontend currently expects from Supabase (DB, Storage, Auth, Edge Functions, Webhooks), plus known schema drift risks.

---

## 1. DATABASE TABLES

### Canonical-source warning
- There are **multiple SQL sources of truth**:
  - `supabase/migrations/*.sql` (intended migration path)
  - `supabase-schema.sql` (manual bootstrap)
  - `supabase-puppies-table.sql` (manual puppies table bootstrap)
  - `fix-rls-policies.sql` (manual patch, if needed)
- The app behavior appears aligned to migrations + current TS types in `src/lib/supabase.ts`.

### `puppies`
Source: `supabase-puppies-table.sql` + migrations `20250214000000_add_listing_date_and_admin_viewed.sql`, `20250224000000_litters_table_and_puppy_litter_id.sql`, `20250306100000_microchipped_always_true.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | gen_random_uuid() | PK |
| puppy_id | text | no |  | UNIQUE |
| name | text | yes |  |  |
| breed | text | yes |  |  |
| gender | text | no |  | CHECK in ('Male','Female') |
| color | text | no |  |  |
| date_of_birth | date | no |  |  |
| age_weeks | integer | no |  |  |
| ready_date | date | no |  |  |
| base_price | decimal(10,2) | no |  |  |
| discount_active | boolean | no | false |  |
| discount_amount | decimal(10,2) | no |  |  |
| discount_note | text | no |  |  |
| final_price | decimal(10,2) | no |  |  |
| status | text | no | 'Available' | CHECK in ('Available','Pending','Sold','Reserved') |
| photos | text[] | no |  | URL array |
| primary_photo | text | no |  | URL |
| description | text | no |  |  |
| mom_weight_approx | integer | no |  |  |
| dad_weight_approx | integer | no |  |  |
| vaccinations | text | no |  |  |
| health_certificate | boolean | no | false | App usually forces true on save |
| microchipped | boolean | no | true (post-migration) | was false originally |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | trigger-updated |
| created_by | uuid | no |  | FK -> `auth.users(id)` |
| featured | boolean | no | false |  |
| display_order | integer | no | 0 |  |
| listing_date | date | no | CURRENT_DATE | added by migration |
| litter_id | uuid | no |  | FK -> `litters(id)` ON DELETE SET NULL |

Keys and constraints:
- PK: `id`
- FK: `created_by -> auth.users(id)`
- FK: `litter_id -> litters(id)`
- UNIQUE: `puppy_id`

Derived/computed:
- `updated_at` trigger: `update_puppies_updated_at()` in `supabase-puppies-table.sql`

Read files (`.select`):
- `src/pages/Puppies.tsx`
- `src/pages/Contact.tsx`
- `src/lib/litter-api.ts`
- `src/pages/admin/puppies/PuppyForm.tsx`
- `src/pages/admin/puppies/PuppiesList.tsx`
- `src/pages/admin/Dashboard.tsx`
- `scripts/list-puppies.js`
- `scripts/verify-puppy-photos.js`
- `scripts/remove-sample-puppies.js`
- `scripts/setup-puppies-table.js`

Write files (`insert/update/delete/upsert`):
- `src/lib/litter-api.ts` (insert/update)
- `src/pages/admin/puppies/PuppyForm.tsx` (insert/update)
- `src/pages/admin/puppies/PuppiesList.tsx` (delete)
- `scripts/upload-puppy-images-to-supabase.js` (update)
- `scripts/remove-sample-puppies.js` (delete)

---

### `puppy_inquiries`
Source: `supabase-schema.sql` + migration `20250208000000_consultation_puppy_flows.sql` + migrations `20250214000000_add_listing_date_and_admin_viewed.sql`, `20250307100000_puppy_inquiries_followed_up_at.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | uuid_generate_v4() | PK |
| puppy_id | text | no |  | No FK; stores puppy UUID string from form |
| puppy_name | text | no |  |  |
| puppy_code | text | no |  | ⚠️ legacy (schema file only) |
| puppy_display_name | text | no |  | ⚠️ legacy (schema file only) |
| name | text | yes |  |  |
| email | text | yes |  |  |
| phone | text | no |  |  |
| message | text | no |  | legacy/general |
| status | text | no | 'active' | CHECK active/inactive (migrated from new/reviewed/contacted) |
| created_at | timestamptz | no | now() |  |
| city | text | no |  |  |
| state | text | no |  |  |
| interested_specific | boolean | no |  |  |
| timeline | text | no |  |  |
| experience | text | no |  |  |
| household_description | text | no |  |  |
| preferences | jsonb | no |  | JSON schema below |
| additional_comments | text | no |  |  |
| needs_followup | boolean | no | false |  |
| puppy_name_at_submit | text | no |  | snapshot |
| puppy_status_at_submit | text | no |  | snapshot |
| admin_notes | text | no |  |  |
| assigned_to | text | no |  |  |
| admin_viewed_at | timestamptz | no |  | unseen if NULL |
| followed_up_at | timestamptz | no |  |  |

Keys and constraints:
- PK: `id`

JSON schema (`preferences` jsonb) from `src/components/PuppyInterestForm.tsx`:
- `firstName: string`
- `lastName: string`
- `sizePreference: string`
- `breedPreference: string[]`
- `genderPreference: string | undefined`
- `howHeard: string`
- `howHeardOther: string | undefined`
- `viewingPreference: string | undefined`
- `wantsAiTraining: boolean`
- `consentCommunications: boolean`

Read files:
- `src/pages/admin/Dashboard.tsx`
- `src/components/admin/PuppyInquiryInboxList.tsx`
- `src/components/admin/PuppyInquiryDetailDialog.tsx`

Write files:
- `src/components/PuppyInterestForm.tsx` (insert)
- `src/components/admin/PuppyInquiryDetailDialog.tsx` (update status/admin_notes/followed_up_at/admin_viewed_at)

---

### `consultation_requests`
Source: `supabase-schema.sql` + migration `20250208000000_consultation_puppy_flows.sql` + migration `20250214000000_add_listing_date_and_admin_viewed.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | uuid_generate_v4() | PK |
| pet_name | text | no |  | initially NOT NULL, later nullable |
| pet_type | text | no |  | initially NOT NULL, later nullable |
| breed | text | no |  |  |
| age | text | no |  |  |
| behavioral_concerns | text[] | no |  | legacy field |
| goals | text | no |  | legacy field |
| preferred_contact | text | no |  |  |
| availability | text | no |  | ⚠️ schema-file field, not used by app writes |
| consent_to_contact | boolean | no | false | ⚠️ schema-file field, not used by app writes |
| name | text | yes |  |  |
| email | text | yes |  |  |
| phone | text | no |  |  |
| city | text | no |  | ⚠️ schema-file field |
| state | text | no |  | ⚠️ schema-file field |
| status | text | no | 'active' | CHECK active/inactive |
| created_at | timestamptz | no | now() |  |
| admin_notes | text | no |  |  |
| assigned_to | text | no |  |  |
| consultation_type | text | no |  | CHECK starter/readiness/behavior |
| source_page | text | no |  | free text |
| purchased_from_puppy_heaven | boolean | no | false |  |
| purchase_date_approx | text | no |  |  |
| puppy_name_at_purchase | text | no |  |  |
| breed_at_purchase | text | no |  |  |
| phone_at_purchase | text | no |  |  |
| intake_payload | jsonb | no |  | JSON schema below |
| admin_viewed_at | timestamptz | no |  | unseen if NULL |

Keys and constraints:
- PK: `id`

JSON schema (`intake_payload` jsonb):
- `starter`: `{ help_topics: string[]; notes?: string }`
- `readiness`: `{ why_now?, primary_caregiver?, weekday_schedule?, budget_upfront?, budget_monthly?, preferred_breed_size?, other_pets_kids? }`
- `behavior`: `{ primary_issue?, secondary_issue?, issues_checklist?: string[]; context_notes? }`

Read files:
- `src/pages/admin/Dashboard.tsx` (count unseen)

Write files:
- `src/pages/Consultation.tsx` (insert)

---

### `product_inquiries`
Source: `supabase-schema.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | uuid_generate_v4() | PK |
| product_name | text | no |  | used for products and kits |
| name | text | yes |  |  |
| email | text | yes |  |  |
| phone | text | no |  |  |
| message | text | no |  |  |
| status | text | no | 'new' | CHECK new/reviewed/contacted |
| created_at | timestamptz | no | now() |  |

Keys and constraints:
- PK: `id`

Read files:
- `src/pages/admin/Dashboard.tsx`

Write files:
- `src/pages/Essentials.tsx` (insert from product and kit inquiry dialogs)

---

### `contact_messages`
Source: `supabase-schema.sql` + migration `20250208000000_consultation_puppy_flows.sql` + migrations `20250214000000_add_listing_date_and_admin_viewed.sql`, `20250225000000_upcoming_litters.sql`, `20250225100000_contact_messages_upcoming_litter_label.sql`, `20250306110000_contact_messages_city_state_interest_options.sql`, `20250307000000_contact_messages_followed_up_at.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | uuid_generate_v4() | PK |
| name | text | yes |  |  |
| email | text | yes |  |  |
| phone | text | no |  |  |
| subject | text | yes* |  | *see inconsistency note below |
| message | text | yes |  |  |
| status | text | no | 'active' | CHECK active/inactive |
| created_at | timestamptz | no | now() |  |
| admin_notes | text | no |  |  |
| admin_viewed_at | timestamptz | no |  | unseen if NULL |
| upcoming_litter_id | uuid | no |  | FK -> `upcoming_litters(id)` |
| upcoming_litter_label | text | no |  | snapshot |
| city | text | no |  |  |
| state | text | no |  |  |
| interest_options | text[] | no |  | checklist answers |
| followed_up_at | timestamptz | no |  |  |

Keys and constraints:
- PK: `id`
- FK: `upcoming_litter_id -> upcoming_litters(id)`

Inconsistency:
- `fix-rls-policies.sql` contains `ALTER COLUMN subject DROP NOT NULL`; this is **not in migrations**. App UI still always sends a subject.

Read files:
- `src/pages/admin/Dashboard.tsx`
- `src/components/admin/ContactMessageInboxList.tsx`
- `src/components/admin/ContactMessageDetailDialog.tsx`
- `scripts/test-integrations.js`

Write files:
- `src/lib/contact-messages.ts` (insert, used by `Contact` and `UpcomingLitters` flows)
- `src/components/admin/ContactMessageDetailDialog.tsx` (update status/admin_notes/followed_up_at/admin_viewed_at)
- `scripts/fix-rls-policies.js` (test inserts/deletes)

---

### `business_events`
Source: migration `20250314000000_business_events.sql` + `supabase-schema.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | gen_random_uuid() | PK |
| event_date | date | yes |  | When the event occurred |
| description | text | yes |  | What happened (e.g. "Implemented SEO on the website") |
| category | text | no |  | Optional: seo, marketing, launch, other (app-defined) |
| created_at | timestamptz | yes | now() |  |

Keys and constraints:
- PK: `id`

Access: admin-only (no public read/insert). Used to log business milestones so traffic or inquiries can be correlated later.

Read files:
- `src/pages/admin/BusinessModes.tsx`

Write files:
- `src/pages/admin/BusinessModes.tsx` (insert, delete)

---

### `upcoming_litters`
Source: migration `20250225000000_upcoming_litters.sql` + migrations `20250305000000_upcoming_litters_parents_and_timeline.sql`, `20250305100000_upcoming_litters_due_label_optional.sql`, `20250306000000_upcoming_litters_parent_breeds_and_display.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | gen_random_uuid() | PK |
| breed | text | yes |  | kept for backward compatibility |
| due_label | text | no |  | originally NOT NULL, later optional |
| price_label | text | no |  |  |
| deposit_amount | integer | yes | 0 |  |
| description | text | no |  |  |
| placeholder_image_path | text | no |  | storage path |
| deposit_link | text | no |  |  |
| cta_contact_link | text | no | '/contact' |  |
| is_active | boolean | yes | true | public visibility flag |
| sort_order | integer | yes | 0 |  |
| created_at | timestamptz | yes | now() |  |
| updated_at | timestamptz | yes | now() | trigger-updated |
| dam_name | text | no |  |  |
| sire_name | text | no |  |  |
| dam_photo_path | text | no |  | storage path; denormalized fallback copied from selected `breeding_dogs.photo_path` |
| sire_photo_path | text | no |  | storage path; denormalized fallback copied from selected `breeding_dogs.photo_path` |
| example_puppy_image_paths | text[] | no | '{}' | storage paths |
| breeding_date | date | no |  |  |
| dam_breed | text | no |  |  |
| sire_breed | text | no |  |  |
| display_breed | text | no |  | customer-facing breed |

Keys and constraints:
- PK: `id`

Derived/computed:
- `updated_at` trigger: `set_upcoming_litters_updated_at()`
- UI derives due label and date windows from `breeding_date` in `src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx` and `src/lib/litter-timeline.ts`
- Parent-photo resolution at runtime:
  - Primary source: join to `breeding_dogs` via `dam_id` / `sire_id` and read `dam.photo_path` / `sire.photo_path`.
  - Browser fallback: if join data is unavailable (for example, `breeding_dogs` public `SELECT` policy not applied in the deployed DB), UI falls back to `upcoming_litters.dam_photo_path` / `sire_photo_path`.
  - Admin save behavior: `src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx` now persists those fallback columns from the selected breeding dogs on create/update so cards still render if the join is blocked.
  - Practical debugging note: seeing a thumbnail in **Admin → Breeding Dogs** does not prove the browser can read joined `breeding_dogs` rows. Check both the dog's `photo_path` and the litter row's fallback photo columns.

Read files:
- `src/lib/upcoming-litters.ts`
- `src/pages/admin/upcoming-litters/UpcomingLittersList.tsx`
- `src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx`
- `src/pages/admin/Dashboard.tsx`

Write files:
- `src/pages/admin/upcoming-litters/UpcomingLittersList.tsx` (delete)
- `src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx` (insert/update)
- migration data patches (e.g., deactivate/parent-breed backfill)

---

### `litters`
Source: migration `20250224000000_litters_table_and_puppy_litter_id.sql` + migration `20250306100000_microchipped_always_true.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | gen_random_uuid() | PK |
| breed | text | yes |  |  |
| listing_date | date | no |  |  |
| date_of_birth | date | no |  |  |
| ready_date | date | no |  |  |
| base_price | numeric(10,2) | no | 0 |  |
| mom_weight_lbs | integer | no |  |  |
| dad_weight_lbs | integer | no |  |  |
| vaccinations | text | no |  |  |
| health_certificate_default | boolean | no | false |  |
| microchipped_default | boolean | no | true (post-migration) | was false |
| status_default | text | no | 'Available' |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | trigger-updated |

Keys and constraints:
- PK: `id`

Derived/computed:
- `updated_at` trigger: `update_litters_updated_at()`

Read files:
- `src/lib/litter-api.ts`
- `src/pages/admin/litters/LitterForm.tsx`

Write files:
- `src/lib/litter-api.ts` (insert)
- `src/pages/admin/litters/LitterForm.tsx` (update)

---

### `profiles`
Source conflict: migration `20250208000000_consultation_puppy_flows.sql` vs `supabase-schema.sql`

#### Shape A (migration)
| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | gen_random_uuid() | PK |
| user_id | uuid | yes |  | UNIQUE, FK -> `auth.users(id)` ON DELETE CASCADE |
| role | text | yes | 'public' | CHECK ('admin','public') |
| created_at | timestamptz | no | now() |  |

#### Shape B (schema file)
| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| user_id | uuid | yes |  | PK + FK -> `auth.users(id)` |
| role | text | yes | 'public' | CHECK ('admin','public') |
| created_at | timestamptz | no | now() |  |

App usage only depends on:
- `user_id`
- `role`

Read files:
- `src/contexts/AuthContext.tsx`

Write files:
- No runtime frontend writes. Manual/admin scripts insert rows (`scripts/make-all-auth-users-admin.sql`, migrations).

---

### `products`
Source: migration `20250209120000_products_kits_inventory.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | gen_random_uuid() | PK |
| name | text | yes |  |  |
| description | text | no |  |  |
| category | text | yes |  | CHECK allowed categories |
| price | decimal(10,2) | yes | 0 |  |
| status | text | yes | 'available' | CHECK available/sold_out/inactive |
| photo | text | no |  | public URL |
| featured | boolean | no | false |  |
| display_order | integer | no | 0 |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | trigger-updated |
| created_by | uuid | no |  | FK -> `auth.users(id)` ON DELETE SET NULL |

Keys:
- PK: `id`
- FK: `created_by -> auth.users(id)`

Read files:
- `src/pages/Essentials.tsx`
- `src/pages/admin/inventory/ProductForm.tsx`
- `src/pages/admin/inventory/ProductsList.tsx`
- `src/pages/admin/Dashboard.tsx`

Write files:
- `src/pages/admin/inventory/ProductForm.tsx` (insert/update)
- `src/pages/admin/inventory/ProductsList.tsx` (delete)

---

### `kits`
Source: migration `20250209120000_products_kits_inventory.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | gen_random_uuid() | PK |
| name | text | yes |  |  |
| description | text | no |  |  |
| price | decimal(10,2) | yes | 0 |  |
| status | text | yes | 'available' | CHECK available/sold_out/inactive |
| photo | text | no |  | public URL |
| badge | text | no |  |  |
| featured | boolean | no | false |  |
| display_order | integer | no | 0 |  |
| created_at | timestamptz | no | now() |  |
| updated_at | timestamptz | no | now() | trigger-updated |
| created_by | uuid | no |  | FK -> `auth.users(id)` ON DELETE SET NULL |

Keys:
- PK: `id`
- FK: `created_by -> auth.users(id)`

Read files:
- `src/pages/Essentials.tsx`
- `src/pages/admin/inventory/KitForm.tsx`
- `src/pages/admin/inventory/KitsList.tsx`
- `src/pages/admin/Dashboard.tsx`

Write files:
- `src/pages/admin/inventory/KitForm.tsx` (insert/update)
- `src/pages/admin/inventory/KitsList.tsx` (delete)

---

### `kit_items`
Source: migration `20250209120000_products_kits_inventory.sql`

| Column | Type | Required | Default | Notes |
|---|---|---:|---|---|
| id | uuid | yes | gen_random_uuid() | PK |
| kit_id | uuid | yes |  | FK -> `kits(id)` ON DELETE CASCADE |
| item_text | text | yes |  |  |
| product_id | uuid | no |  | FK -> `products(id)` ON DELETE SET NULL |
| display_order | integer | no | 0 |  |
| created_at | timestamptz | no | now() |  |

Keys:
- PK: `id`
- FK: `kit_id -> kits(id)`
- FK: `product_id -> products(id)`

Read files:
- `src/pages/admin/inventory/KitForm.tsx`
- `src/pages/Essentials.tsx` (nested select from `kits`)

Write files:
- `src/pages/admin/inventory/KitForm.tsx` (insert/delete)

---

### `breeds` table check
- No `breeds` table is queried by app runtime.
- Breed content is static in `src/pages/Breeds.tsx` and options in `src/data/breedsData.ts`.

---

### Other findings
- No runtime `.rpc()` calls in frontend app code.
- Scripts use `.rpc('exec_sql', ...)` (admin tooling), but no migration defines `exec_sql`.

---

## 2. STATUS AND ENUM VALUES

### `puppies.status`
- Values: `Available`, `Pending`, `Sold`, `Reserved`
- DB default: `Available`
- Set in:
  - `src/pages/admin/puppies/PuppyForm.tsx`
  - `src/lib/litter-api.ts` (`status_default` from litter or fallback `Available`)
- Filtered in:
  - Public list: `src/pages/Puppies.tsx` (`eq('status','Available')`)
  - Contact puppy selector source: `src/pages/Contact.tsx` (`Available`)
  - Dashboard cards/metrics: `src/pages/admin/Dashboard.tsx` (`Available`, `Sold`)
  - Admin list local grouping: `src/pages/admin/puppies/PuppiesList.tsx`

### `puppy_inquiries.status`
- Values used by app: `active`, `inactive`
- DB default: `active`
- Set in:
  - Insert: `src/components/PuppyInterestForm.tsx` sets `active`
  - Update: `src/components/admin/PuppyInquiryDetailDialog.tsx`
- Filtered in:
  - `src/components/admin/PuppyInquiryInboxList.tsx` (all/active/inactive)

### `contact_messages.status`
- Values used by app: `active`, `inactive`
- DB default: `active`
- Set in:
  - Update: `src/components/admin/ContactMessageDetailDialog.tsx`
  - Insert path relies on DB default (`src/lib/contact-messages.ts`)
- Filtered in:
  - `src/components/admin/ContactMessageInboxList.tsx` (all/active/inactive)

### `consultation_requests.status`
- Values used by app: `active`, `inactive`
- DB default: `active`
- Set in:
  - Insert: `src/pages/Consultation.tsx` sets `active`
- Filtered in:
  - Dashboard only by `admin_viewed_at IS NULL` (`src/pages/admin/Dashboard.tsx`)

### `product_inquiries.status`
- Values: `new`, `reviewed`, `contacted`
- DB default: `new`
- Set in:
  - Insert path relies on DB default (`src/pages/Essentials.tsx`)
- Filtered in:
  - Dashboard count: `eq('status','new')` in `src/pages/admin/Dashboard.tsx`

### `products.status` and `kits.status`
- Values: `available`, `sold_out`, `inactive`
- DB default: `available`
- Set in:
  - Product form: `src/pages/admin/inventory/ProductForm.tsx`
  - Kit form: `src/pages/admin/inventory/KitForm.tsx`
- Filtered in:
  - Public essentials page: `src/pages/Essentials.tsx` includes only `available` + `sold_out`
  - Dashboard products card: `products.status = 'available'`

### `profiles.role`
- Values: `admin`, `public`
- DB default: `public`
- Set in:
  - SQL/admin onboarding scripts and manual inserts
- Filtered in:
  - Auth check: `src/contexts/AuthContext.tsx`
  - All admin RLS policy expressions in migrations

### Subject/type/category values
- Contact subjects set/displayed in app:
  - `Upcoming Litter` (`src/lib/inquiry-subjects.ts`)
  - `puppies` (`src/lib/inquiry-subjects.ts`)
  - `general` (`src/pages/Contact.tsx`)
  - `other` (`src/pages/Contact.tsx`)
  - `other-consultation` URL subject alias (`src/lib/inquiry-subjects.ts`, `src/pages/Consultation.tsx` link)
- Dashboard logic depends on exact upcoming-litter subject string:
  - `subject === "Upcoming Litter"` in `src/pages/admin/Dashboard.tsx`
- `consultation_type` values:
  - `starter`, `readiness`, `behavior`
- `source_page` values (TS type):
  - `consultation_pricing_card_starter`, `consultation_pricing_card_readiness`, `consultation_pricing_card_behavior`, `direct`
- `products.category` enum values:
  - `food_nutrition`, `bedding_comfort`, `toys_play`, `training_supplies`, `grooming_care`, `feeding_accessories`

Inconsistency flag:
- Historical status model (`new/reviewed/contacted`) still exists in `supabase-schema.sql` and some scripts for tables that app now treats as `active/inactive`.

---

## 3. SUPABASE STORAGE BUCKETS

### `puppy-photos`
- Defined in:
  - `supabase/migrations/20250208100000_puppy_photos_storage.sql`
- What is stored:
  - Puppy primary photos (`puppies.primary_photo`, `puppies.photos` URLs)
  - Upcoming litter parent/example images (`upcoming_litters.*_photo_path`, `example_puppy_image_paths` as storage paths)
  - Placeholder image paths for upcoming litters
- Upload path pattern(s):
  - Default UI upload (`uploadPuppyPhoto`): `${Date.now()}-${random}.${ext}` (bucket root)
    - `src/lib/puppy-photos.ts`
  - Scripted bulk upload: `puppy-photos/{puppy_id}/{filename}`
    - `scripts/upload-puppy-images-to-supabase.js`
- Upload files:
  - `src/pages/admin/puppies/PuppyForm.tsx`
  - `src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx`
  - `scripts/upload-puppy-images-to-supabase.js`
- Read/display files:
  - `src/pages/UpcomingLitters.tsx` (`getPublicUrl(path)`)
  - `src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx` previews
  - Puppy pages display full URL from DB (not direct storage path conversion)
- Cleanup/delete operations:
  - Utility exists: `deletePuppyPhoto(storagePath)` in `src/lib/puppy-photos.ts`
  - **Not currently used** by PuppyForm removal flow (removing photo in form does not delete storage object)

### `product-photos`
- Defined in:
  - `supabase/migrations/20250209120000_products_kits_inventory.sql`
- What is stored:
  - Product and kit photos (`products.photo`, `kits.photo` public URL)
- Upload path pattern:
  - `{productId}-{timestamp}.{ext}` when ID present, else `{timestamp}.{ext}`
  - `src/lib/product-photos.ts`
- Upload files:
  - `src/pages/admin/inventory/ProductForm.tsx`
  - `src/pages/admin/inventory/KitForm.tsx`
- Read/display files:
  - Public/admin pages consume stored URL in `photo` column
- Cleanup/delete operations:
  - `replaceProductPhoto` parses `/product-photos/{path}` and calls `deleteProductPhoto(oldPath)` before new upload
  - Implemented in `src/lib/product-photos.ts` and used in Product/Kit forms

### `site-assets`
- Defined in:
  - `supabase/migrations/20250209180000_site_assets_storage_bucket.sql`
- What is stored:
  - Hero/banner and breed page static images
- Read/display path construction:
  - Homepage hero banner: local public asset `/puppy-heaven-banner.jpg` (`src/pages/Index.tsx`)
  - SEO/social image default: `${VITE_SITE_URL}/puppy-heaven-banner.jpg` when `VITE_SITE_URL` is available, or current browser origin + `/puppy-heaven-banner.jpg` at runtime (`src/lib/seo.ts`)
  - Breeds page base: `${VITE_SUPABASE_URL}/storage/v1/object/public/site-assets/...` (`src/pages/Breeds.tsx`)
- Upload files in repo:
  - No frontend uploader in current codebase

Policy consistency flag:
- Older storage migrations referenced `public.user_roles`; later migration `20250309000000_storage_policies_use_profiles.sql` rewrites to `public.profiles`.

---

## 4. SUPABASE AUTH MODEL

### Initialization
- Client created in `src/lib/supabase.ts` via `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, auth config)`
- Auth options:
  - `persistSession: true`
  - `autoRefreshToken: true`
  - `detectSessionInUrl: true`

### Role/admin check
- Role source: `profiles.role`
- Check path: `src/contexts/AuthContext.tsx`
  - On session load and auth state changes:
    - `.from('profiles').select('role').eq('user_id', userId).single()`
  - `isAdmin = (role === 'admin')`

### Full auth flow
1. Login form (`src/pages/admin/Login.tsx`) calls `signIn(email,password)` from auth context.
2. `AuthProvider` receives session from Supabase (`getSession`, `onAuthStateChange`).
3. For logged-in user, app queries `profiles.role`.
4. `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) gates `/admin/*`:
   - If loading -> spinner
   - If no user or not admin -> redirect `/admin/login`
   - If admin -> allow outlet

### Session handling
- Automatic token refresh enabled by Supabase client (`autoRefreshToken: true`).
- Session persisted in browser (`persistSession: true`).
- Sign-out via `supabase.auth.signOut()` in `AuthContext`.

### Protected routes/features
- All routes under `/admin` are protected by `ProtectedRoute` in `src/App.tsx`:
  - Dashboard
  - Puppies CRUD
  - Litters edit
  - Upcoming litters CRUD
  - Products/Kits CRUD
  - Inquiries views

---

## 5. ROW LEVEL SECURITY (RLS) POLICIES

### Important context
- Some enable/policy definitions are in `supabase-schema.sql` and `fix-rls-policies.sql` (manual SQL), not only migrations.
- Below lists policy definitions found in repo SQL files.

### `puppies`
- RLS enabled in:
  - `supabase-puppies-table.sql`
- Policies:
  - `Public can view available puppies only` (SELECT, anon/authenticated): `status = 'Available'`
    - `supabase/migrations/20250208000000_consultation_puppy_flows.sql`
  - `Admin can view all puppies` (SELECT, authenticated): exists admin in `profiles`
    - same file
  - `Admin can update puppies` (UPDATE, authenticated): exists admin in `profiles`
    - same file
  - `Admin can insert puppies` (INSERT, authenticated): exists admin in `profiles`
    - `supabase/migrations/20250209100000_admin_dashboard_setup.sql`
  - `Admin can delete puppies` (DELETE, authenticated): exists admin in `profiles`
    - same file
  - Legacy user_roles-based policies appear in `supabase-puppies-table.sql` (superseded)

### `puppy_inquiries`
- RLS enabled in:
  - `supabase-schema.sql` and `fix-rls-policies.sql`
- Policies:
  - `Allow public insert on puppy_inquiries` (INSERT, anon/authenticated): `WITH CHECK (true)`
    - `supabase-schema.sql` and `fix-rls-policies.sql`
  - `Admin can read puppy_inquiries` (SELECT, authenticated): admin in `profiles`
    - `supabase/migrations/20250208000000_consultation_puppy_flows.sql`
  - `Admin can update puppy_inquiries` (UPDATE, authenticated): admin in `profiles`
    - same file

### `consultation_requests`
- RLS enabled in:
  - `supabase-schema.sql` and `fix-rls-policies.sql`
- Policies:
  - `Allow public insert on consultation_requests` (INSERT, anon/authenticated): `WITH CHECK (true)`
    - `supabase-schema.sql` and `fix-rls-policies.sql`
  - `Admin can read consultation_requests` (SELECT): admin in `profiles`
  - `Admin can update consultation_requests` (UPDATE): admin in `profiles`
    - `supabase/migrations/20250208000000_consultation_puppy_flows.sql`

### `product_inquiries`
- RLS enabled in:
  - `supabase-schema.sql` and `fix-rls-policies.sql`
- Policies:
  - `Allow public insert on product_inquiries` (INSERT): `WITH CHECK (true)`
    - `supabase-schema.sql` and `fix-rls-policies.sql`
  - `Admin can read product_inquiries` (SELECT): admin in `profiles`
  - `Admin can update product_inquiries` (UPDATE): admin in `profiles`
    - `supabase/migrations/20250209100000_admin_dashboard_setup.sql`

### `contact_messages`
- RLS enabled in:
  - `supabase-schema.sql` and `fix-rls-policies.sql`
- Policies:
  - `Allow public insert on contact_messages` (INSERT): `WITH CHECK (true)`
    - `supabase-schema.sql` and `fix-rls-policies.sql`
  - `Admin can read contact_messages` (SELECT): admin in `profiles`
  - `Admin can update contact_messages` (UPDATE): admin in `profiles`
    - `supabase/migrations/20250208000000_consultation_puppy_flows.sql`

### `business_events`
- RLS enabled in:
  - `supabase/migrations/20250314000000_business_events.sql` and `supabase-schema.sql`
- Policies (admin-only; no public access):
  - `business_events_admin_select` (SELECT, authenticated): admin in `profiles`
  - `business_events_admin_insert` (INSERT, authenticated): admin in `profiles`
  - `business_events_admin_update` (UPDATE, authenticated): admin in `profiles`
  - `business_events_admin_delete` (DELETE, authenticated): admin in `profiles`

### `profiles`
- RLS enabled in:
  - `supabase/migrations/20250208000000_consultation_puppy_flows.sql`
- Policies:
  - `Users can read own profile` (SELECT): `auth.uid() = user_id`

### `products`
- RLS enabled in:
  - `supabase/migrations/20250209120000_products_kits_inventory.sql`
- Policies:
  - `Public can read products` (SELECT): `true`
  - `Admin can insert/update/delete products` with `profiles.role='admin'`

### `kits`
- RLS enabled in:
  - `supabase/migrations/20250209120000_products_kits_inventory.sql`
- Policies:
  - `Public can read kits` (SELECT): `true`
  - `Admin can insert/update/delete kits` with `profiles.role='admin'`

### `kit_items`
- RLS enabled in:
  - `supabase/migrations/20250209120000_products_kits_inventory.sql`
- Policies:
  - `Public can read kit_items` (SELECT): `true`
  - `Admin can insert/update/delete kit_items` with `profiles.role='admin'`

### `upcoming_litters`
- RLS enabled in:
  - `supabase/migrations/20250225000000_upcoming_litters.sql`
- Policies:
  - `upcoming_litters_public_read_active` (SELECT): `is_active = true`
  - `upcoming_litters_admin_read_all` (SELECT): admin in `public.profiles`
  - `upcoming_litters_admin_insert` (INSERT): admin in `public.profiles`
  - `upcoming_litters_admin_update` (UPDATE): admin in `public.profiles`
  - `upcoming_litters_admin_delete` (DELETE): admin in `public.profiles`

### `litters`
- RLS enabled in:
  - `supabase/migrations/20250224000000_litters_table_and_puppy_litter_id.sql`
- Policies:
  - `Admin can view/insert/update/delete litters` all based on admin in `profiles`
- Also repeated in helper SQL:
  - `scripts/fix-litters-rls-policies.sql`
  - `scripts/run-litters-migration.sql`

### Storage RLS (`storage.objects`)
- `puppy-photos`
  - Public read + admin insert/update/delete
  - latest admin checks use `public.profiles`
  - sources:
    - initial: `20250208100000_puppy_photos_storage.sql` (user_roles)
    - updates: `20250209100000_admin_dashboard_setup.sql`, `20250309000000_storage_policies_use_profiles.sql`
- `product-photos`
  - Public read + admin insert/update/delete via `profiles`
  - source: `20250209120000_products_kits_inventory.sql`
- `site-assets`
  - Public read + admin insert/update/delete
  - initial in `20250209180000_site_assets_storage_bucket.sql` (user_roles)
  - corrected to `profiles` in `20250309000000_storage_policies_use_profiles.sql`

---

## 6. SUPABASE EDGE FUNCTIONS

### `notify-puppy-inquiry`
- Path: `supabase/functions/notify-puppy-inquiry/index.ts`
- Trigger mechanism: HTTP endpoint intended for DB Webhook
- Expected table/event: `public.puppy_inquiries` INSERT
- Expected payload shape:
  - `{ type, table, schema, record, old_record }`
  - function ignores non-INSERT/non-matching table
- Behavior:
  - Builds HTML email from `record` fields including `preferences` JSON
  - Sends via Resend API `POST https://api.resend.com/emails`
- External dependencies:
  - Resend API
- Env vars:
  - `RESEND_API_KEY` (required)
  - `NOTIFY_EMAIL` (required; comma-separated)
  - `RESEND_FROM` (optional; default `Dream Connect <onboarding@resend.dev>`)
- Email template content:
  - tabular summary with contact info, puppy selections, preferences, follow-up flags, submitted time

### `notify-contact-message`
- Path: `supabase/functions/notify-contact-message/index.ts`
- Trigger mechanism: HTTP endpoint intended for DB Webhook
- Expected table/event: `public.contact_messages` INSERT
- Expected payload shape:
  - `{ type, table, schema, record, old_record }`
- Behavior:
  - Builds HTML email including subject, message, upcoming litter fields, interest options
  - Sends via Resend API
- External dependencies:
  - Resend API
- Env vars:
  - `RESEND_API_KEY` (required)
  - `NOTIFY_EMAIL` (required)
  - `RESEND_FROM` (optional)
- Email template content:
  - contact details table + interest options list + message block

---

## 7. WEBHOOK CONFIGURATION

⚠️ Webhooks are dashboard-managed (not migration-managed).

Expected config from code/docs:
- Webhook A:
  - Table/event: `puppy_inquiries` INSERT
  - Target: `https://<PROJECT_REF>.supabase.co/functions/v1/notify-puppy-inquiry`
  - Payload needed by function: includes `type`, `schema`, `table`, `record`
- Webhook B:
  - Table/event: `contact_messages` INSERT
  - Target: `https://<PROJECT_REF>.supabase.co/functions/v1/notify-contact-message`
  - Payload needed by function: includes `type`, `schema`, `table`, `record`

Setup documentation:
- `docs/NOTIFICATIONS.md`
- `scripts/setup-puppy-inquiry-notifications.sh`

Setup method:
- Manual in Supabase Dashboard -> Database Webhooks (or Integrations -> Webhooks)

---

## 8. ENVIRONMENT VARIABLES

### Frontend (`import.meta.env`)
| Variable | Used in | Purpose | Required |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts`, `src/pages/Index.tsx`, `src/pages/Breeds.tsx` | Supabase project URL; also used to build storage asset URLs | Yes |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` | Browser anon key | Yes |
| `VITE_BANNER_IMAGE_URL` | `src/pages/Index.tsx` | Optional explicit hero image URL override | Optional |

### Edge Functions (`Deno.env`)
| Variable | Used in | Purpose | Required |
|---|---|---|---|
| `RESEND_API_KEY` | both notification functions | Resend auth bearer token | Yes |
| `NOTIFY_EMAIL` | both notification functions | Recipient list (CSV) | Required |
| `RESEND_FROM` | both notification functions | custom from header | Optional |

### Scripts/ops (`process.env`)
| Variable | Used in | Purpose | Required |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | multiple scripts | admin/service access bypassing RLS | Usually yes for scripts |
| `SUPABASE_URL` | `scripts/verify-database.ts` fallback | alt to `VITE_SUPABASE_URL` | Optional fallback |
| `SUPABASE_PROJECT_REF` | `scripts/setup-puppy-inquiry-notifications.sh` | derive function/webhook URLs | Optional |
| `RESEND_API_KEY` | `scripts/set-resend-secret.js` | set secret via CLI | Optional input |

Declared env examples:
- `.env.example`
- `.env.local.example`

Hardcoded Supabase values check:
- `src/lib/supabase.ts` currently has **no hardcoded URL/key values**; strictly env-driven.
- Prior audit note about hardcoded values appears outdated relative to current code.

---

## 9. QUERY PATTERNS AND SELECT SHAPES

### Dashboard (`src/pages/admin/Dashboard.tsx`)
Key query set (parallel):
- `puppies`: `select('listing_date, created_at').eq('status','Available')`
- `puppy_inquiries`: count unseen `is('admin_viewed_at', null)`
- `consultation_requests`: count unseen `is('admin_viewed_at', null)`
- `product_inquiries`: count new `eq('status','new')`
- `contact_messages`: count unseen `is('admin_viewed_at', null)`
- `products`: count available `eq('status','available')`
- `kits`: total count
- earliest timestamps: `puppy_inquiries.created_at`, `contact_messages.created_at`
- sold puppies by breed: `puppies.select('breed').eq('status','Sold')`
- puppy inquiry breed join-in-app:
  - `puppy_inquiries.select('puppy_id').not('puppy_id','is',null)`
  - `puppies.select('id, breed')`
- upcoming litter inquiry breed join-in-app:
  - `contact_messages.select('upcoming_litter_id').eq('subject', SUBJECT_UPCOMING_LITTER).not('upcoming_litter_id','is',null)`
  - `upcoming_litters.select('id, breed')`
- recent rows:
  - `puppy_inquiries.select('id, created_at, name, puppy_name, puppy_name_at_submit, admin_viewed_at').order(...).limit(10)`
  - `contact_messages.select('id, created_at, name, subject, upcoming_litter_label, admin_viewed_at').order(...).limit(10)`

### Admin lists
- Puppy inquiries inbox:
  - `select('id, created_at, name, phone, email, puppy_name, puppy_name_at_submit, puppy_id', { count: 'exact' })`
  - optional `eq('status','active'|'inactive')`
- Contact inbox:
  - `select('id, created_at, name, phone, email, subject', { count: 'exact' })`
  - optional `eq('subject', ...)` or `neq('subject', ...)`
  - optional status filter
- Puppies list:
  - `select('*').order('created_at', { ascending:false })`
- Products/Kits list:
  - `select('*').order('display_order', { ascending:true })`
- Upcoming litters list:
  - `select('*').order('sort_order', asc).order('created_at', desc)`

### Public queries
- Puppies page: `puppies.select('*').eq('status','Available').order(display_order).order(created_at desc)`
- Contact page puppy subset: same as above
- Upcoming litters page + contact upcoming selector:
  - `upcoming_litters.select('*, dam:breeding_dogs!dam_id(id, name, photo_path), sire:breeding_dogs!sire_id(id, name, photo_path)').eq('is_active',true).order(sort_order).order(created_at desc)`
  - If that join errors or returns unusable parent data, `src/lib/upcoming-litters.ts` falls back to `upcoming_litters.select('*')`, which means cards depend on denormalized `dam_photo_path` / `sire_photo_path`.
- Essentials page:
  - `products.select('*').in('status',['available','sold_out']).order(display_order)`
  - `kits.select('*, kit_items(id,item_text,display_order)').in('status',['available','sold_out']).order(display_order)`

### Writes (important payloads)
- Puppy inquiry insert payload includes status and `preferences` jsonb (`src/components/PuppyInterestForm.tsx`)
- Consultation insert payload includes `consultation_type`, `source_page`, `intake_payload` jsonb (`src/pages/Consultation.tsx`)
- Contact insert payload includes optional `upcoming_litter_id`, `upcoming_litter_label`, `city`, `state`, `interest_options` (`src/lib/contact-messages.ts`)
- Upcoming litter insert/update writes parent/breed/timeline/photo-path fields (`src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx`)

### RPC calls
- Frontend app: none
- Scripts only:
  - `exec_sql` RPC attempted in several scripts (`scripts/setup-puppies-table.js`, `scripts/setup-puppy-photos-storage.js`, etc.)

### Joins / nested selects
- Essentials kits query uses nested relation:
  - `kits.select('*, kit_items ( id, item_text, display_order )')`

---

## 10. EXTERNAL INTEGRATIONS SUMMARY

### Resend
- Endpoint: `https://api.resend.com/emails`
- Called from:
  - `supabase/functions/notify-puppy-inquiry/index.ts`
  - `supabase/functions/notify-contact-message/index.ts`
- Auth: `Authorization: Bearer ${RESEND_API_KEY}`
- Templates: HTML table-style notification emails with contextual fields per inquiry type

### Netlify
- Config: `netlify.toml`
  - build command: `npm run build`
  - publish dir: `dist`
  - SPA redirect fallback to `/index.html`
  - `SECRETS_SCAN_OMIT_KEYS=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY`
- Backup redirect config: `public/_redirects`

### Supabase CLI automation (ops)
- Deployment/setup scripts for functions and secrets:
  - `scripts/setup-puppy-inquiry-notifications.sh`
  - `scripts/set-resend-secret.js`

---

## 11. DATA RELATIONSHIPS MAP

```text
auth.users
  ├─< profiles.user_id (role-based admin gating)
  ├─< puppies.created_by
  ├─< products.created_by
  └─< kits.created_by

litters
  └─< puppies.litter_id (ON DELETE SET NULL)

upcoming_litters
  └─< contact_messages.upcoming_litter_id

kits
  └─< kit_items.kit_id (ON DELETE CASCADE)

products
  └─< kit_items.product_id (ON DELETE SET NULL)

Non-FK semantic links:
- puppy_inquiries.puppy_id -> puppies.id (string match in app; no FK)
- contact_messages.subject == "Upcoming Litter" controls routing/analytics semantics
- inquiry status fields (`active/inactive`, `new/reviewed/contacted`) drive inbox/dashboard behavior

Storage associations:
- puppy-photos bucket
  - puppies.primary_photo / puppies.photos (public URLs)
  - upcoming_litters.dam_photo_path / sire_photo_path / example_puppy_image_paths (paths)
  - upcoming_litters.placeholder_image_path (path)
- product-photos bucket
  - products.photo, kits.photo (public URLs)
- site-assets bucket
  - Index/Breeds static assets via direct public URL path
```

---

## Inconsistencies and Ambiguities

### Inconsistencies found
- `profiles` table definition differs between `supabase-schema.sql` and migration `20250208000000_consultation_puppy_flows.sql` (PK structure differs).
- Status model drift:
  - Legacy schema/scripts use `new/reviewed/contacted` for inquiry tables now using `active/inactive` in app and migration.
- `contact_messages.subject` nullability drift:
  - `fix-rls-policies.sql` drops NOT NULL, while app expects required subject.
- Legacy `user_roles` references remain in older storage migrations/scripts; later migrations switch to `profiles`.
- `supabase-puppies-table.sql` is not in migrations chain but still defines key table + trigger + policies.
- Duplicate rename migrations for doodle spelling variants:
  - `20250308000000_rename_goldendoodle_1_through_5.sql`
  - `20250308100000_rename_golden_doddle_1_through_5.sql`

### Ambiguities (cannot prove from code alone)
- ⚠️ Actual production schema may differ if manual SQL files were applied out of order or partially.
- ⚠️ Webhook payload exact fields depend on Supabase Dashboard webhook settings; functions assume standard payload with `record`.
- ⚠️ `exec_sql` RPC is used by scripts but not defined in repo migrations.

### Dashboard-only / manual config items
- ⚠️ Database Webhooks setup is manual (`docs/NOTIFICATIONS.md`), not migration-managed.
- ⚠️ Edge function secrets (`RESEND_API_KEY`, etc.) are configured in Supabase dashboard/CLI, not in code.
