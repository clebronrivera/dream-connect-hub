# Supabase security-advisor hardening — June 2026

Applied to production project `xwudsqswlfpoljuhbphr` via migrations
`20260619000000_security_advisor_hardening_db.sql` and
`20260619000001_security_advisor_hardening_storage.sql`.

Every change below was verified safe by a read-only, adversarially-checked
investigation of how the deployed app uses each object **before** applying it.
All changes are behavior-preserving for the application; a public-photo URL read
and the security advisor were re-checked afterward.

## What changed (and why it's safe)

### 1. Closed the CAPTCHA-bypass hole on 3 intake tables
Dropped the permissive `WITH CHECK (true)` anon **INSERT** policies on:

| Table | Dropped policy | Real insert path |
|---|---|---|
| `contact_messages` | `Allow public insert on contact_messages` | `submit-contact-message` edge fn (service role) |
| `puppy_inquiries` | `Allow public insert on puppy_inquiries` | `submit-puppy-inquiry` edge fn (service role) |
| `testimonials` | `public_insert_testimonials` | `submit-testimonial` edge fn (service role) |

These tables are written only by **captcha-gated, service-role** edge functions
(service role bypasses RLS), so the anon policy was dead weight that let anyone
`POST /rest/v1/<table>` directly, skipping the Turnstile check and the
server-side length/format validation. Verified there is **no** client-side anon
insert for these three tables, and all three edge functions are `ACTIVE` in prod.
Admin read/update/delete policies and `public_read_approved_testimonials` are
untouched.

### 2. Pinned `search_path` on 18 functions
All flagged `function_search_path_mutable` functions are `SECURITY INVOKER`. Each
body was read individually:
- 16 reference no `public` objects (e.g. `NEW.updated_at = now()`) → `SET search_path = ''`.
- `get_aging_action_items` and `sync_puppy_status_from_agreement` read
  already-schema-qualified `public` tables → `SET search_path = pg_catalog, public`.

`pg_catalog` is always implicitly searched, so every identifier resolves to the
same object as before. This only removes the role-mutable-search_path attack
surface.

### 3. Revoked unused EXECUTE on 4 SECURITY DEFINER functions
`attach_customer_to_deposit_request`, `attach_customer_to_puppy_inquiry`,
`link_deposit_agreement_to_request`, `upsert_customer_for_intake(...)` — revoked
`EXECUTE` from `PUBLIC, anon, authenticated`. They run only as triggers (or are
called internally by other definer triggers); triggers fire regardless of
EXECUTE grants, trigger-returning functions aren't RPC-callable, and none are
used in RLS policies — so the grants were dead.

### 4. Stopped anonymous listing of 5 public buckets
Dropped the broad public SELECT policies on `storage.objects` for
`product-photos`, `puppy-photos`, `puppy-videos`, `site-assets`,
`testimonial-photos`. All five buckets are `public=true`, so object **reads** go
through the public CDN path (`getPublicUrl`) which does not evaluate these
policies — verified with a 200 read after the change. The app never calls the
storage `.list()` API on these buckets. Admin write policies and the
`testimonial-photos` public **upload** policy are untouched.

## Intentionally NOT changed (and why)

| Finding | Why left alone |
|---|---|
| Anon INSERT on `consultation_requests`, `product_inquiries`, `training_plan_submissions` | The app still inserts into these **directly as anon** (`Consultation.tsx`, `Essentials.tsx`, and a `TrainingPlanForm.tsx` fallback). Dropping now would break those public forms. Fix = give each a captcha-gated edge function first, then drop — tracked separately. |
| `is_admin()` executable by anon/authenticated | Backs **8 RLS policies**. Revoking EXECUTE risks breaking admin access; left pending a dedicated, separately-tested change. |
| `log_agreement_event(...)` executable by anon | Buyer-token audit entry point reserved for the in-flight agreement workflow; revoking would break it the moment it's wired. |
| RLS-enabled-no-policy on `google_reviews_cache`, `staging_puppy_uploads`, `user_roles` | RLS on + no policy = **deny-all** to anon/authenticated (the safe direction). INFO-level only. |
| Leaked-password protection disabled | **Manual** Supabase Dashboard toggle — see below. |

## Manual follow-up (dashboard, not code)
Enable **Leaked Password Protection**: Supabase Dashboard → Authentication →
Policies/Password → enable "Check against HaveIBeenPwned". One toggle; blocks
admins from using known-compromised passwords.

## Result
Security-advisor findings dropped from ~40 to the handful listed above — every
remaining item is either intentional-and-documented, requires feature work, or
is the one manual auth toggle.
