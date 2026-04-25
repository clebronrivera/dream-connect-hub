-- Promote SPECIFIC Auth users to admin (run in Supabase Dashboard -> SQL Editor).
--
-- WARNING: This file MUST only promote a known, intended user.
--   - Replace the example UUIDs in the VALUES list with the exact auth.users.id
--     values you intend to promote, one row per user.
--   - DO NOT replace `VALUES (...)` with `SELECT id FROM auth.users` — that would
--     promote every authenticated user (including end customers) to admin and
--     grant them read access to all customer PII.
--   - Do not commit real user identifiers to git.
--
-- File renamed from make-all-auth-users-admin.sql on 2026-04-25 because the old
-- name implied bulk promotion. Behavior was always specific-user-only.

INSERT INTO profiles (user_id, role, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', now()),
  ('00000000-0000-0000-0000-000000000002', 'admin', now())
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
