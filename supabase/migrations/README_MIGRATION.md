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

### Unintentional duplicate ledger entries (2026-05-17 audit)

Two migrations are tracked **twice** in `supabase_migrations.schema_migrations`
on the live DB — once under their local-file timestamp, once under an
apply-time HHMMSS stamp:

| Migration name | Apply-time stamp (orphan) | Local-file stamp (canonical) |
|---|---|---|
| `admin_insights_views` | `20260511223122` | `20260512000000` |
| `admin_insights_admin_gate` | `20260514065104` | `20260513000000` |

Likely cause: each migration was applied once via `supabase db push`, then
the local file was renamed (or duplicated) and pushed again, leaving the
original apply-time row in the ledger and adding the clean-slot row.

Not breaking anything today. The drift surfaces if/when:
- `supabase db diff` is run (will flag the apply-time stamps as missing locally)
- A future migration squash collapses the history
- Someone tries to reset the project from migrations alone

**Cleanup SQL** — run in the SQL editor after confirming the canonical
file timestamps haven't been changed:

```sql
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN ('20260511223122', '20260514065104');
```

### Local-file vs live-version drift on breeder + admin-insights migrations

Several local files use clean `_000000` slots while the live ledger has
apply-time HHMMSS stamps for the same content. Example:

| Local file | Live ledger version |
|---|---|
| `20260511000000_breeder_tool_setup.sql` | `20260511054732` |
| `20260511100000_propagate_litter_base_price.sql` | `20260511121659` |
| `20260511100001_breeder_litter_summary_add_base_price.sql` | `20260511121942` |
| `20260511120000_breeder_video_support.sql` | `20260511123308` |
| `20260511130000_puppy_vaccinated_at.sql` | `20260511185022` |
| `20260511140000_breeder_summary_dam_photo.sql` | `20260511204549` |

`supabase migration list` and `ls supabase/migrations/` will not agree on
deployed versions. Same `db push` wart as above — not breaking, but means
the migration history is not byte-identical between repo and prod. Pick
one convention (apply-time stamps OR clean slots) and stick to it going
forward.
