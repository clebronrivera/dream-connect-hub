# Lean Final Plan (Single Source)

This is the single canonical plan for Goldendoodle names and current description handling.

---

## Locked name mapping (all five are male)

Locked mapping (applied by migration `20250308000000_rename_goldendoodle_1_through_5.sql`):

| # | Name    |
|---|--------|
| 1 | Teddy  |
| 2 | Cooper |
| 3 | Finn   |
| 4 | Gus    |
| 5 | Oliver |

Run `supabase db push` (or apply migrations) to rename puppies currently named "Golden Doodle 1" … "Golden Doodle 5" in the database. You can also rename manually in Admin → Puppies if you prefer.

---

## Scope

1. Lock the five male name mappings (documented above).
2. Remove all description-generation code paths that were added during failed attempts.
3. Keep the Description textbox as manual entry only until the next generation approach is designed.

---

## Implementation summary

- **Admin form** ([src/pages/admin/puppies/PuppyForm.tsx](src/pages/admin/puppies/PuppyForm.tsx)): Removed Generate/Regenerate/Photo/Freestyle description buttons and related generation logic. The Description field remains editable manually.
- **Supabase client** ([src/lib/supabase.ts](src/lib/supabase.ts)): Removed temporary helper used for function error parsing in the generation flow.
- **Edge function**: Removed `supabase/functions/generate-puppy-copy/index.ts` from the codebase during cleanup.

---

## Acceptance criteria

- Names 1–5 are locked and documented as above.
- Description textbox still works for manual typing/editing and saves with the puppy form.
- No description-generation buttons are shown in PuppyForm.
- No code references remain for `generate-puppy-copy` invocation from the frontend.
