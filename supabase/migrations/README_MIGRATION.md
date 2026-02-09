# Run this migration first

Before using the new Consultation (4 cards, type-locked intake) and Puppy Interest Form:

1. Open your **Supabase project** → SQL Editor.
2. Run the migration: **`20250208000000_consultation_puppy_flows.sql`** (copy/paste the full file contents and run).
3. Create an admin user in Supabase Auth (Authentication → Users → Add user), then add a row to **`profiles`**:
   - `user_id` = the new user's UUID
   - `role` = `'admin'`

After the migration:

- **consultation_requests** and **puppy_inquiries** use status **active | inactive** (existing rows are set to `active`).
- **contact_messages** uses **active | inactive** and has **admin_notes**.
- **profiles** table is used for admin access; only users with `role = 'admin'` can access `/admin` (when you add the admin dashboard).
- Public can only **see** puppies with **status = 'Available'**; Sold puppies are hidden from the site.
