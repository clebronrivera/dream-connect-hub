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

**Prerequisites:** Base tables must exist. Run `supabase-schema.sql` (or `npm run setup:database`) first if starting from scratch.

## Manual fallback

1. Open your **Supabase project** → SQL Editor.
2. Run `supabase-schema.sql` first (creates base tables).
3. Run each migration file in **timestamp order** (oldest first).
4. Create an admin user: Supabase Auth → Users → Add user, then add a row to **`profiles`** with `user_id` = that UUID and `role` = `'admin'`.
