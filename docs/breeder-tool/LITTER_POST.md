# Litter Announcement Post — Generator Spec

**Sibling docs:** [`HANDOFF.md`](./HANDOFF.md) · [`SOCIAL_POSTS.md`](./SOCIAL_POSTS.md) · [`design-template-prompt.md`](./design-template-prompt.md)
**Live preview:** [`litter-preview.html`](./litter-preview.html)
**Ready-to-paste Claude Code prompt:** see [`CLAUDE_CODE_HANDOFF.md`](./CLAUDE_CODE_HANDOFF.md), Phase 2

---

## What this is

A **single-image** post generator for a whole litter — different from the per-puppy 7-slide carousel in [`SOCIAL_POSTS.md`](./SOCIAL_POSTS.md). One tall 1080×1350 PNG showing all puppies in the litter at once, plus parents, dates, and contact.

Based on Carlos's prior design ([rendered preview](./prior-design-render.png) at the time of writing this doc).

**Output: a single PNG download.** No carousel. No auto-post. Download-only.

**Audience:** people seeing the post in their feed who haven't decided which puppy they want yet — the post sells the *litter*, not a specific puppy.

---

## Strict no-personality copy rule

This is the non-negotiable change from the prior design. Carlos's new rule:

> **No words describing characteristics or personality.**

| Allowed (facts) | Not allowed (personality) |
|---|---|
| "MINI GOLDENDOODLES" | "EIGHT TINY HEARTSTEALERS" |
| "NEW LITTER" | "Sunshine in a fluff coat" |
| "Apricot F1B Goldendoodle, 75% Poodle / 25% Golden" | "Calmest of the bunch" |
| "8 PUPS" / "READY 06.14.26" | "Cuddly couch potato with zoomies" |
| "PUPPY #1" through "PUPPY #N" | "Puppy A — affectionate, easy-going" |
| "RESERVE A PUP →" (CTA, action) | "Bring home your forever friend" (sentimental) |

Words that *describe what a puppy is like* are out. Words that *state what is true and verifiable* are in.

Operator-side: when the breeder tool captures a puppy's "notes" field, that text is for the operator and the per-puppy detail view — **never rendered onto the litter post.**

---

## The format — one image, top to bottom

```
┌────────────────────────────────────────────────────────────┐
│  ◐ MINI GOLDENDOODLES         ★ NEW LITTER                 │  ← header pills
│                                                            │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                          │
│   │ #1  │ │ #2  │ │ #3  │ │ #4  │                          │  ← puppy grid row 1
│   └─────┘ └─────┘ └─────┘ └─────┘                          │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                          │
│   │ #5  │ │ #6  │ │ #7  │ │ #8  │                          │  ← puppy grid row 2
│   └─────┘ └─────┘ └─────┘ └─────┘                          │
│                                                            │
│   ┌────────────────┐         ┌────────────────┐            │
│   │  ⊙  KOKO       │         │  ⊙  STAR       │            │  ← parents
│   │     Red Mini   │         │     Apricot    │            │
│   │     Poodle     │         │     F1B GD     │            │
│   └────────────────┘         └────────────────┘            │
│                                                            │
│        MINI GOLDENDOODLES.                                 │  ← FACTUAL headline
│        EIGHT PUPS.                                         │     (no personality)
│                                                            │
│   BORN     READY     AFTER     LITTER SIZE     CALL/TEXT   │  ← stats strip
│   04.19.26 06.14.26  8 WKS     8 PUPS          (321) ...   │
│                                                            │
│        [ RESERVE A PUP → ]    ◯ logo                       │  ← CTA + brand
│        puppyheavenllc.com · Goldendoodle · Koko × Star     │  ← footer
└────────────────────────────────────────────────────────────┘
```

Grid scales: 4-up if 8+ puppies, 3-up if 6 puppies, 2-up if 4, simple row if ≤3. Always fills neatly — never half-empty cells.

---

## The brand — reuse Direction B / Lavender (dark variant)

This post uses the **dark hero** treatment from the existing system. Reference [`design_handoff_dream_puppies_b/brand.jsx`](../../design_handoff_dream_puppies_b/brand.jsx) and the [README](../../design_handoff_dream_puppies_b/README.md).

```css
/* Background */
--bg-dark:       #1A1438;   /* primary canvas */
--bg-dark-soft:  #2A2152;   /* parent cards, stat tile fills */

/* Brand accents — rotated across the puppy pills so the grid stays lively */
--primary:       #7C5CFF;   /* violet */
--accent:        #FBCFE8;   /* bubblegum pink */
--accent-deep:   #EC4899;   /* hot pink — for headline pop, "READY" highlight */
--sun:           #FFD66B;   /* yellow */
--leaf:          #86E6B7;   /* mint green */
--cyan:          #5BC8FF;   /* cyan accent (in original system) */

/* Text */
--text:          #FFFFFF;
--text-soft:     rgba(255,255,255,0.72);
```

**Puppy pill rotation** — to match the prior design's playful color stripe, rotate puppy-card pill colors by index:

```
PUPPY #1 → --accent (pink)
PUPPY #2 → --sun (yellow)
PUPPY #3 → --cyan
PUPPY #4 → --leaf (green)
PUPPY #5 → --leaf (green)        [mirrored back so #4 and #5 are adjacent same-color]
PUPPY #6 → --sun (yellow)
PUPPY #7 → --cyan
PUPPY #8 → --accent (pink)
```

**Typography** (unchanged from Direction B):
- Display headline: **Archivo 900**, ALL CAPS, letter-spacing -0.02em
- Body text: **Inter Tight 500**
- Stat labels and pill tags: **JetBrains Mono 500/700**, ALL CAPS, letter-spacing 0.18em

**Sticker shadow** on the "RESERVE A PUP →" CTA: `box-shadow: 0 12px 0 var(--accent-deep);` — flat color drop, not a soft blur. The signature.

---

## Data contract

### What the generator receives

```typescript
type LitterPostData = {
  litter: {
    id: string;
    breed: string;                       // "Mini Goldendoodle"
    born_at: string;                     // ISO date — formatted "04.19.26" on post
    ready_at: string;                    // ISO date — formatted "06.14.26", highlighted
    weeks_to_ready: number;              // derived: ready_at - born_at in weeks (8 default)
    total_count: number;                 // 8
  };
  puppies: Array<{
    index: number;                       // 1-based, drives PUPPY #N label
    primary_photo_url: string;           // public Supabase Storage URL
    gender: 'Male' | 'Female';           // not displayed on post; available for filtering
  }>;
  parents: {
    dam: {                               // mother
      name: string;                      // "Star"
      breed: string;                     // "Apricot F1B Goldendoodle"
      composition?: string;              // "75% Poodle / 25% Golden"  (from breeding_dogs.composition)
      photo_url?: string;
    };
    sire: {                              // father
      name: string;                      // "Koko"
      breed: string;                     // "Red Mini Poodle"
      composition?: string;              // "100% Poodle"
      photo_url?: string;
    };
  };
  business: {
    phone: string;                       // "(321) 697-8864"
    website: string;                     // "puppyheavenllc.com"
    instagram?: string;                  // not shown on post body but used for filename
    logo_url: string;                    // "/dream-puppies-logo.png"
  };
};
```

### Where each field lives in the schema

| Field | Source |
|---|---|
| `litter.breed` | `upcoming_litters.breed` |
| `litter.born_at` | `upcoming_litters.date_of_birth` or `litters.date_of_birth` |
| `litter.ready_at` | `litters.ready_date` (see [`HANDOFF.md`](./HANDOFF.md) — the breeder tool writes this) |
| `litter.total_count` | derived: `COUNT(puppies WHERE upcoming_litter_id = ?)` |
| `puppies[*].primary_photo_url` | `puppies.primary_photo` falling back to `puppies.photos[0]` (same logic as the public site) |
| `parents.dam.name`, `parents.dam.composition` | `breeding_dogs` joined via `upcoming_litters.dam_id` |
| `parents.sire.*` | `breeding_dogs` joined via `upcoming_litters.sire_id` |
| `business.*` | `business_info` table from [`SOCIAL_POSTS.md`](./SOCIAL_POSTS.md) |

**No new tables needed.** Everything already exists in the schema or is being added by SOCIAL_POSTS.md's `business_info` migration.

### One small migration

`breeding_dogs.composition` is already a column ([src/lib/supabase.ts:256](../../src/lib/supabase.ts)) but verify it's populated for Star and Koko. If empty, Carlos fills it in via the existing `/admin/breeding-dogs/:id/edit` form before generating posts. Add `composition` validation in that form so the field is required for any dog that will appear in a litter post.

---

## Headline — factual-only options

The big bottom-half headline replaces "EIGHT TINY HEARTSTEALERS." Carlos picks one of these patterns; the generator chooses based on `litter.total_count`:

**Pattern A — count + breed (recommended default):**
```
EIGHT MINI
GOLDENDOODLES.
```
Number spelled out, breed below. Brand pink applied to the breed line.

**Pattern B — pure count:**
```
8 PUPS.
ALL GOLDENDOODLE.
```
More minimal. Number in primary violet, second line in pink.

**Pattern C — dates only:**
```
BORN 04.19.
READY 06.14.
```
No mention of count or breed in the headline — those facts go in the stats strip instead. Most factual, least flashy.

**Code:**

```typescript
const NUMBER_WORDS = ['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN',
                      'ELEVEN','TWELVE','THIRTEEN','FOURTEEN'];
function spellOut(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}
```

If `count > 14`, fall back to numerals. Show all three patterns side-by-side in the preview modal and let Carlos click to pick before downloading.

---

## Tech — same pipeline as the carousel

This generator shares ~90% of its infrastructure with the per-puppy carousel in [`SOCIAL_POSTS.md`](./SOCIAL_POSTS.md):

- Renderer: **`html-to-image`** client-side, same as the carousel
- Output: PNG via `toPng(element, { width: 1080, height: 1350, pixelRatio: 1 })`
- Download: direct file save (no zip — single image)
- Modal pattern: same `SocialPostModal` shell, swapped contents for litter vs. puppy mode
- Brand tokens: same `business_info` row

**New code (~1 day of work):**

```
src/features/social-posts/
  templates/
    litter-lavender-dark/            # the only template needed for v1
      index.tsx                      # default export: LitterTemplate({ data, headlineMode })
      HeaderRow.tsx                  # breed pill + status pill
      PuppyGrid.tsx                  # responsive 4/3/2-up grid with rotating pill colors
      ParentCard.tsx                 # circular photo + name + breed + composition
      HeadlineBlock.tsx              # renders pattern A/B/C based on prop
      StatsStrip.tsx                 # BORN · READY · AFTER · LITTER SIZE · CALL/TEXT
      ReserveCTA.tsx                 # sticker-shadow button
      FooterLine.tsx                 # logo + url + parents echo
  components/
    LitterPostButton.tsx             # "Make Litter Post" — appears on litter rows in /admin
    LitterPostModal.tsx              # preview + headline picker + download
  hooks/
    useLitterPostData.ts             # aggregates the LitterPostData via 1 Supabase query
  types.ts                           # extend with LitterPostData
  renderLitter.ts                    # html-to-image wrapper, single-image download
```

A new template (`litter-lavender-dark`) lives alongside the per-puppy templates from `SOCIAL_POSTS.md`. Both formats use the same rendering pipeline.

---

## Where the button lives

1. **Admin upcoming-litters list** ([src/pages/admin/UpcomingLitters](../../src/pages/admin/UpcomingLitters)) — primary home. Each litter row gets a button: `[📱 Make Litter Post]`. Disabled if `total_count = 0` or fewer than `total_count` puppies have a primary photo.
2. **Admin litters list** (post-birth) — same button, same modal.
3. **Breeder dashboard** (from [`HANDOFF.md`](./HANDOFF.md)) — after Yolanda finishes capturing a litter, the "All done!" screen gets a secondary CTA: *"Generate announcement post →"* opening the same modal pre-populated.

Modal flow:

```
1. Open modal
2. Show three headline patterns rendered onto the live preview (A / B / C)
3. Carlos clicks one → preview updates
4. Carlos clicks "Download" → single PNG file saves
5. Filename: dream-puppies_LITTER_<KokoStar>_2026-04-19.png
```

---

## Stats strip — the exact data and format

The lower-half stats strip from the prior design carries the most factual density and should be preserved in look:

| Label | Source | Format on post |
|---|---|---|
| `BORN` | `litter.born_at` | `MM.DD.YY` (e.g. `04.19.26`) |
| `READY` | `litter.ready_at` (highlighted pill in leaf-green) | `MM.DD.YY` |
| `AFTER` | derived: ceil((ready_at − born_at) / 7 days) | `N WKS` (e.g. `8 WKS`) |
| `LITTER SIZE` | `litter.total_count` | `N PUPS` |
| `CALL/TEXT` | `business_info.contact_phone` | `(321) 697-8864` |

Each label uses **JetBrains Mono**, 14–18px on the 1080×1350 canvas. Values use **Archivo 900**, ~64–80px. The READY value is in a `--leaf` rounded-rectangle pill to make it pop, matching the prior design's green highlight.

---

## Acceptance criteria

1. Carlos opens `/admin/upcoming-litters`, finds a litter where `dam`, `sire`, and 8 puppies (with photos) are populated. Clicks **Make Litter Post**.
2. Modal opens within 1 second.
3. Three headline-pattern options visible at top of modal; default A is selected.
4. Preview renders all 8 puppy photos in a 4×2 grid, each labeled `PUPPY #1` through `PUPPY #8` with the brand pill colors rotating per the table above.
5. Parents block shows KOKO and STAR with breed + composition strings beneath. Circular crop, both with subtle violet ring.
6. Stats strip shows the five labels with correct formatted values. READY is in a leaf-green pill.
7. Carlos clicks **B** in the headline picker — the preview re-renders with "8 PUPS. ALL GOLDENDOODLE." instantly. No new network calls.
8. Carlos clicks **Download** — a PNG appears in his Downloads folder named `dream-puppies_LITTER_KokoStar_2026-04-19.png`, exactly 1080×1350, file size under 1MB.
9. The image, posted to IG, displays correctly with no clipping; all text legible on a phone screen.
10. **No personality language anywhere on the image.** No "HEARTSTEALERS," no "ADORABLE," no temperament words. Only breed, names, dates, counts, genetics percentages, and contact info.
11. Litter with 6 puppies → grid becomes 3×2, layout still balanced. Litter with 4 → 2×2. Litter with 3 → single row of 3. Litter with 1 → centered, hero-sized.
12. Litter where Carlos hasn't filled in `dam.composition` or `sire.composition` → the post still renders, but those lines are omitted (rather than showing "undefined"). Modal shows a soft warning: "Star's composition isn't set — the post will skip that line. Edit dog?"

---

## Things explicitly NOT in scope

- **No Instagram or Facebook API integration.** Download-only. Carlos uploads manually via the IG app, where he writes the caption fresh each time. This keeps the brand voice in his hands and avoids Meta API approval overhead.
- **No watermark/copyright overlay** beyond the existing logo. The image is meant to be screenshotted and re-shared.
- **No Spanish version** in v1. Add later if Carlos starts posting to Spanish audiences.
- **No multi-litter posts** ("here's our spring lineup"). Each post is one litter.
- **No animated GIF or video output.** Static PNG only.
- **No per-puppy personality copy** — by design, per the new rule.

---

## How this relates to the per-puppy carousel ([`SOCIAL_POSTS.md`](./SOCIAL_POSTS.md))

| | Per-puppy carousel | Whole-litter post (this doc) |
|---|---|---|
| Output | 7 PNGs in a ZIP | 1 PNG file |
| Scope | One puppy | A whole litter |
| Audience | People deciding between specific puppies | People deciding whether to *engage* at all |
| Copy style | Per-puppy notes + breeding philosophy | **Facts only, no personality** |
| Visual | Light Lavender, dark hero on slide 1 + 4 + 7 | Dark Lavender throughout |
| Trigger | Per-puppy row in admin / breeder dashboard | Per-litter row |
| Built first? | Per-puppy (more polishing surfaces) | **Build litter format first — simpler, more reusable, the format Carlos already designed** |

**Recommendation: build the litter format first.** It's simpler (no slide state machine), reuses the design Carlos already iterated on, and gets a useful tool into his hands faster. The per-puppy carousel from `SOCIAL_POSTS.md` can come second — most of the rendering infrastructure carries over.
