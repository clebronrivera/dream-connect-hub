# Social Post Export — IG/Facebook Carousel Generator

**Sibling doc to:** [`HANDOFF.md`](./HANDOFF.md) (breeder tool spec)
**Companion preview:** [`social-preview.html`](./social-preview.html)
**Design template prompt:** [`design-template-prompt.md`](./design-template-prompt.md)

---

## What this is

A button next to each puppy in the breeder dashboard (or the main `/admin` puppies list) that says **"Make IG Post"**. Clicking it:

1. Pulls that puppy's data + the litter's parent dogs + business info
2. Renders a multi-slide 1080×1350 (4:5 portrait) IG carousel using a design template
3. Shows a preview modal with the slides
4. Lets Carlos pick a template variant, optionally tweak slide order
5. Downloads a ZIP named `Cooper-2026-05-11-ig-carousel.zip` containing PNGs `slide-1.png` … `slide-7.png`
6. Carlos uploads to IG as a carousel post in the IG app

No API integration, no server-side rendering, no posting automation. Just *generate good-looking images, fast*.

---

## The brand — use the existing Direction B / Lavender system

**Do NOT design a new brand.** Pull every token from [`design_handoff_dream_puppies_b/brand.jsx`](../../design_handoff_dream_puppies_b/brand.jsx) and the [Direction B README](../../design_handoff_dream_puppies_b/README.md). Templates inherit:

```css
/* Lavender palette — primary surface */
--bg:            #FAF6FF;   /* paper canvas */
--surface:       #FFFFFF;
--ink:           #2D2A4A;   /* body text */
--ink-soft:      #5A5478;   /* secondary text */
--primary:       #7C5CFF;   /* vivid violet — primary action */
--primary-soft:  #E4DBFF;
--accent:        #FBCFE8;   /* bubblegum pink — accents */
--accent-deep:   #EC4899;
--sun:           #FFD66B;   /* tag accent */
--leaf:          #86E6B7;   /* "Available" status, tag accent */
--line:          #E8E0F5;

/* Dark hero variant — for hero slides only */
--bg-dark:       #1A1438;
--bg-dark-soft:  #2A2152;
```

**Typography** (already used across the site — load via Google Fonts in the template `<head>`):

- **Display:** `Archivo` weight **900**, ALL CAPS, letter-spacing `-0.02em`. H1/H2/H3 on every slide.
- **Body:** `Inter Tight` weight **500**, 15/24. Description, labels, microcopy.
- **Mono:** `JetBrains Mono` weight **500**, 11–12px. Tags, breed badges, IDs, "READY JUL 6 · MALE" eyebrow.

**Signature visual elements** that make a slide read as Dream Puppies:

- **Sticker shadow** on CTAs and key cards: `box-shadow: 0 6px 0 var(--primary);` — a flat color drop, NOT a soft blur. Part of the brand voice.
- **Card tilts** ±1.2° on hero photo cards, story tiles. Never on text-only blocks.
- **Pill shapes** (`border-radius: 999px`) for tags, status badges, CTAs.
- **Sparkle**, **Squiggle**, **PawIcon** SVG primitives from `brand.jsx` — copy verbatim into the template module.
- **Procedural puppy placeholder SVG** (`PuppyPlaceholder` in brand.jsx) for any slide that needs a "puppy" visual but has no photo.

The logo is at [`public/dream-puppies-logo.png`](../../public/dream-puppies-logo.png) — already in the repo. Templates reference `/dream-puppies-logo.png` directly (Vite serves `public/` at root).

---

## Carousel structure — the 7 slides

Slide order is deliberate: hook the scroll on slide 1, deliver one fact per slide, end with a CTA.

| # | Purpose | Photo used | Required data |
|---|---|---|---|
| 1 | **Hero** — stop the scroll | Face | name, breed, gender, ready-by date |
| 2 | **Meet [Name]** — personality | Face (zoomed/cropped differently) | name, description (notes) |
| 3 | **All angles** — visual proof | back + top-down + paw print (3-up grid) | the three photos |
| 4 | **Meet the parents** | Mom's photo + Dad's photo | dam.name + photo, sire.name + photo |
| 5 | **Includes** — what comes with the puppy | none (icon list) | business_info.whats_included |
| 6 | **How to reserve** | none (info card) | ready_by_date, price, contact methods, location |
| 7 | **Why Dream Puppies** — closer | logo + cream background | business_info.breeding_practices |

**Slides degrade gracefully** — if photos are missing for slide 3, that slide is skipped. If parent dogs aren't set, slide 4 is skipped. Carousel shrinks from 7 to as few as 4 slides. Public-side never shows broken slides.

---

## Data contract

### From `puppies` (already exists)

| Field | Slide(s) | Source |
|---|---|---|
| `name` | 1, 2 | direct |
| `breed` | 1 | direct |
| `gender` | 1 | direct |
| `description` | 2 | direct |
| `final_price` (or `base_price`) | 6 | direct |
| `ready_date` | 1, 6 | direct (or via `litters.ready_date`) |
| `photos[]` | 1, 2, 3 | need a way to identify which is face/back/top-down/paw |

**New: photo kinds.** Two implementation options.

- **Option A (simple, recommended):** Add column `photos_meta jsonb` to `puppies` with shape:
  ```json
  { "face": "puppy-photos/abc-face.jpg",
    "back": "puppy-photos/abc-back.jpg",
    "top":  "puppy-photos/abc-top.jpg",
    "paw":  "puppy-photos/abc-paw.jpg",
    "extras": ["puppy-photos/abc-extra1.jpg"] }
  ```
  The breeder tool writes this when capturing. The `photos[]` array stays as-is for the public site (filled with all four for backward compatibility).
- **Option B (purer):** New table `puppy_photo_kinds (puppy_id, kind, storage_path, sort_order)`. More normalized but more joins.

Pick A. It's a one-column migration, no public-site changes, and `photos_meta` is the natural place for the breeder tool to write structured photo metadata.

### From `breeding_dogs` (already exists, joined via litter)

| Field | Slide | Source |
|---|---|---|
| `dam.name`, `dam.photo_path` (or `dam.photos[0]`) | 4 | join through `upcoming_litters.dam_id` |
| `sire.name`, `sire.photo_path` (or `sire.photos[0]`) | 4 | join through `upcoming_litters.sire_id` |
| `dam.breed`, `sire.breed` | 4 (subtle) | optional |

### New: `business_info` table

Single-row config (same pattern as `breeder_config`). Owned by Carlos via `/admin/settings/business-info`.

Voice rules from the [Direction B README](../../design_handoff_dream_puppies_b/README.md) are baked into the defaults — locations are **Florida + Raeford, NC** (not Charlotte), breed list is the canonical four, and the "what's included" copy follows the approved-language rules: AKC paperwork where applicable, microchip, age-appropriate vaccines, vet check, 2-year genetic health guarantee, starter food, mom-scented blanket, 7-day text-anytime onboarding. The breeding-practices blurb is family-to-family voice, not corporate.

```sql
CREATE TABLE business_info (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name text NOT NULL DEFAULT 'Dream Puppies',
  business_legal_suffix text NOT NULL DEFAULT 'a Dream Enterprises LLC company',
  logo_path text NOT NULL DEFAULT '/dream-puppies-logo.png',
  location_primary text NOT NULL DEFAULT 'Orlando, FL',
  location_secondary text NOT NULL DEFAULT 'Raeford, NC',
  contact_phone text NOT NULL DEFAULT '(321) 697-8864',
  contact_email text,
  contact_instagram text NOT NULL DEFAULT '@dreampuppies',
  contact_website text NOT NULL DEFAULT 'puppyheavenllc.com',
  whats_included text NOT NULL DEFAULT
    'AKC paperwork where applicable · Microchip · Age-appropriate vaccines · Vet check · 2-year genetic health guarantee · Starter food · Mom-scented blanket · 7-day text-anytime onboarding',
  breeding_practices text NOT NULL DEFAULT
    'Family-operated, in-home. Raised underfoot — never a kennel, never a barn. Proactive guidance during the formative years, not just at pickup.',
  -- Brand tokens default to Direction B / Lavender. Carlos can override
  -- but the system defaults match `design_handoff_dream_puppies_b/brand.jsx`.
  brand_primary text NOT NULL DEFAULT '#7C5CFF',
  brand_accent text NOT NULL DEFAULT '#FBCFE8',
  brand_accent_deep text NOT NULL DEFAULT '#EC4899',
  brand_ink text NOT NULL DEFAULT '#2D2A4A',
  brand_paper text NOT NULL DEFAULT '#FAF6FF',
  brand_display_font text NOT NULL DEFAULT 'Archivo',
  brand_body_font text NOT NULL DEFAULT 'Inter Tight',
  brand_mono_font text NOT NULL DEFAULT 'JetBrains Mono',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE business_info ENABLE ROW LEVEL SECURITY;

-- Anyone can read (templates need it, no PII). Only admins can write.
CREATE POLICY public_read_business_info ON business_info FOR SELECT USING (true);
CREATE POLICY admin_write_business_info ON business_info FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

INSERT INTO business_info (id) VALUES (1) ON CONFLICT DO NOTHING;
```

Migration slot: `20260512000000_business_info_and_photo_meta.sql` (or whatever's next). Pair with the `photos_meta` column above in the same migration.

---

## Tech stack — rendering

**Choice: `html-to-image` (client-side).** Reasons:

- Already in the React/Vite world — no server, no edge function for this.
- Renders any DOM element to PNG with full CSS support including web fonts.
- ~12KB gzipped, no dependencies.
- Preview-able in the modal before download.
- Instant — feels native, not async.

Install: `npm i html-to-image jszip file-saver`.

Render flow:

```typescript
// src/lib/social-posts/render.ts
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function renderCarousel(
  slidesRef: HTMLElement[],  // refs to the 7 slide divs (1080x1350 each)
  filename: string
) {
  const zip = new JSZip();
  for (let i = 0; i < slidesRef.length; i++) {
    const dataUrl = await toPng(slidesRef[i], {
      width: 1080, height: 1350,
      pixelRatio: 1,                   // 1080 is already the output size
      cacheBust: true,
      style: { transform: 'none' }     // override any scale used for preview
    });
    const blob = await (await fetch(dataUrl)).blob();
    zip.file(`slide-${i + 1}.png`, blob);
  }
  const out = await zip.generateAsync({ type: 'blob' });
  saveAs(out, `${filename}.zip`);
}
```

**Photos in templates:** loaded from Supabase Storage as direct image URLs. `html-to-image` waits for `<img>` load before snapshotting. No CORS issue because the `puppy-photos` bucket is public-read.

**Fonts:** Templates load Google Fonts via a `<link>` in the page `<head>`. `html-to-image` waits for fonts via `document.fonts.ready` before snapshot.

---

## File layout (in the codebase)

```
src/features/social-posts/
  templates/
    base/                          # shared building blocks
      SlideFrame.tsx               # 1080x1350 wrapper, brand-colored
      SlideFooter.tsx              # logo + handle in corner
      BrandText.tsx                # font-aware text
    classic-pink/                  # template 1 (warm/lush — matches current brand)
      index.tsx                    # default export with all 7 slide variants
      HeroSlide.tsx
      MeetSlide.tsx
      AnglesSlide.tsx
      ParentsSlide.tsx
      IncludesSlide.tsx
      ReserveSlide.tsx
      ClosingSlide.tsx
    minimal-cream/                 # template 2 (lighter, editorial)
      index.tsx
      ...
  components/
    SocialPostButton.tsx           # the "Make IG Post" button
    SocialPostModal.tsx            # preview + template-picker + download
    SocialPostCarousel.tsx         # the actual rendered slides (offscreen)
  hooks/
    useCarouselData.ts             # gathers puppy + parents + business_info
  render.ts                        # html-to-image + zip + save
  types.ts                         # CarouselData, TemplateModule
```

Each **template** is a directory exporting a single React component that takes `<CarouselData>` and returns 7 slide elements. Adding a new template = drop in a new folder, register it in `templates/index.ts`, no other changes.

```typescript
// src/features/social-posts/types.ts
export type CarouselData = {
  puppy: {
    name: string;
    breed: string;
    gender: 'Male' | 'Female';
    description?: string;
    price?: number;
    readyDate?: string;          // ISO
    photos: { face?: string; back?: string; top?: string; paw?: string; extras?: string[] };
  };
  parents?: {
    dam?: { name: string; photo?: string; breed?: string };
    sire?: { name: string; photo?: string; breed?: string };
  };
  business: BusinessInfo;
};

export type TemplateModule = {
  id: string;
  name: string;
  preview: string;  // a static thumbnail URL
  render: (data: CarouselData) => Array<{ key: string; slide: React.ReactNode }>;
};
```

---

## Integration: where the button lives

Two natural homes; build both.

1. **Breeder dashboard** — in `BreederPuppyList.tsx` (from the breeder tool spec), each puppy row gets an inline `[📱 Make IG Post]` button. Disabled if `photos_meta.face` is missing.
2. **Admin puppies page** — same component dropped into the existing `/admin/puppies` row actions menu. Gives Carlos the same power from his own dashboard.

Modal behavior:

```
┌─────────────────────────────────────┐
│  IG Carousel — Cooper               │
│  ┌─────┬─────┬─────┬─────┬─────┐    │
│  │ 1   │ 2   │ 3   │ 4   │ ... │    │  ← thumbnail strip
│  └─────┴─────┴─────┴─────┴─────┘    │
│                                     │
│       [Large preview of slide 1]    │
│                                     │
│  Template: [Classic Pink ▼]         │  ← template picker
│  Slides:   [✓ all] [hero][meet]...  │  ← toggle individual slides off
│                                     │
│  [Download ZIP]   [Cancel]          │
└─────────────────────────────────────┘
```

Modal-internal state — no DB writes. Re-rendering on template change is instant because React only swaps the template module; data stays cached.

---

## Build phases

1. **Migration + business_info admin page.** Carlos fills in location, what's included, breeding practices, contact info. Without this, slides 5/6/7 are empty.
2. **Template scaffolding + Classic Pink template.** One template, polished. Ship it.
3. **Render pipeline.** `html-to-image` + zip + save. Test on real puppy data.
4. **Modal + button + integration in admin puppies page.** Carlos can generate before the breeder tool is even shipped.
5. **Wire into breeder dashboard.** After the breeder tool lands.
6. **Minimal Cream template.** Second variant for variety.
7. **(Later) Story format (1080×1920).** Different aspect, simpler layouts, no carousel — single image with logo + photo + CTA.

Phases 1–4 are ~3 days of focused work. 5 is a half-day once the breeder tool exists. 6–7 are continuous improvement.

---

## Brand assets — already in the repo

Everything we need is already in `public/` and `design_handoff_dream_puppies_b/`. No new asset work required:

| Asset | Location | Use |
|---|---|---|
| Logo (illustrated badge) | [`public/dream-puppies-logo.png`](../../public/dream-puppies-logo.png) (257KB) | Slides 1, 4, 7, footer chrome |
| Banner photography | [`public/puppy-heaven-banner.jpg`](../../public/puppy-heaven-banner.jpg) | Background option for closing slide |
| Sample puppy photos | [`puppy-images/`](../../puppy-images/) — pom1, shihtzu_1, etc. | Test data while developing |
| Brand tokens (palette, fonts, primitives) | [`design_handoff_dream_puppies_b/brand.jsx`](../../design_handoff_dream_puppies_b/brand.jsx) | Source of truth for colors + reusable SVGs |
| Design system spec | [`design_handoff_dream_puppies_b/Dream Puppies Design System.html`](../../design_handoff_dream_puppies_b/Dream%20Puppies%20Design%20System.html) | Open this side-by-side while building templates |
| Voice rules | [`design_handoff_dream_puppies_b/README.md`](../../design_handoff_dream_puppies_b/README.md) | What we say + what we never say |

When building templates, **copy the SVG primitives** (`PuppyPlaceholder`, `Sparkle`, `Squiggle`, `PawIcon`) from `brand.jsx` into `src/features/social-posts/templates/_shared/primitives.tsx` and convert from the script-tag-style JSX to proper TSX with type definitions. The visual output should be identical.

---

## Acceptance criteria

1. Carlos opens `/admin/settings/business-info`, fills in location, contact, what's included, breeding practices. Saves.
2. Carlos opens `/admin/puppies`, finds a puppy with all 4 photo kinds set, clicks "Make IG Post."
3. Modal opens within 1 second showing 7 slide previews.
4. Slide 1 shows: puppy's face photo full-bleed, name in display font, "READY JUL 6 · MALE GOLDENDOODLE" subtitle, logo in corner.
5. Slide 4 shows: mom photo + name on top half, dad photo + name on bottom, "Health-tested parents" footer.
6. Clicking download produces a ZIP with 7 PNG files, each exactly 1080×1350.
7. Uploaded to IG via the app, slides display correctly, no clipping, all text legible.
8. A puppy with only face + back photos (no top-down, no paw, no parents): modal renders 4 slides (hero, meet, angles using just face+back, includes, reserve, closing). Slide 4 (parents) is auto-skipped.
9. Switching template variant in the modal re-renders all slides instantly with the new style.
10. Generated images use the brand purple/pink palette, not generic colors.

---

## Voice rules — copy guardrails for slide text

All slide copy must follow the [Direction B README's voice rules](../../design_handoff_dream_puppies_b/README.md#voice--copy-rules-non-negotiable--the-family-approved-these):

- Locations: **Florida and Raeford, North Carolina** — never "Charlotte."
- Breed list (in this canonical order): **Mini Goldendoodle, Labradoodle, Mini Poodle, Shih Tzu.**
- Never quote a specific count of puppies or litters — inventory changes ("Cooper is available now" ✓, "1 of 5 boys remaining" ✗).
- Never say "low-shed" or promise hypoallergenic on a public-facing post.
- Never say "Puppy Guide included with every puppy" (it's a free service, not bundled).
- Don't promise "first-year support" — the approved phrasing is **"proactive guidance — especially during the formative years."**
- Footer chrome on slide 7: **"a Dream Enterprises LLC company."**
- Voice: family-to-family, plain-spoken, warm. Not corporate, not cute-for-cute's-sake. No "fur babies," no "doodles 'til I die," no fake urgency.

The `business_info.breeding_practices` and `whats_included` defaults are already worded to comply. If Carlos edits them in `/admin/settings/business-info`, the page should show these rules above the textarea so they're not accidentally violated.

---

## Open questions

- **Slide template starting set.** Plan ships one polished "Lavender" template first, matching the existing site design. Second variant comes after Carlos sees the first one in production — could be a dark-hero variant using `--bg-dark`, or a high-contrast cream variant.
- **Watermark.** Light `@dreampuppies` handle in the corner of every slide, or only the final slide? Slight preference for every slide — re-shares stay credited even if the deck is split up.
- **Spanish version.** The codebase has i18n via `LanguageContext` (`useLanguage` hook). Want a Spanish toggle in the post-export modal so we can produce ES carousels too? Real lift; defer to a v2.
- **Litter posts.** This plan covers single-puppy carousels. A whole-litter "meet the babies" post is a different template — group hero, one slide per puppy, family-photo close. Worth a sibling template after v1 ships.

---

## Reusable design prompt

For when Carlos wants a brand-new template style and wants a designer (or another Claude session) to draft it: see [`design-template-prompt.md`](./design-template-prompt.md). That doc is self-contained — hand it over with the brand assets and the data contract above, get back a styled mockup of 7 slides, hand that to Claude Code, get back a registered template module.
