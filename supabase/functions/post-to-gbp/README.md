# post-to-gbp (deferred)

Google Business Profile auto-posting for new-puppy announcements. **Not implemented** —
deferred until Carlos claims the Google Business Profile for both locations (a
human/operator action; see the implementation plan's scope boundary).

## Why this is a stub

The [Google Business Profile Performance API](https://developers.google.com/my-business/content/posts-data)
requires:

1. A claimed and verified Business Profile per location (Orlando, FL and
   Raeford, NC).
2. OAuth credentials scoped to that profile, issued to whoever owns the
   verified profile.
3. API access approval from Google (the "Business Profile APIs" are
   allowlist-gated — a request must be submitted and approved before the
   `accounts.locations.localPosts` endpoints work).

None of that exists yet. Building the integration now would mean guessing at
credentials/scopes that can't be tested until step 1 happens.

## What to build once the profile is claimed

Mirror the shape of `supabase/functions/notify-waitlist-new-puppy/`:

- Triggered the same way — either the same `puppies.status -> 'Available'`
  DB trigger (`trg_notify_waitlist_on_puppy_available` in
  `20260709000005_notify_waitlist_on_puppy_available.sql`) extended to also
  call this function, or its own trigger.
- Reuse `src/lib/post-generator.ts`'s copy (the Facebook variant's title/body
  is the closest fit for a GBP "What's New" post).
- Post payload: puppy's primary photo + a shortened version of the
  post-generator copy (GBP posts have a ~1500 character body limit and a
  single CTA button — use `CALL` or `LEARN_MORE` pointing at
  `/puppies/{slug}`).
- Store the OAuth refresh token as an Edge Function secret
  (`GOOGLE_BUSINESS_REFRESH_TOKEN`), never in the repo.
- Same failure posture as the rest of Wave 6: log and continue, never block
  the puppy status update.

## Out of scope even after the profile is claimed

- Auto-responding to reviews (that's a separate, higher-trust API scope —
  not part of this plan).
- Editing existing posts. Post-and-forget, matching the review's "cadence
  beats perfection" framing.
