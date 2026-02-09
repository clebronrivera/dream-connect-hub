-- Make all current Auth users admins (run once in Supabase Dashboard → SQL Editor)
-- UIDs from Authentication → Users (with "Sorted by user ID" or UID column visible)

INSERT INTO profiles (user_id, role, created_at)
VALUES
  ('6effb413-92a4-4c74-9fe5-288f466a7bb6', 'admin', now()),  -- clebronrivera@gmail.com
  ('66b78a17-e925-44c8-82d4-0619ce889651', 'admin', now()),  -- clebronrivera@icloud.com
  ('157eb4fc-6da8-44f1-843d-9489de2aac3c', 'admin', now()),  -- dreamenterprisesllc@gmail.com
  ('b44414a5-f33b-47f4-9f78-7ac4d905b4a4', 'admin', now()),  -- dreampuppies22@gmail.com
  ('64592c2a-0092-4104-9968-60306ebeaf17', 'admin', now())   -- pirela112728@gmail.com
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
