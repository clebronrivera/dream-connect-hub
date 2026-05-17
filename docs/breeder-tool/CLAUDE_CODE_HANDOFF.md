# Claude Code Handoff — Breeder Tool + Social Post Generators

**Author:** Claude (Cowork session, 2026-05-17)
**For:** Carlos → next step is `claude` in the repo root
**Total scope:** ~7–10 days of focused implementation across 4 sequential phases

This sheet is the single page you hand to Claude Code. It lists every file already created in this Cowork session, every file Claude Code needs to create, the order to build them in, and ready-to-paste prompts for each phase.

---

## What's already done (planning artifacts — do NOT re-create)

Everything in [`docs/breeder-tool/`](.) is the spec for what Claude Code will build. Open each in a tab while implementing.

| File | What it is | When to read it |
|---|---|---|
| [`HANDOFF.md`](./HANDOFF.md) | Breeder tool full spec (passcode login, litter setup, puppy capture, edit flows, photo metadata) | Phase 3 |
| [`mockup.html`](./mockup.html) | Clickable mobile mockup of the breeder tool (14 screens, phone-sized) | Phase 3 — visual reference |
| [`SOCIAL_POSTS.md`](./SOCIAL_POSTS.md) | Per-puppy 7-slide IG carousel generator spec | Phase 4 |
| [`social-preview.html`](./social-preview.html) | Visual preview of the 7-slide per-puppy carousel | Phase 4 — visual reference |
| [`LITTER_POST.md`](./LITTER_POST.md) | Whole-litter single-image announcement generator spec (the format from Carlos's prior Safari export) | Phase 2 |
| [`litter-preview.html`](./litter-preview.html) | Visual preview of the litter post in 3 headline-treatment variants (A / B / C) | Phase 2 — visual reference |
| [`design-template-prompt.md`](./design-template-prompt.md) | Reusable prompt for commissioning new design template variants in future Claude sessions | Reference only, not part of this implementation |

**Authoritative design system** (already in the repo, do not redesign):
- [`design_handoff_dream_puppies_b/brand.jsx`](../../design_handoff_dream_puppies_b/brand.jsx) — palette tokens + SVG primitives
- [`design_handoff_dream_puppies_b/README.md`](../../design_handoff_dream_puppies_b/README.md) — voice rules + design tokens spec
- [`public/dream-puppies-logo.png`](../../public/dream-puppies-logo.png) — logo (use as `/dream-puppies-logo.png` from any template)

---

## Build order — 4 phases

Each phase ships as its own PR. Do NOT parallelize — phase N's data depends on phase N−1.

| # | Phase | What it produces | Depends on |
|---|---|---|---|
| 1 | **Foundation** | `business_info` migration + admin settings page | nothing |
| 2 | **Litter Post Generator** | "Make Litter Post" button on `/admin/upcoming-litters` → single 1080×1350 PNG download | Phase 1 |
| 3 | **Breeder Tool** | `/breeder` passcode-gated phone-first interface, captures multi-photo puppies with face/back/top/paw labels into a new `photos_meta` column | Phase 1 |
| 4 | **Per-Puppy Carousel Generator** | "Make IG Post" button → 7-slide carousel ZIP download | Phases 1 + 3 (uses `photos_meta` for kind-aware slide assignment) |

Why this order:
- Foundation first — both generators need `business_info`.
- Litter post second — uses only the existing schema, no auth changes, no new tables. Smallest first ship.
- Breeder tool third — adds `photos_meta`, which Phase 4 needs.
- Per-puppy carousel last — depends on photo metadata captured by the breeder tool, but degrades gracefully if `photos_meta` isn't set.

---

## Phase 1 — Foundation

**Goal:** stand up the `business_info` table + admin settings page so both generators have their static data.

### Files Claude Code creates

```
supabase/migrations/20260517000000_business_info.sql                   # NEW
src/lib/admin/business-info-service.ts                                 # NEW
src/pages/admin/settings/BusinessInfoPage.tsx                          # NEW
src/types/business-info.ts                                             # NEW
```

### Acceptance

- Migration applies cleanly to staging.
- Carlos opens `/admin/settings/business-info`, sees a pre-filled form (defaults match Direction B voice rules: Florida + Raeford NC, canonical breeds, factual "what's included" copy).
- Edit + Save round-trips.
- Reading `business_info` via the existing supabase client returns the single row.

### Prompt to paste into Claude Code

```
I'm implementing the breeder tool + social post generators planned in docs/breeder-tool/.

Phase 1: Foundation. Read docs/breeder-tool/CLAUDE_CODE_HANDOFF.md (this file) and
docs/breeder-tool/SOCIAL_POSTS.md (section "New: business_info table" — that has the
full SQL and field list).

Create:
1. The migration file using slot 20260517000000 (verify nothing else has claimed that
   slot before writing it).
2. A typed service module at src/lib/admin/business-info-service.ts with read + update
   functions using the existing supabase client and TanStack Query patterns from
   src/lib/admin/*.ts.
3. An admin settings page at /admin/settings/business-info wired into the existing
   admin route tree. Use the existing form patterns from src/pages/admin/puppies/PuppyForm.tsx
   (react-hook-form + zod). Show all fields with their factual defaults pre-filled.
   Render the voice rules from docs/breeder-tool/SOCIAL_POSTS.md ("Voice rules — copy
   guardrails for slide text") as helper text above the "whats_included" and
   "breeding_practices" textareas so Carlos doesn't accidentally violate them.

Do NOT touch any other files. After implementing, run `npm run check` and `npm run build`,
then summarize what you changed and stop. I'll review and commit.
```

---

## Phase 2 — Litter Post Generator (the prior Safari design, factual-only)

**Goal:** a single-button download that produces the litter-announcement image. No new schema beyond Phase 1. Uses existing `upcoming_litters`, `breeding_dogs`, `puppies` data.

### Files Claude Code creates

```
src/features/social-posts/                                             # NEW directory
  types.ts                                                             # CarouselData + LitterPostData
  renderLitter.ts                                                      # html-to-image → PNG download
  hooks/useLitterPostData.ts                                           # aggregator query
  components/
    LitterPostButton.tsx                                               # the trigger button
    LitterPostModal.tsx                                                # preview + headline picker + download
  templates/
    litter-lavender-dark/
      index.tsx                                                        # default export with 3 headline modes
      HeaderRow.tsx
      PuppyGrid.tsx                                                    # responsive 4/3/2-up
      ParentCard.tsx
      HeadlineBlock.tsx                                                # modes A/B/C
      StatsStrip.tsx
      ReserveCTA.tsx
      FooterLine.tsx
package.json                                                           # ADD html-to-image, file-saver deps
src/pages/admin/UpcomingLittersList.tsx (or equivalent)                # EDIT — add button to each row
```

### Acceptance

See [`LITTER_POST.md`](./LITTER_POST.md) "Acceptance criteria" — the full 12-point list.

Most important checks:
- The downloaded PNG is exactly **1080×1350**, under 1MB, filename matches `dream-puppies_LITTER_<KokoStar>_2026-04-19.png`.
- **No personality language anywhere on the image.** Only facts: breed, dates, counts, genetics percentages, contact info.
- The three headline patterns from `litter-preview.html` are all selectable in the modal.
- Grid scales: 4-up at ≥7 puppies, 3-up at 5–6, 2-up at 3–4, single hero at 1–2.

### Prompt to paste into Claude Code

```
Phase 2: Litter Post Generator. Phase 1 is merged.

Read in this order:
  1. docs/breeder-tool/CLAUDE_CODE_HANDOFF.md (this file — Phase 2 section)
  2. docs/breeder-tool/LITTER_POST.md (the full spec — read every section)
  3. Open docs/breeder-tool/litter-preview.html in a browser to see the three
     headline-treatment variants. This is the visual fidelity bar — the React
     templates you build must match.
  4. design_handoff_dream_puppies_b/brand.jsx for SVG primitives and tokens.
  5. design_handoff_dream_puppies_b/README.md for voice rules (CRITICAL — re-read
     the "Voice & copy rules" section before any string lands on a slide).

Then:
  - Install dependencies: `npm i html-to-image file-saver` and their @types if needed.
  - Build src/features/social-posts/ with the file structure listed in
    CLAUDE_CODE_HANDOFF.md Phase 2. The template at templates/litter-lavender-dark/index.tsx
    must render at exactly 1080×1350 internal pixels (the wrapper div has fixed
    width/height inline styles; html-to-image captures it offscreen).
  - Wire LitterPostButton into the existing admin upcoming-litters list page. Find that
    page yourself (grep for "upcoming_litters" in src/pages/admin/). The button is
    disabled when the litter has 0 puppies with photos.
  - Modal contains: thumbnail of the live-rendered post on the left, the three
    headline-pattern toggle buttons (A / B / C) on the right, plus a Download
    button. Pattern A is the default.
  - Headline strings come from a `formatHeadline(count, breed, mode)` helper. Never
    interpolate adjectives. Words allowed: numerals, spelled-out numbers, breed
    names, "PUPS", "ALL", "BORN", "READY", date numerals. Nothing else.

Acceptance criteria are in docs/breeder-tool/LITTER_POST.md. Do NOT proceed to
Phase 3 — stop after this is merged. Run `npm run check` + `npm run build` and
do an actual download test (open /admin/upcoming-litters, click the button on a
litter with 8 puppies, confirm the PNG comes out at 1080×1350).
```

---

## Phase 3 — Breeder Tool (the phone-first interface for Yolanda)

**Goal:** Yolanda manages puppies and photos from her phone via `/breeder/login` → 4-digit passcode → litter setup → puppy capture. Captures photos with kind labels (face/back/top/paw) into a new `photos_meta` column on `puppies`.

### Files Claude Code creates

See [`HANDOFF.md`](./HANDOFF.md) — section "Component skeleton — file-by-file". Summary:

```
supabase/migrations/20260518000000_breeder_tool.sql                    # NEW
  - ALTER TABLE puppies ADD COLUMN photos_meta jsonb DEFAULT '{}'
  - ALTER TABLE breeding_dogs ADD COLUMN photos text[] DEFAULT '{}'
  - CREATE TABLE breeder_sessions
  - CREATE TABLE breeder_config (single-row passcode hash)
  - COMMENT on litters.ready_date as the user-facing date

supabase/functions/breeder-login/index.ts                              # NEW edge fn
supabase/functions/breeder-upload-photo/index.ts                       # NEW edge fn
supabase/functions/breeder-write/index.ts                              # NEW edge fn
supabase/functions/_shared/auth/verifyBreederToken.ts                  # NEW shared helper

src/pages/breeder/                                                     # NEW
  BreederLogin.tsx · BreederHome.tsx · BreederLitter.tsx ·
  BreederLitterSetup.tsx · BreederPuppyList.tsx · BreederPuppyEdit.tsx ·
  BreederPuppyCapture.tsx · BreederParents.tsx · BreederParentEdit.tsx

src/components/breeder/
  BreederRoute.tsx · BreederLayout.tsx · PhotoCaptureSlot.tsx ·
  VideoCaptureSlot.tsx · StepProgress.tsx · PinKeypad.tsx ·
  LitterCard.tsx · PuppyRow.tsx

src/lib/breeder/
  api.ts · compressImage.ts · session.ts · schema.ts · puppy-name-generator.ts

src/types/breeder.ts                                                   # NEW
src/pages/admin/settings/BreederPasscodePage.tsx                       # NEW (rotates the pin)
src/App.tsx                                                            # EDIT — add /breeder/* route subtree
package.json                                                           # ADD browser-image-compression
```

### Acceptance

See [`HANDOFF.md`](./HANDOFF.md) — "Acceptance criteria (end-to-end smoke test)", 11-point list.

Key checks:
- `/breeder/login` + 4-digit pin → home screen with 4 litter cards.
- Per-puppy capture writes both `photos: string[]` (backward compat with public site) AND `photos_meta: { face, back, top, paw }`.
- Auto-save after each step — losing signal mid-capture is recoverable.
- Public site continues to work with no regressions on existing puppies.

### Prompt to paste into Claude Code

```
Phase 3: Breeder Tool. Phases 1 and 2 are merged.

Read in this order:
  1. docs/breeder-tool/CLAUDE_CODE_HANDOFF.md (this file — Phase 3 section)
  2. docs/breeder-tool/HANDOFF.md (the full spec — every section, including
     "Important: two litter tables" — the upcoming_litters → litters transition
     is the trickiest part of this phase).
  3. Open docs/breeder-tool/mockup.html in a browser to walk through all 14 screens.
     This is the UX fidelity bar.
  4. supabase/migrations/ — read the latest 5 to confirm migration slot 20260518000000
     is free.

Then implement the 9-step order from HANDOFF.md "Implementation order":
  1. Migration + edge function stubs that return "not implemented"
  2. Login flow (passcode → session token)
  3. Home + litter summary view (SQL view + Supabase RPC)
  4. Litter setup multi-step form (writes upcoming_litters + creates litters row)
  5. PhotoCaptureSlot component (compression + upload + preview) — get this rock solid
  6. Puppy capture step machine (uses PhotoCaptureSlot, writes photos_meta)
  7. Edit-existing puppy flow
  8. Parents management
  9. Public site adaptation — swap DOB display for ready-by date

Sub-prompts to use INSIDE this phase (Claude Code will see this as one prompt;
work through them sequentially and stop for review after each major step):

  - "Implement step 1: migration + edge function scaffolding. Stop and summarize."
  - "Implement step 2: login flow end-to-end. Test in a browser. Stop and summarize."
  - ... and so on through step 9.

Acceptance criteria are in HANDOFF.md. Do NOT touch any /admin routes other than
adding the breeder-passcode-rotation page at /admin/settings/breeder-passcode.
Do NOT proceed to Phase 4.
```

---

## Phase 4 — Per-Puppy Carousel Generator

**Goal:** a "Make IG Post" button next to each puppy in `/admin/puppies` AND in the breeder dashboard. Opens preview of 7 IG carousel slides, downloads as ZIP.

### Files Claude Code creates

See [`SOCIAL_POSTS.md`](./SOCIAL_POSTS.md) — "File layout (in the codebase)". Summary:

```
src/features/social-posts/                                             # EXTEND from Phase 2
  templates/
    lavender/                                                          # NEW per-puppy template
      index.tsx
      HeroSlide.tsx · MeetSlide.tsx · AnglesSlide.tsx · ParentsSlide.tsx
      IncludesSlide.tsx · ReserveSlide.tsx · ClosingSlide.tsx
  hooks/useCarouselData.ts                                             # NEW
  components/
    SocialPostButton.tsx                                               # NEW (per-puppy variant)
    SocialPostModal.tsx                                                # NEW (carousel preview)
  render.ts                                                            # NEW (zip + save)
package.json                                                           # ADD jszip
src/pages/admin/PuppiesList.tsx (or equivalent)                        # EDIT — add button per row
src/components/breeder/BreederPuppyList.tsx                            # EDIT — add button per puppy
```

### Acceptance

See [`SOCIAL_POSTS.md`](./SOCIAL_POSTS.md) — "Acceptance criteria", 10-point list.

Key checks:
- ZIP contains exactly 7 PNG files, each 1080×1350, total <8MB.
- Slides 1/2 use `photos_meta.face`, slide 3 uses back+top+paw, slide 4 uses parent photos.
- Missing data → slide gracefully omitted, modal explains why.
- Voice rules from README still enforced — no "low-shed," no fake urgency, etc.

### Prompt to paste into Claude Code

```
Phase 4: Per-Puppy Carousel Generator. Phases 1–3 are merged.

Read:
  1. docs/breeder-tool/CLAUDE_CODE_HANDOFF.md (this file — Phase 4 section)
  2. docs/breeder-tool/SOCIAL_POSTS.md (full spec)
  3. Open docs/breeder-tool/social-preview.html for visual fidelity reference.
  4. design_handoff_dream_puppies_b/README.md "Voice & copy rules" — non-negotiable.
  5. src/features/social-posts/ — the Phase 2 directory you already built; reuse
     types, the render helper pattern, the modal shell. Do NOT duplicate.

Then build the lavender per-puppy template alongside the existing
litter-lavender-dark template. Both export from
src/features/social-posts/templates/index.ts so the modal can pick one.

The SocialPostButton lives in two places:
  - admin puppy list rows (find via grep for src/pages/admin/puppies/)
  - breeder dashboard puppy list (src/components/breeder/BreederPuppyList.tsx
    from Phase 3)

Both call the same modal with mode="single-puppy" + puppyId. The litter modal
from Phase 2 stays as it is — the puppy modal is a new variant.

Acceptance criteria are in SOCIAL_POSTS.md. Run `npm run check` + `npm run build`
and do an actual download test before declaring done.
```

---

## Cross-cutting things to verify before each phase ships

Run these at the end of EVERY phase, regardless of which one:

```bash
npm run check                  # type check + lint
npm run build                  # production build
npm run db:push                # apply migrations to staging
```

Then:

1. Open the page that changed in a real browser.
2. If photos are involved, do at least one real-data round trip (not mocks).
3. Confirm public site `/` and `/puppies` still load and render correctly.
4. Re-run the live RLS audit query (`SELECT polname FROM pg_policy WHERE polrelid = 'public.puppies'::regclass`) — confirm no new permissive policies snuck in.
5. Commit + push + PR. Review before moving to next phase.

---

## What you (Carlos) do between phases

After each PR merges:

- Phase 1: open `/admin/settings/business-info` and edit any defaults you want changed before they appear on a post.
- Phase 2: try generating a litter post for one of your real upcoming litters. Pick a headline variant. Confirm the PNG looks right when posted to your IG account.
- Phase 3: open `/breeder/login` on Yolanda's iPhone, set the pin to something memorable, bookmark the URL. Walk her through one practice litter.
- Phase 4: regenerate a post you already published, this time as the per-puppy carousel for one specific puppy. Compare engagement.

---

## Open items / future waves (don't build now)

- **Spanish localization** of the post-generator UIs and string-render layer (the site already has `LanguageContext` — reuse).
- **Story format (1080×1920)** templates as a third template variant.
- **Direct IG Graph API posting** — only worth it if Carlos finds himself wishing the download step away after a few months of use.
- **Litter group photo** as a separate template — single-image "meet the family" pile shot, distinct from both the carousel and the announcement.
- **Bulk operations** — "generate posts for all 4 active litters at once" type things.
- **Analytics** — which template + headline pattern is generating the most reservations? Worth it only after a few months of data.

---

## File checklist — tick as you go

Phase 1
- [ ] `supabase/migrations/20260517000000_business_info.sql`
- [ ] `src/lib/admin/business-info-service.ts`
- [ ] `src/pages/admin/settings/BusinessInfoPage.tsx`
- [ ] `src/types/business-info.ts`

Phase 2
- [ ] `package.json` deps: `html-to-image`, `file-saver`
- [ ] `src/features/social-posts/types.ts`
- [ ] `src/features/social-posts/renderLitter.ts`
- [ ] `src/features/social-posts/hooks/useLitterPostData.ts`
- [ ] `src/features/social-posts/components/LitterPostButton.tsx`
- [ ] `src/features/social-posts/components/LitterPostModal.tsx`
- [ ] `src/features/social-posts/templates/litter-lavender-dark/` (8 files)
- [ ] Edit admin upcoming-litters list to inject the button

Phase 3
- [ ] `supabase/migrations/20260518000000_breeder_tool.sql`
- [ ] 3 edge functions (`breeder-login`, `breeder-upload-photo`, `breeder-write`)
- [ ] `_shared/auth/verifyBreederToken.ts`
- [ ] 9 `src/pages/breeder/` pages
- [ ] 8 `src/components/breeder/` components
- [ ] 5 `src/lib/breeder/` utilities
- [ ] `package.json` dep: `browser-image-compression`
- [ ] `src/App.tsx` route registration
- [ ] `src/pages/admin/settings/BreederPasscodePage.tsx`
- [ ] Public site DOB → ready-by display swap (Puppies.tsx, PuppyCard.tsx, UpcomingLitters.tsx)

Phase 4
- [ ] `package.json` dep: `jszip`
- [ ] `src/features/social-posts/render.ts` (carousel ZIP variant)
- [ ] `src/features/social-posts/hooks/useCarouselData.ts`
- [ ] `src/features/social-posts/components/SocialPostButton.tsx`
- [ ] `src/features/social-posts/components/SocialPostModal.tsx`
- [ ] `src/features/social-posts/templates/lavender/` (8 files)
- [ ] Wire into both admin puppy list AND breeder puppy list

When the last checkbox is ticked, Yolanda has a phone tool and Carlos has two post generators.
