# Breeder Tool — Claude Code Handoff

**Author:** Claude (Cowork session, 2026-05-11)
**Status:** Spec ready for implementation
**Companion mockup:** `docs/breeder-tool/mockup.html` (open in any browser)

---

## Why

Carlos manages Dream Enterprises business operations; Yolanda manages the dogs on the ground. Puppies grow fast — photos go stale in days, not weeks. Yolanda needs a phone-first tool to keep litter/puppy data current without ever touching the full admin panel.

The existing `/admin` UI exposes the entire schema (deposits, agreements, payments, audit logs, etc.) and is overwhelming for someone whose only job is dogs and pictures. This new tool ships a focused, opinionated, "tap-tap-tap" interface that writes to the **same database** as `/admin` — no separate system, no syncing.

---

## Scope

### In scope

- A `/breeder` route tree, mobile-first, gated by a 4-digit passcode bookmarked on Yolanda's phone.
- Four primary flows:
  1. **List litters** — see the 4 active breeding pairs and their status.
  2. **Set up a new born litter** — breed → ready-by date → puppy counts → per-puppy capture.
  3. **Capture/replace puppy photos** — face, back, top-down, paw print, optional 10s video, notes, name.
  4. **Edit individual puppies** — replace photos, edit name/price/status. Minimal field set.
- A small **Mom & Dad dogs** management screen — add/edit/photograph parent dogs (`breeding_dogs` table).
- **Multi-photo per puppy**, written to the existing `puppies.photos: string[]` column (already exists). The public site already falls back through `primary_photo → photos[0]` ([src/lib/puppy-display-utils.ts](../../src/lib/puppy-display-utils.ts)).
- **Client-side image compression** before upload so uploads work on cell data.
- The "ready-by date" replaces date-of-birth in the breeder UI entirely (per Carlos's reporting preference).

### Explicitly out of scope

- No new auth provider, no SSO, no per-breeder accounts in the `profiles` table. Single shared passcode.
- No new admin functionality. This tool is *write*-side only — read-side stays in `/admin`.
- No edits to deposits, agreements, payments, or any other workflow tables. Touches only `puppies`, `upcoming_litters`, `breeding_dogs`, and a new `breeder_sessions` table.
- No translation. English-only.
- No bulk import / CSV / spreadsheet path.

---

## Architecture — what already exists vs. what's new

| Concern | Existing | Net new |
|---|---|---|
| Tech stack | Vite + React 18 + TypeScript + TanStack Query + react-hook-form + zod + Supabase + Tailwind | None |
| `puppies` table | Already has `photos: string[]`, `primary_photo`, `name`, `gender`, `base_price`, `status`, `litter_id`, `ready_date`, `breed`, `description` (see [src/lib/supabase.ts:340](../../src/lib/supabase.ts)) | Nothing — reuse |
| `upcoming_litters` table | Has `breed`, `dam_id`, `sire_id`, `male_puppy_count`, `female_puppy_count`, `total_puppy_count`, `expected_whelping_date`, `date_of_birth`, `lifecycle_status` (see [src/lib/supabase.ts:294](../../src/lib/supabase.ts)) | Add `ready_by_date date` column if not present — verify before writing the migration |
| `breeding_dogs` table | Has `id`, `name`, `role: 'dam'│'sire'`, `breed`, `composition`, `color`, `photo_path` ([src/lib/supabase.ts:256](../../src/lib/supabase.ts)) | Extend with `photos: string[]` for multi-photo of parents (mirror puppies pattern) |
| Storage | `puppy-photos` bucket exists, public read, admin-only write ([supabase/migrations/20250208100000_puppy_photos_storage.sql](../../supabase/migrations/20250208100000_puppy_photos_storage.sql)) | Extend write policy to allow uploads from a valid breeder session (see "RLS" below). Optionally add `puppy-videos` bucket. |
| Auth | `ProtectedRoute` checks `isAdmin` via `useAuth()` ([src/components/ProtectedRoute.tsx](../../src/components/ProtectedRoute.tsx)) | New `BreederRoute` wrapper that gates on a `breeder_sessions` row keyed by a token in `localStorage` |
| Image compression | None installed | Add `browser-image-compression` (~10kb gzipped) |
| Routing | `src/App.tsx` lazy-loads pages | Add new `/breeder/*` subtree, lazy-loaded |
| Existing puppy form | [src/pages/admin/puppies/PuppyForm.tsx](../../src/pages/admin/puppies/PuppyForm.tsx) using react-hook-form + zod | **Do not modify.** Build new minimal forms — different audience, different field set. |

---

## Important: two litter tables

The codebase has **two** related tables:

- **`upcoming_litters`** ([migration](../../supabase/migrations/20250407130000_breeding_lifecycle.sql)) — pre-birth expectations. Holds `breed`, `dam_id`, `sire_id`, `expected_whelping_date`, `male_puppy_count`, `female_puppy_count`, `lifecycle_status`.
- **`litters`** ([migration](../../supabase/migrations/20250224000000_litters_table_and_puppy_litter_id.sql)) — post-birth snapshots. Holds `ready_date`, `base_price`, `mom_weight_lbs`, etc.

A puppy can carry both foreign keys:

```
puppies.upcoming_litter_id → upcoming_litters(id)   -- provenance
puppies.litter_id          → litters(id)            -- current grouping
```

**The breeder tool's "Yes they're born" transition is exactly the bridge between these two tables.** When Yolanda confirms birth:

1. Find the `upcoming_litters` row (the litter card she tapped).
2. Insert/upsert a `litters` row carrying the post-birth fields (`breed` copied, `date_of_birth`, `ready_date`).
3. Set `upcoming_litters.lifecycle_status = 'post_birth'`.
4. Each newly captured puppy is inserted into `puppies` with **both** `upcoming_litter_id` (from step 1) AND `litter_id` (from step 2).

This keeps the existing `/admin/upcoming-litters` and `/admin/litters` views working without any backfill or migration of historic data.

**`ready_by_date` column placement:** put it on the **`litters`** table (post-birth grouping) — it's a property of the actual-born litter, not the expected litter. The handoff doc previously suggested `upcoming_litters` — **use `litters` instead**. Falls back to `litters.ready_date` if implementations diverge.

---

## Data model changes

One migration. Use slot `20260511000000_breeder_tool_setup.sql`. Verify slot availability at write time — recent migrations have run up to `20260506000013` ([supabase/migrations/](../../supabase/migrations/)).

```sql
-- 20260511000000_breeder_tool_setup.sql

-- 1) `litters.ready_date` already exists (column name in current schema).
--    Verify: SELECT column_name FROM information_schema.columns
--    WHERE table_name='litters' AND column_name='ready_date';
--    No new column needed — reuse `litters.ready_date` as the breeder-reported
--    "ready to go home" date. Add a comment so future readers know it's the
--    primary user-facing field.
COMMENT ON COLUMN litters.ready_date IS
  'Breeder-reported "ready to go home" date. Primary user-facing field —
   shown on public site instead of date_of_birth. Computed pickup_date in
   deposit flow = ready_date when set.';

-- 2) Multi-photo support for parent dogs (mirrors puppies.photos).
ALTER TABLE breeding_dogs
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';

-- 3) Breeder session table — a single shared passcode, validated server-side
--    via edge function. The session row is what the client carries in localStorage.
CREATE TABLE breeder_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  device_label text,                                       -- e.g. "Yolanda's iPhone"
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX idx_breeder_sessions_token ON breeder_sessions(token)
  WHERE revoked_at IS NULL;

ALTER TABLE breeder_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can see / revoke sessions. The breeder tool never SELECTs this
-- table directly; it goes through edge functions running as service role.
CREATE POLICY admin_all_breeder_sessions ON breeder_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- 4) Storage policy — let a verified breeder session upload to puppy-photos.
--    Pattern: edge function validates passcode, returns a signed upload URL
--    OR returns a short-lived JWT the client uses for the standard upload.
--    Simpler: route ALL breeder uploads through a single edge function
--    (`breeder-upload-photo`) that holds the service role key.
--    Recommendation: route through edge function — no RLS changes needed,
--    no client-side keys to manage.
```

**Configuration table for the passcode itself.** Store the hashed passcode in a single-row config table. Don't hardcode.

```sql
-- Inside the same migration:
CREATE TABLE breeder_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforce single row
  passcode_hash text NOT NULL,                       -- bcrypt of the 4-digit pin
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE breeder_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_breeder_config ON breeder_config FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Carlos sets the initial passcode via /admin/settings, then bookmarks
-- the URL on Yolanda's phone with the resulting session token in the URL hash.
```

---

## Routes

Add to `src/App.tsx` (alongside existing lazy imports):

```
/breeder/login                    → BreederLogin           (passcode entry)
/breeder                          → BreederHome            (4 litter cards)
/breeder/litters/:litterId        → BreederLitter          (born? / not born?)
/breeder/litters/:litterId/setup  → BreederLitterSetup     (breed → ready-by → counts → captures)
/breeder/litters/:litterId/puppies → BreederPuppyList      (manage existing puppies)
/breeder/puppies/:puppyId/edit    → BreederPuppyEdit       (minimal edit form)
/breeder/puppies/:puppyId/capture → BreederPuppyCapture    (photo flow, used by setup AND edit)
/breeder/parents                  → BreederParents         (mom/dad dogs)
/breeder/parents/:dogId/edit      → BreederParentEdit
```

All under a single `<BreederRoute>` wrapper that redirects to `/breeder/login` if no valid session token is in localStorage.

---

## Auth flow

1. Carlos opens `/admin/settings/breeder-passcode`, sets a 4-digit pin (new admin page). Server stores bcrypt hash in `breeder_config`.
2. Carlos opens `/breeder/login` on Yolanda's phone once. She types the pin.
3. Client POSTs `{ pin }` to edge function `breeder-login`. Function bcrypt-compares against `breeder_config.passcode_hash`. On success, generates a session token, inserts `breeder_sessions` row, returns token + expiration.
4. Client stores `{ token, expiresAt }` in `localStorage` under key `breeder_session`. Subsequent requests include `x-breeder-token` header.
5. Every protected breeder route validates the token client-side (expiration check) and the server validates server-side on every mutation.
6. After 30 days, token expires. Yolanda re-enters pin. Old session row stays for audit.

**Why an edge function instead of plain RLS?** A 4-digit pin has only 10,000 possibilities — brittle against brute force if exposed to direct database. Edge function adds rate-limit (5 attempts per IP per 15 min, tracked in memory or a tiny `breeder_login_attempts` table) and never exposes the hash to the client.

---

## Edge functions

Three new functions under `supabase/functions/`:

1. **`breeder-login`** — POST `{ pin }` → `{ token, expiresAt }`. Rate-limited. Public (no JWT).
2. **`breeder-upload-photo`** — POST multipart `{ file, kind: 'puppy'|'parent', subjectId }` with `x-breeder-token` header. Validates session, runs file through size cap (5MB after compression), writes to `puppy-photos` bucket via service role, returns `{ path, url }`.
3. **`breeder-write`** — POST `{ op: 'createPuppy'|'updatePuppy'|'createLitter'|'updateLitter'|'createParent'|'updateParent', payload }` with `x-breeder-token`. One endpoint, switch on `op`. Service-role writes after schema validation (use `zod` shared with client). Returns `{ ok, data }` or `{ ok, error }`. Keeps client logic simple.

Pattern: reuse `_shared/cors.ts` and the auth helper structure already established by `_shared/auth/verifyAdmin.ts` (mentioned in CLAUDE.md Wave F3). Add a new `_shared/auth/verifyBreederToken.ts`:

```typescript
export async function verifyBreederToken(
  supabase: SupabaseClient,
  token: string | null
): Promise<{ ok: true; sessionId: string } | { ok: false; status: number; body: object }> {
  if (!token) return { ok: false, status: 401, body: { error: 'missing token' } };
  const { data, error } = await supabase
    .from('breeder_sessions')
    .select('id, expires_at, revoked_at')
    .eq('token', token)
    .single();
  if (error || !data) return { ok: false, status: 403, body: { error: 'invalid token' } };
  if (data.revoked_at) return { ok: false, status: 403, body: { error: 'session revoked' } };
  if (new Date(data.expires_at) < new Date()) return { ok: false, status: 403, body: { error: 'session expired' } };
  // Touch last_used_at without awaiting
  void supabase.from('breeder_sessions').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return { ok: true, sessionId: data.id };
}
```

---

## Client-side image compression

Install `browser-image-compression@2.x`. In a new util `src/lib/breeder/compressImage.ts`:

```typescript
import imageCompression from 'browser-image-compression';

export async function compressPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  });
}
```

Carlos chose "full-quality" — 2000px on the long edge at 85% JPEG is the sweet spot: phone screens never need more, and the public site still has plenty of resolution for zoom. ~600KB–1.2MB per photo. A 4-photo puppy capture uploads ~3–5MB total, manageable on LTE.

Video: hold the line at 10 seconds max, no compression on-device (browser MediaRecorder output is already compressed). Cap at 20MB hard limit server-side; reject larger uploads with a clear error.

---

## Component skeleton — file-by-file

```
src/pages/breeder/
  BreederLogin.tsx               # passcode entry, 4-digit keypad
  BreederHome.tsx                # 4 litter cards
  BreederLitter.tsx              # router: born? not born? show next step
  BreederLitterSetup.tsx         # multi-step form: breed → ready-by → counts → /capture
  BreederPuppyList.tsx           # manage existing puppies in a litter
  BreederPuppyEdit.tsx           # minimal field edit
  BreederPuppyCapture.tsx        # the 7-step capture flow per puppy
  BreederParents.tsx             # list moms + dads
  BreederParentEdit.tsx          # add / edit parent dog

src/components/breeder/
  BreederRoute.tsx               # session gate
  BreederLayout.tsx              # consistent header, back button, progress bar
  PhotoCaptureSlot.tsx           # tap-to-take with preview, compress, upload
  VideoCaptureSlot.tsx           # 10s limit
  StepProgress.tsx               # the linear progress bar
  PinKeypad.tsx                  # reused on login + settings
  LitterCard.tsx
  PuppyRow.tsx

src/lib/breeder/
  api.ts                         # thin wrapper around breeder-write / breeder-upload-photo
  compressImage.ts
  session.ts                     # localStorage read/write of session token
  schema.ts                      # zod schemas shared with edge function
  puppy-name-generator.ts        # reuse if /admin has one — else simple curated list

src/types/breeder.ts             # BreederSession, BreederLitterDraft, BreederPuppyDraft
```

**Critical:** `BreederPuppyCapture` is used by both the "set up new litter" flow *and* the "update existing puppy photos" flow. Same component, parameterized by initial state. Avoid duplicating the photo step machinery.

---

## State management

Don't reach for Redux/Zustand — overkill. Use:

- **TanStack Query** (already in the app) for litter/puppy fetches and the upload mutation.
- **`useReducer` per capture flow** for step machine state (which step, which puppy index, which gender phase).
- **Auto-save after every step.** Don't wait for "Save" at the end of all 5 puppies. Each photo upload calls the API immediately; each `Next` button call patches the puppy row. If Yolanda loses signal mid-litter, when she comes back the litter card shows "Captured 2 of 5" and resume picks up at puppy 3.

This is non-negotiable — a breeder on a goat farm with spotty cell service is not going to retry a 5-puppy upload.

---

## RLS strategy

All breeder writes go through edge functions running as service role. This means **no RLS changes** needed on `puppies`, `upcoming_litters`, or `breeding_dogs` for the breeder flow itself. The edge function is the gate.

The only new RLS is on `breeder_sessions` and `breeder_config` (admin-only, defined in the migration above).

The existing `puppies` and `upcoming_litters` policies stay as they are — no widening, no risk of regression on the main site.

---

## "Up to date" badge math

The Home screen shows three states per litter card:

- **Still waiting** — `upcoming_litters.lifecycle_status = 'pre_birth'` (no born flag).
- **Born — needs photos** — born, but at least one of the litter's puppies has `photos = '{}'` AND `primary_photo IS NULL`.
- **Up to date · updated X ago** — born, every puppy has at least 1 photo. Show `MAX(puppies.updated_at)` for the relative time.

Compute server-side in a single view or RPC to avoid 4× round-trips on the home screen.

```sql
CREATE OR REPLACE VIEW breeder_litter_summary AS
SELECT
  ul.id AS litter_id,
  ul.breed,
  ul.ready_by_date,
  ul.lifecycle_status,
  d.name AS dam_name,
  s.name AS sire_name,
  COUNT(p.id) AS total_puppies,
  COUNT(p.id) FILTER (WHERE coalesce(array_length(p.photos, 1), 0) = 0 AND p.primary_photo IS NULL) AS puppies_missing_photos,
  MAX(p.updated_at) AS last_puppy_update
FROM upcoming_litters ul
LEFT JOIN breeding_dogs d ON d.id = ul.dam_id
LEFT JOIN breeding_dogs s ON s.id = ul.sire_id
LEFT JOIN puppies p ON p.litter_id = ul.id
GROUP BY ul.id, d.name, s.name;
```

Single SELECT on Home; recompute is free.

---

## Public-site adapter

The public puppy display already does `primary_photo || photos[0]` ([src/lib/puppy-display-utils.ts](../../src/lib/puppy-display-utils.ts)). One small change needed:

**Adapt the public site to show "Ready Jul 6" instead of "DOB Apr 11"** wherever puppy date is currently displayed. Carlos's preference: ready-by date is the user-facing field, not date of birth.

Files to update (verify before editing):
- `src/pages/Puppies.tsx`
- `src/pages/PuppyCard.tsx`
- `src/pages/UpcomingLitters.tsx`
- Anywhere `date_of_birth` is rendered to a buyer.

Show `ready_date` if set, else `ready_by_date` from the parent litter, else a fallback like "Coming soon".

**Don't drop DOB from the schema** — it's still useful internally for veterinary records and age math. Just stop displaying it.

---

## Existing utilities to reuse

- Auth context: [src/contexts/AuthContext](../../src/contexts/AuthContext) — keep separate from the breeder session.
- Photo upload pattern: [src/lib/puppy-photos.ts](../../src/lib/puppy-photos.ts) — copy/adapt the storage upload code into `lib/breeder/api.ts` so the breeder version goes through the edge function.
- `getPuppyImage()` / fallback chain: [src/lib/puppy-display-utils.ts](../../src/lib/puppy-display-utils.ts) — no changes needed.
- TanStack Query client: [src/lib/query-client.ts](../../src/lib/query-client.ts)
- CORS allowlist for edge functions: [supabase/functions/_shared/cors.ts](../../supabase/functions/_shared/cors.ts)
- Migration filename convention: see latest five at [supabase/migrations/](../../supabase/migrations/) — use `20260511000000_breeder_tool_setup.sql` unless slot conflict.

---

## Implementation order (suggested)

1. **Migration + edge function plumbing.** Apply migration, scaffold the three edge functions with stubs that return `{ ok: false, error: 'not implemented' }`. Verify deploy.
2. **Login flow.** Build `BreederLogin`, `breeder-login` function, session storage util. Confirm round-trip works end-to-end.
3. **Home + litter summary view.** Build `BreederHome`, the SQL view, the API call. Static-ish — no writes yet.
4. **Litter setup flow.** `BreederLitterSetup` multi-step form, write to `upcoming_litters`. Skip puppy capture for now.
5. **Photo capture component.** `PhotoCaptureSlot` with compression + upload + preview. Get this rock-solid on a real phone before moving on.
6. **Puppy capture flow.** `BreederPuppyCapture` step machine, integrated with the photo component. Test end-to-end: create litter → capture all 5 puppies → confirm they appear on the public site.
7. **Edit-existing flow.** `BreederPuppyEdit` + reuse of `BreederPuppyCapture` for photo refresh.
8. **Parents.** `BreederParents` + `BreederParentEdit`.
9. **Public site adaptation.** Swap DOB displays for ready-by.
10. **Carlos's settings page.** `/admin/settings/breeder-passcode` for setting/rotating the pin.

Each is its own PR — small, reviewable, ship-as-you-go.

---

## Acceptance criteria (end-to-end smoke test)

1. Carlos visits `/admin/settings/breeder-passcode`, sets pin `1234`. Confirms.
2. Carlos opens `/breeder/login` on Yolanda's phone, enters `1234`. Lands on home with 4 litter cards.
3. Cards reflect real state from `upcoming_litters` + `puppies`.
4. Yolanda taps a "Still waiting" card → "Are they born?" → "Yes" → enters breed → ready-by date → 3 boys / 2 girls → starts capture.
5. For each puppy: types or auto-generates name → captures 4 photos → records 10s video → adds note → Next.
6. After all 5, sees "All done!" → back to home → litter card now shows "Up to date · updated just now."
7. On the public site (`/puppies`), the 5 new puppies appear with photos and "Ready by Jul 6, 2026" instead of any DOB.
8. Yolanda taps the same litter again → "Manage these puppies" → taps Cooper → replaces face photo → saves. Public site reflects new photo within seconds (no cache delay beyond Supabase storage's default).
9. Yolanda taps "Manage Mom & Dad dogs" → adds a new dam Bella with 2 photos → saves.
10. After 30 days, Yolanda's session expires. She re-enters `1234` and is back in.
11. Carlos rotates the pin to `5678` in `/admin/settings/breeder-passcode`. Yolanda's existing session keeps working until natural expiry; next login uses the new pin.

If 1–11 all pass, ship it.

---

## Open questions left for implementation

- **Auto-name generator source:** does `/admin` already have a curated puppy-name list? If yes, reuse. If no, ship a starter list of ~50 friendly names in `src/lib/breeder/puppy-name-generator.ts` and let Carlos curate later.
- **Video bucket:** create a new `puppy-videos` bucket or extend `puppy-photos` to accept video MIME types? Slight preference for a separate bucket so storage policies stay focused; one new short migration. Decide at implementation time.
- **Carlos-side observability:** do we want a small "Recent breeder activity" widget on the admin dashboard (last 10 changes from `breeder_sessions.last_used_at` joined with what was updated)? Out of scope for v1 but easy to add later if Carlos wants visibility.

---

## What's *not* in this doc (intentionally)

- Visual design polish (colors, typography, exact button radii) — the mockup at `docs/breeder-tool/mockup.html` is reference. Use the existing app's Tailwind palette so it feels native.
- Translations.
- Notifications to Carlos when Yolanda completes a litter (could be a Wave-2 add-on; trivial to bolt on later).
- Bulk operations.
- Offline mode beyond "auto-save after each step". A true offline-first PWA is a bigger investment.

---

**Reference back to:** `docs/spec/dream-connect-hub.md` (canonical spec), `CLAUDE.md` (current waves A–H plan). Nothing in this breeder tool conflicts with those waves; it's parallel.
