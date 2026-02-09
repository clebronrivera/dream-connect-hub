# Run these migrations in order

1. Open your **Supabase project** → SQL Editor.
2. Run each migration file in order (copy/paste full contents and run):
   - **`20250208000000_consultation_puppy_flows.sql`** – consultation/puppy flows, form tables, RLS
   - **`20250208100000_puppy_photos_storage.sql`** – `puppy-photos` storage bucket and RLS
   - **`20250209100000_admin_dashboard_setup.sql`** – admin dashboard (profiles, etc.)
   - **`20250209120000_products_kits_inventory.sql`** – products, kits, inventory
3. Create an admin user: Supabase Auth → Users → Add user, then add a row to **`profiles`** with `user_id` = that user’s UUID and `role` = `'admin'`.

After the migrations:

- **consultation_requests** and **puppy_inquiries** use status **active | inactive**.
- **contact_messages** uses **active | inactive** and has **admin_notes**.
- Only users with **profiles.role = 'admin'** can access `/admin`.
- Public sees only puppies with **status = 'Available'**.
