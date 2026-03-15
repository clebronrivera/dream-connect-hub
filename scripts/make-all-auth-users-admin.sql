-- Promote selected Auth users to admin (run in Supabase Dashboard -> SQL Editor).
-- Replace the example UUIDs below with the auth.users.id values you intend to promote.
-- Do not commit real user identifiers to git.

INSERT INTO profiles (user_id, role, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', now()),
  ('00000000-0000-0000-0000-000000000002', 'admin', now())
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
