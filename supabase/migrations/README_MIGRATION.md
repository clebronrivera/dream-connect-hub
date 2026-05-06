# Database migrations

## Preferred: Supabase CLI

1. **Link to your project** (one-time):

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. **Apply migrations**:

   ```bash
   supabase db push
   ```

   Or: `npm run db:push`

The migrations directory is the source of truth for the live schema. Apply
them in timestamp order against a fresh project to recreate the schema.

## Manual fallback

1. Open your **Supabase project** → SQL Editor.
2. Run each migration file in **timestamp order** (oldest first).
3. Create an admin user: Supabase Auth → Users → Add user, then add a row to
   **`profiles`** with `user_id` = that UUID and `role` = `'admin'`.

## Notes

### Archived bootstrap schema

The legacy bootstrap dump `supabase-schema.sql` (and the now-deleted
`scripts/setup-database.js` that referenced an `exec_sql` RPC) was retired in
Wave A4 of the May 2026 cleanup. A point-in-time copy lives outside the repo
at:

```
~/Documents/Dream Enterprises Puppy Heaven LLC - Private/archive/supabase-schema-2026-05.sql
```

Use the migration files for any restore — they reproduce the live schema
deterministically.

### Intentional duplicate-name migration pair (Wave A8)

```
20250308000000_rename_goldendoodle_1_through_5.sql
20250308100000_rename_golden_doddle_1_through_5.sql
```

These look duplicated but are not — the second migration corrects a typo
(`golden_doddle` → `goldendoodle`) introduced in the first. Keeping both
preserves the migration history exactly as it ran in production. Do not
consolidate them.
