# Implementation Plan: Puppy Pricing, Upcoming Litters, and Feature Visibility

This document outlines the plan to implement the requested behavior changes and feature additions. Existing structures (tables, types, routes) are extended where possible; no renames or data deletions unless required.

---

## 1. Puppy Pricing Discount Logic

### Current State
- **Database:** `puppies` already has `base_price`, `discount_active`, `discount_amount`, `discount_note`, `final_price` (see `supabase-schema.sql` and `supabase/migrations/`).
- **Types:** `Puppy` in `src/lib/supabase.ts` includes all discount fields.
- **Admin (PuppyForm):** Has Base Price, Discount Active (checkbox), Discount Amount, and Final Price as **editable** inputs. No auto-calculation; final price is manually entered.
- **Frontend (Puppies.tsx):** Uses `getDisplayPrice(puppy)` (final_price ?? base_price). When discount is active, shows final price bold and `(price + discount_amount)` strikethrough — **semantics are reversed** per spec (original should be strikethrough, final bold).

### Tasks

| # | Task | Location | Notes |
|---|------|----------|--------|
| 1.1 | **Admin: Discount toggle** | `src/pages/admin/puppies/PuppyForm.tsx` | Keep existing "Discount Active" checkbox. |
| 1.2 | **Admin: Discount amount input** | Same | Keep existing discount amount input. |
| 1.3 | **Admin: Final price read-only** | Same | Change Final Price from editable `Input` to a read-only display (e.g. `<span>` or disabled input). Compute: `final = max(0, base_price - (discount_active && discount_amount ? discount_amount : 0))`. |
| 1.4 | **Admin: Auto-update final price** | Same | On change of `base_price`, `discount_active`, or `discount_amount`, recalculate final price with the formula above and call `form.setValue('final_price', computed)`. Use `form.watch()` or `useEffect` so recalculation is immediate. |
| 1.5 | **Admin: Prevent negative / block save** | Same | Either (a) clamp displayed/saved final price to 0 when discount > base, or (b) block submit when final would be negative and show validation. Prefer clamp to 0 and allow save. |
| 1.6 | **Admin: Persist final_price on save** | Same | Ensure payload to Supabase includes the computed `final_price` (already in submit payload). |
| 1.7 | **Frontend: Price display semantics** | `src/pages/Puppies.tsx` | When discount is active: show **original (base) price** with `line-through`, then **final price** bold. When no discount: show single price (base/final). Use `base_price` for original and `final_price ?? base_price` for display price; if no final_price in DB, compute client-side same as admin. |
| 1.8 | **Frontend: Discount badge on tiles** | Same | Add a badge in **top-right** of puppy card image area. Text: `$X OFF` (e.g. `$300 OFF`) using `discount_amount`. Only render when `discount_active && discount_amount > 0`. Ensure badge does not overlap existing badges (Availability, Size): group badges in a consistent layout (e.g. top-right: discount badge above or beside availability/size, or move availability/size to bottom-left / second row). |
| 1.9 | **Detail modal price** | Same | Apply same price display rules (original strikethrough, final bold) and ensure discount badge or note is consistent. |

### Calculation Summary
- **Final price** = `discount_active && discount_amount != null && discount_amount > 0`  
  → `max(0, base_price - discount_amount)`  
  else `base_price`.
- Admin: recalc on every change; show read-only final; on submit send computed `final_price` (clamped to 0).

---

## 2. Temporarily Hide Certain Sections

### 2.1 Pet Essentials — Hidden from public, backend intact

| # | Task | Location | Notes |
|---|------|----------|--------|
| 2.1.1 | Remove nav link | `src/components/layout/Header.tsx` | Remove the `{ to: "/essentials", label: "Pet Essentials" }` entry from `navLinks`. |
| 2.1.2 | Remove footer link | `src/components/layout/Footer.tsx` | Remove the "Pet Essentials" `Link` from Quick Links. |
| 2.1.3 | Remove from homepage services | `src/pages/Index.tsx` | Remove the Pet Essentials card from the `services` array (or filter it out when rendering). |
| 2.1.4 | Keep route and page | `src/App.tsx`, `src/pages/Essentials.tsx` | Do **not** remove the route `/essentials` or the page component. Backend/inventory and any internal links remain functional; only user-facing navigation is removed. |

### 2.2 Upcoming Litters visibility control

- **Current state:** `upcoming_litters.is_active` and admin form already have "Active (show on public page)" toggle. Public page filters with `.eq("is_active", true)`.
- **Task:** Verify admin form has a clear toggle for “show on public site” (already `is_active`). No change needed if label is clear; optionally rename label to “Visible on Upcoming Litters page” for clarity.

---

## 3. Upcoming Litters — Parents (Dam / Sire)

### Database

| # | Task | Notes |
|---|------|--------|
| 3.1 | **Migration: add parent columns to `upcoming_litters`** | New migration file, e.g. `supabase/migrations/YYYYMMDD_upcoming_litters_parents.sql`. Add: `dam_name text`, `sire_name text`, `dam_photo_path text`, `sire_photo_path text`. All nullable. |
| 3.2 | **Types** | In `src/lib/supabase.ts`, extend `UpcomingLitter`: `dam_name?: string | null`, `sire_name?: string | null`, `dam_photo_path?: string | null`, `sire_photo_path?: string | null`. |

### Admin

| # | Task | Location | Notes |
|---|------|----------|--------|
| 3.3 | **Form: Dam (female) name** | `UpcomingLitterForm.tsx` | Add field: label "Dam (female parent)" — text input or select if you add a parents registry later. |
| 3.4 | **Form: Sire (male) name** | Same | Add field: label "Sire (male parent)". |
| 3.5 | **Form: Dam photo upload** | Same | Optional file upload; store path in `dam_photo_path` (use same storage bucket as placeholder, e.g. `puppy-photos` or a dedicated `litter-photos`). Reuse upload pattern from PuppyForm or product-photos. |
| 3.6 | **Form: Sire photo upload** | Same | Optional; store in `sire_photo_path`. |

---

## 4. Previous Puppy Example Images (up to 3)

### Database

| # | Task | Notes |
|---|------|--------|
| 4.1 | **Migration** | Add to `upcoming_litters`: `example_puppy_image_paths text[]` (array of up to 3 storage paths or URLs). Or three columns: `example_puppy_1_path`, `example_puppy_2_path`, `example_puppy_3_path`. Prefer single `text[]` for flexibility. |

### Admin

| # | Task | Location | Notes |
|---|------|----------|--------|
| 4.2 | **Form: Up to 3 example images** | `UpcomingLitterForm.tsx` | File inputs or upload components; store paths in the new column(s). Validate max 3. |

### Frontend

| # | Task | Location | Notes |
|---|------|----------|--------|
| 4.3 | **Litter card: show example images** | `src/pages/UpcomingLitters.tsx` | On each litter card, render up to 3 example puppy images (if present). Section can be empty if none. |

---

## 5. Upcoming Litters Page Layout (customer-facing)

| # | Task | Location | Notes |
|---|------|----------|--------|
| 5.1 | **Show parents** | `src/pages/UpcomingLitters.tsx` | Display dam and sire names (and optional photos) on each card. |
| 5.2 | **Show parent photos** | Same | If `dam_photo_path` / `sire_photo_path` exist, show thumbnails with labels "Dam" / "Sire". |
| 5.3 | **Show example puppy images** | Same | As in 4.3. |
| 5.4 | **Reserve Now button** | Same | Replace or add a primary CTA button labeled "Reserve Now" (per spec). Behavior: open Reserve Interest form (see §6), not a deposit. Optionally keep "Place deposit" as secondary. |

---

## 6. Reserve Interest List (Reserve Now → contact form)

### Behavior
- "Reserve Now" does **not** reserve a puppy; it collects Name, Email, Phone (optional) and adds the person to a notification list for that litter.

### Storage
- Use existing `contact_messages`: store `upcoming_litter_id`, and set a consistent `subject` (e.g. `"Reserve interest"` or `"Litter reserve"`) so admins can filter. Set `upcoming_litter_label` from current litter (breed + due_label) for display. No new table required.

### Tasks

| # | Task | Location | Notes |
|---|------|----------|--------|
| 6.1 | **Reserve Now modal/sheet** | `src/pages/UpcomingLitters.tsx` (or shared component) | When "Reserve Now" is clicked, open a small form: Name (required), Email (required), Phone (optional). |
| 6.2 | **Submit to contact_messages** | Same | On submit: `insert` into `contact_messages` with `name`, `email`, `phone`, `subject: "Reserve interest"`, `message` optional (e.g. empty or "Reserve interest for [litter label]"), `upcoming_litter_id`, `upcoming_litter_label`. |
| 6.3 | **Success state** | Same | Toast and close modal; optionally show "We'll notify you when puppies are available." |

---

## 7. Breeding Date Tracking

| # | Task | Location | Notes |
|---|------|----------|--------|
| 7.1 | **Migration** | New migration | Add to `upcoming_litters`: `breeding_date date`. |
| 7.2 | **Types** | `src/lib/supabase.ts` | Add `breeding_date?: string | null` to `UpcomingLitter`. |
| 7.3 | **Admin form** | `UpcomingLitterForm.tsx` | Add date input. Label: e.g. "Breeding date (date dogs tied or insemination occurred)". |

---

## 8. Automatic Litter Timeline — Birth Window

- Gestation: **60–67 days** (earliest–latest).
- From `breeding_date`:  
  - **Earliest birth** = breeding_date + 60 days  
  - **Latest birth** = breeding_date + 67 days  

| # | Task | Location | Notes |
|---|------|----------|--------|
| 8.1 | **Admin: read-only birth window** | `UpcomingLitterForm.tsx` | Compute from `breeding_date`; display as "Estimated Birth Window: Mmm D – Mmm D". Update when breeding date changes. No DB columns required if derived only; optional: store `birth_window_earliest`, `birth_window_latest` for reporting. Prefer computed on the fly. |
| 8.2 | **Public page (optional)** | `UpcomingLitters.tsx` | If you show a single "due" line, you could show this birth window instead of or in addition to `due_label`. |

---

## 9. Puppy Go-Home Timeline

- Go-home = 8 weeks (56 days) after birth.
- From birth window: add 56 days to earliest and latest birth dates → **go-home window**.

| # | Task | Location | Notes |
|---|------|----------|--------|
| 9.1 | **Admin: read-only go-home window** | `UpcomingLitterForm.tsx` | Compute: birth_earliest + 56, birth_latest + 56. Display "Estimated Go-Home Window: Mmm D – Mmm D". |
| 9.2 | **Public (optional)** | `UpcomingLitters.tsx` | Show go-home window on card if desired. |

---

## 10. Admin Interface Summary (Litter Entry)

Ensure one place that:

- Selects/enters both parents (dam, sire).
- Uploads parent photos (optional).
- Uploads up to 3 example puppy images.
- Enters breeding date.
- Shows read-only: estimated birth window, estimated go-home window.
- Includes toggle for "visible on public Upcoming Litters page" (existing `is_active`).

All in `UpcomingLitterForm.tsx` + migration for new columns.

---

## 11. Verification Checklist (Expected System Behavior)

After implementation, verify:

- [ ] Discount calculations update automatically in the admin panel when base price, discount toggle, or discount amount change.
- [ ] Final price is read-only and clamped (no negative); save succeeds with final_price persisted.
- [ ] Discount badge appears on puppy tiles only when discount is active; text "$X OFF"; no overlap with availability/size badges.
- [ ] Frontend pricing: when discount active, original price strikethrough and final price bold on listing and detail.
- [ ] Pet Essentials is hidden from header, footer, and homepage; route `/essentials` still works if opened directly.
- [ ] Upcoming litters can be hidden/shown via admin toggle (`is_active`).
- [ ] Breeding date in admin drives birth window (60–67 days) and go-home window (+56 days) as read-only.
- [ ] Reserve Now opens form (Name, Email, Phone optional); submission is stored in `contact_messages` with `upcoming_litter_id` and appropriate subject/label.
- [ ] Litter cards show dam/sire, parent photos (if any), and up to 3 example puppy images.
- [ ] Layout works on mobile and desktop (responsive cards and forms).

---

## File Change Summary

| Area | Files to touch |
|------|-----------------|
| **Pricing (admin)** | `src/pages/admin/puppies/PuppyForm.tsx` |
| **Pricing (frontend)** | `src/pages/Puppies.tsx` |
| **Hide Essentials** | `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, `src/pages/Index.tsx` |
| **Upcoming litters DB** | New migration(s): parents, example images, breeding_date |
| **Upcoming litters types** | `src/lib/supabase.ts` |
| **Upcoming litters admin** | `src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx` |
| **Upcoming litters public** | `src/pages/UpcomingLitters.tsx` |
| **Reserve interest** | Same page or small shared form component; uses existing `contact_messages` |

---

## Suggested Implementation Order

1. **Puppy pricing** (admin auto-calc + read-only final, then frontend display + badge).
2. **Hide Pet Essentials** (nav/footer/Index).
3. **Upcoming litters DB**: one migration adding `breeding_date`, `dam_name`, `sire_name`, `dam_photo_path`, `sire_photo_path`, `example_puppy_image_paths` (or 3 columns).
4. **Upcoming litters admin form**: parents, photos, example images, breeding date, read-only birth/go-home windows, visibility toggle (already present).
5. **Upcoming litters public page**: parents, photos, example images, Reserve Now button + modal form → `contact_messages`.
6. **Verification** against §11 checklist and responsive layout.

This plan reuses `puppies` discount columns, `contact_messages` for reserve interest, and `upcoming_litters.is_active` for visibility, and extends `upcoming_litters` with the new columns only.

---

## 12. Upcoming Litters: One Breed, Display Breed Under Parents, Breeding Date at Top

**Goals**

- **One breed on the card:** Only one breed is shown for the litter on the public card — the **display breed** (the final/resulting breed for that litter).
- **Same-breed default:** When dam and sire have the same breed, the default display breed is that single breed (already supported by `getDisplayBreedFromParentBreeds` in `src/lib/breed-utils.ts`).
- **Auto-populate and overwritable:** Dam/sire breeds and display breed auto-populate from data and crossbreed logic but remain editable in the admin form.
- **Layout (public card):** Move **display breed** so it appears **under the parents section**. Move **breeding date** to the **top** of the card.

### Public page (`src/pages/UpcomingLitters.tsx`)

| # | Task | Notes |
|---|------|--------|
| 12.1 | **One breed only** | Stop using "Dam Breed x Sire Breed" as the main card title. Use **display_breed** as the single breed for the litter everywhere on the card (title or subtitle; see 12.3). Fallback: `litter.display_breed ?? litter.breed ?? 'Upcoming Litter'`. |
| 12.2 | **Breeding date at top** | Show breeding date at the top of each card (e.g. first line in `CardHeader` or above the title). Format: "Breeding: MMM d, yyyy" or "Expected breeding: MMM d, yyyy". Only show when `litter.breeding_date` is set. |
| 12.3 | **Display breed under parents** | After the parents block (dam/sire names, breeds, photos), add a line such as **Breed:** [display_breed]. Do not show "Dam x Sire" as the main title; the single breed is display_breed and it sits under the parents section. |
| 12.4 | **Card title** | Card title can be generic (e.g. "Upcoming Litter") or the display breed (e.g. "Goldendoodle") — per design choice. If title is display breed, then the line under parents can be omitted or kept as "Breed: [display_breed]" for consistency. Recommended: title = display_breed so one breed is prominent; then under parents optionally repeat "Breed: [display_breed]" or omit. |
| 12.5 | **Dialog and inquiry label** | Use display_breed (or pairing) for the inquiry dialog description and `upcoming_litter_label` (e.g. display_breed + due info) so contact messages are clear. |

**Public card content order (after changes):**

1. **Top:** Breeding date (e.g. "Breeding: Mar 1, 2026").
2. **Title:** Single breed — display_breed (e.g. "Goldendoodle").
3. **Parents section:** Dam (name, breed, photo); Sire (name, breed, photo).
4. **Under parents:** "Breed: [display_breed]" (if not using display_breed as title; otherwise optional).
5. **Litter info:** Estimated birth window, go-home window, deposit amount.
6. **Example images** (if any).
7. **CTA:** "Join wait list and inquire about deposit".
8. **Page-level:** Contact us at bottom.

### Admin form (`src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx`)

| # | Task | Notes |
|---|------|--------|
| 12.6 | **Breeding date at top** | Move the **Breeding date** field to the top of the form (e.g. first or second field) so it is "up to the top" as requested. |
| 12.7 | **Display breed under Parents section** | Move the **Display breed** field from its current position (near top of form) to directly **under the Parents section** (after dam/sire breed, names, photos). Keep helper text: "Auto-filled from parent breeds; you can override." |
| 12.8 | **Same-breed default** | No code change needed if `getDisplayBreedFromParentBreeds` is used: when dam and sire are the same breed, it already returns that breed. Confirm the form's `useEffect` that sets `display_breed` from resolved dam/sire runs and that display_breed remains editable (user can overwrite). |

### Data / logic (no schema change)

- **display_breed** and **breeding_date** already exist on `upcoming_litters` and in types.
- **breed-utils:** `getDisplayBreedFromParentBreeds(dam, sire)` already returns: same breed → that breed; known crossbreed → label; else "Dam x Sire". Same-breed default is already correct.
- Admin create/update already persist `display_breed` and use form value or fallback to `getDisplayBreedFromParentBreeds(dam_breed, sire_breed)`.

### Verification

- [ ] Public card shows exactly one breed (display_breed) for the litter, not "Dam x Sire" as main title.
- [ ] When dam and sire share a breed, display breed defaults to that breed (admin and public).
- [ ] Display breed appears under the parents section on the public card.
- [ ] Breeding date appears at the top of the public card when set.
- [ ] Admin form: Breeding date is at the top; Display breed is under the Parents section; both dam/sire and display breed are editable and auto-populate as today.
