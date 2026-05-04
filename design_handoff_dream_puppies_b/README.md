# Handoff: Dream Puppies — Direction B redesign

> For: **dream-connect-hub** (the Lovable/React + Vite + Tailwind + shadcn project at `github.com/clebronrivera/dream-connect-hub`)
> Brand: **Dream Puppies** — a doing-business-as for **Dream Enterprises LLC**, family-operated across Florida and Raeford, North Carolina.

---

## Overview

This is a redesign of the public-facing surface of the Dream Puppies website. It introduces a new visual system ("Direction B — Lively Interactive"), a new information architecture for the **Upcoming Litters** page (a per-litter reservation slot grid), and a new **Reserve-a-Spot** flow that calculates the deposit dynamically based on whether the puppies have been born yet.

It does **not** redesign the admin dashboard or any auth/admin routes.

---

## About the design files

**The files in this bundle are design references created in HTML** — playable, interactive prototypes meant to show the intended look, layout, and behavior. They are not production code to copy directly.

Your task is to **recreate these HTML designs inside the existing dream-connect-hub codebase**, using:
- the existing **React + Vite + Tailwind + shadcn-ui** stack,
- the existing **`Layout` / `Seo` / `useLanguage` / `Toaster`** primitives,
- the existing **Supabase** data layer (puppies, litters, breeds, reservations, etc.),
- the existing **`react-router-dom`** routes.

Do **not** introduce new frameworks. Do **not** rewrite admin/auth code. Treat the HTML as a visual + behavioral spec.

---

## Fidelity

**High-fidelity.** Final colors, type scale, spacing, radii, and component anatomy are all locked in. Copy in the prototypes is mock — wire the real strings through the existing i18n dictionary in `src/contexts/LanguageContext` and the existing Supabase tables.

The system must hold up at **0, 2, or 40+ available puppies** — inventory is dynamic; never hardcode counts in copy.

---

## Files in this bundle

| File | What it is |
|---|---|
| `Dream Puppies Design System.html` | **The spec.** Open this first. Tokens, type, components, reserve flow, implementation notes. |
| `Dream Puppies Redesign.html` | Multi-direction comparison canvas. Direction B is the chosen one (middle section). A and C are kept for reference only. |
| `brand.jsx` | Shared brand tokens used by all three directions. |
| `direction-b.jsx` | **The page-by-page Direction B mocks.** This is the source of truth for layout. |
| `direction-a.jsx`, `direction-c.jsx` | Alternate directions, reference only. |
| `design-canvas.jsx` | Pan/zoom canvas wrapper. Not part of the product. |

---

## Pages in scope

All public-facing pages. Do these in this order — earlier pages establish the patterns later pages reuse:

1. **Home** (`src/pages/Index.tsx`)
2. **Available Puppies** (`src/pages/Puppies.tsx`)
3. **Upcoming Litters** (`src/pages/UpcomingLitters.tsx`) — biggest IA change, includes new Reserve flow
4. **Breeds** (`src/pages/Breeds.tsx`)
5. **Training & Consultation** (`src/pages/Consultation.tsx`)
6. **Essentials**
7. **Dreamy Reviews**
8. **Contact + FAQ** (`src/pages/Contact.tsx`)

---

## Voice & copy rules (non-negotiable — the family approved these)

- **Brand name in footer chrome:** "a Dream Enterprises LLC company".
- **Locations:** Florida and **Raeford, North Carolina** — never "Charlotte".
- **Breeds we actually raise**, in this order: **Mini Goldendoodle, Labradoodle, Mini Poodle, Shih Tzu**. The Breeds page can show up to 8 favorites the family has loved over the years, but only those four are "in our home right now."
- **Don't say** "two puppies / thirty more by August" or any other dated, count-specific copy. Inventory changes constantly.
- **Don't say** "Five litters" or any specific litter count.
- **Don't say** "low-shed" — coats vary; we don't promise it.
- **Don't say** "Puppy Guide included with every puppy." It's a **free service for everyone**, optional and supplementary.
- **Don't say** "we answer texts at year three" / "first-year support" — the real promise is: **"we send proactive guidance — especially during the formative years — about what to watch for."**
- **Voice:** family talking to a future family. Plain-spoken, confident, warm. Never corporate, never cute-for-cute's-sake. No "fur babies," no "doodles 'til I die," no fake urgency.

---

## Design tokens

### Color (hex + HSL — both formats so you can drop straight into `tailwind.config.ts` and `src/index.css`)

| Token | Hex | HSL | Use |
|---|---|---|---|
| `--bg` | `#1A1438` | `252 49% 15%` | Hero / upcoming page background |
| `--bg-soft` | `#2A2152` | `251 43% 23%` | Dark section variant |
| `--paper` | `#FAF6FF` | `264 100% 98%` | Light page canvas (default `--background`) |
| `--ink` | `#0F0A24` | `252 56% 9%` | Body text on paper, CTA fill on light |
| `--ink-soft` | `#5A5478` | `251 17% 40%` | Secondary text |
| `--line` | `#E8E0F5` | `264 50% 92%` | Borders, dividers |
| `--primary` | `#A78BFA` | `252 91% 76%` | Primary surface |
| `--primary-deep` | `#7C5CFF` | `252 100% 68%` | Brand action, focus rings, sticker shadow |
| `--accent` | `#FF6FBE` | `327 100% 72%` | Pink sticker accents, open reservation slots |
| `--sun` | `#FFD66B` | `43 100% 71%` | Tag accent #1 |
| `--leaf` | `#5BE5A4` | `149 73% 63%` | "Available" status, tag accent #2 |
| `--cyan` | `#5BC8FF` | `201 100% 68%` | Tag accent #3 |

### Type

- **Display:** `Archivo` 900, all caps, letter-spacing `-0.02em`. Used for H1–H3.
- **Body:** `Inter Tight` 500, 15/24. Used for paragraphs, forms, UI.
- **Mono:** `JetBrains Mono` 500, 11–12px. Used for tags, IDs, ticker details.

Sizes: H1 96–110px · H2 56–72px · H3 22–28px · body 15px · eyebrow 11px (letter-spacing 0.18em) · mono 11–12px.

### Radii

- `--radius-sm` **8px** — inputs, small chips
- `--radius-md` **18px** — slot tiles, photo wells
- `--radius-lg` **28px** — cards, story tiles, hero
- `--radius-pill` **999px** — buttons, tags, chips

### Spacing

8-point scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 80px. Section vertical rhythm = **80px**. Page gutter / hero padding = **48px**.

### Shadows

The signature **sticker shadow** on primary buttons:
```css
box-shadow: 0 6px 0 var(--primary-deep);
```
A flat color drop, not a soft blur. This is part of the brand voice.

---

## Component index

| Component | Used on | Replaces / extends in repo | Notes |
|---|---|---|---|
| **NavBar** | All public | `components/layout/Navbar.tsx` | Pill-shaped tab group; dark/light variant by page. |
| **HeroDark** | `/`, `/upcoming-litters` | `pages/Index.tsx` hero | Big display + stat strip + tilted card stack on right. |
| **Marquee** | `/`, `/breeds` | `AvailablePuppiesMarquee.tsx` | Edge-to-edge ticker, pauses on hover. Items are breeds + values, not puppy names. |
| **StoryTile** | `/` | new | Slight tilt; rotates accent color by index. |
| **PuppyCard** | `/puppies`, `/` | extend `pages/PuppyCard` | Sticker shadow, status pill, favorite ♡. |
| **FilterChips** | `/puppies` | extend Puppies filter bar | One row, no dropdowns; selected chip = ink fill. |
| **LitterCard + SlotGrid** | `/upcoming-litters` | new (replaces `UpcomingLittersSection`) | 2-col card; right side is the slot grid. **See "Upcoming Litters" below.** |
| **ReserveFlow** | modal from `/upcoming-litters` | extend `DepositRequestForm.tsx` | 3-step modal ending in deposit calc. **See "Reserve flow" below.** |
| **BreedTile** | `/breeds` | `pages/Breeds.tsx` | Solid candy bg, rendering on white tile, slight tilt by index. |
| **FAQAccordion** | `/faq`, `/contact` | `pages/FaqPage.tsx` | Reuse shadcn `Accordion`; chunky borders, all-caps triggers. |
| **ReviewCard** | `/dreamy-reviews` | `pages/DreamyReviews.tsx` | Two flavors: light (paper) + deep (primary). |
| **FooterStrip** | All public | `components/layout/Footer.tsx` | Includes "a Dream Enterprises LLC company". |

---

## Upcoming Litters — the reservation slot system (most important new IA)

This is the centerpiece of Direction B and the biggest change from the current site.

**Concept:** each litter is shown as a card with a fixed grid of slots — one slot per expected puppy. Each slot is in one of three states:

| State | Visual | Behavior |
|---|---|---|
| `picked` | Solid `--leaf` fill, ink border | Already taken by a confirmed reservation. Not clickable. Shows `🔒 #N`. |
| `reserved` | Faded, locked | Pending deposit / soft-hold. Not clickable. Shows `🔒 #N`. |
| `open` | Dashed `--accent` border, dark fill, procedural puppy SVG | Clickable. Opens the Reserve flow with this litter+slot pre-selected. |

The `open` slot SVG is a **procedural puppy portrait** driven by:
- `hue` — the expected coat hue (sampled from parent genetics in the litter row)
- `ear` — `0` (floppy) or `1` (perky), matching the breed

This signals "puppy" without faking a specific dog — important because the puppies aren't born yet. See the SVG markup at the bottom of `direction-b.jsx` (`B_PuppySVG`).

**Card anatomy:**
- Eyebrow: parents (e.g. `CORAL × ATLAS`)
- Title: the breed
- Right: the slot grid (4 columns)
- Bottom strip: due date · pickup window · expected coat range · "size may vary due to genetics" disclaimer

---

## Reserve-a-Spot flow (3 steps, deposit calculated dynamically)

**Trigger:** click an `open` slot in any litter card, or the "Reserve a spot" CTA.

**Step 1 — Pick litter + spot.** Modal opens preloaded with litter, breed, due date, expected coat range. If the user came from a slot click, that slot is pre-selected; otherwise show all open slots across litters.

**Step 2 — Tell us about your home.** Name, contact, household notes (kids, other pets, allergies), preferences (sex leaning, color leaning), pickup vs. transport. Reassuring micro-copy: *"this isn't a contract yet — we'll review and reach out."*

**Step 3 — Confirm + deposit.** This is where price first appears.

**Deposit math (read this carefully — it's the one thing that absolutely cannot be wrong):**
- If the puppies are **NOT YET BORN** (litter `due_date > today`): deposit = **¼ of total puppy price.**
- If the puppies are **ALREADY BORN** (litter `due_date <= today` or `puppies_born = true`): deposit = **⅓ of total puppy price.**
- Deposit is **credited toward the total at pickup.** Show this on the confirm screen.
- Refundability rules to be confirmed with the family — surface a "see deposit terms" link, don't invent copy.

Implementation note: deposit price should derive from the litter row at runtime — never hardcoded. If the price isn't set in the database yet, show "We'll confirm pricing in a follow-up email" instead of `$0`.

---

## Interactions & behavior

- **Marquee:** auto-scroll left, pauses on hover. CSS-only (`@keyframes` + `animation-play-state: paused`).
- **Pill nav:** active tab gets `--ink` fill on light mode, `--primary-deep` on dark mode. Smooth transition (`200ms ease`).
- **Slot hover (open slots only):** scale `1.04`, accent-colored glow. `200ms ease-out`.
- **Reserve modal:** standard shadcn `Dialog`. ESC closes. Step indicator at top. Don't use a multi-page route.
- **Card tilts:** rotation `±1.2°` by index, applied via `transform: rotate()`. Don't apply to interactive elements.
- **Buttons:** primary has the sticker shadow described above; on press, translate `0 2px` and reduce shadow to `0 4px 0`.
- **Loading states:** use shadcn `Skeleton` with `--line` background. Slot grids: render the skeleton in the same 4-col grid.
- **Empty states:** "No puppies in our home right now — see what's coming." Link to `/upcoming-litters`. Don't show a 0-count.

---

## State management

Use the existing data layer (Supabase + react-query). New pieces this redesign needs:

- `useLitterSlots(litterId)` — derive the slot array from litter size + reservations table. Returns `Array<{ index, state, reservationId? }>`.
- `useReserveFlow()` — local modal state; selected litter, selected slot, form values, current step.
- Nothing here is global; keep it co-located with the components.

---

## Assets

- Brand wordmark: lowercase wordmark in display font, no logo file needed yet — render as text.
- `puppy-heaven-banner.jpg` from the existing repo (`public/`) — fine to keep but don't lean on it; the new hero uses procedural SVG and type as the visual.
- All puppy "photos" in the prototype are procedural SVG. **Replace with real photos** wherever the database has them; only fall back to the SVG when a photo URL is missing.

---

## Implementation order (recommended)

1. **Tokens.** Update `src/index.css` HSL block + `tailwind.config.ts` colors/fonts/radii/shadows. Add Archivo, Inter Tight, JetBrains Mono to `index.html`. Verify nothing else breaks before moving on.
2. **Layout shell.** Update `Navbar.tsx` and `Footer.tsx` to the new pill nav and footer strip. Confirm both render on every public page.
3. **Home.** Rebuild `pages/Index.tsx` hero + story tiles + marquee.
4. **Available Puppies.** Rebuild `pages/Puppies.tsx` with new `PuppyCard` and `FilterChips`. Wire to the existing Supabase query.
5. **Upcoming Litters.** This is the biggest change. Build `LitterCard`, `SlotGrid`, `B_PuppySVG`, and the `ReserveFlow` modal. Wire to the litters + reservations tables.
6. **Breeds, Training, Essentials, Reviews, Contact + FAQ.** These reuse the patterns from steps 2–5; should go quickly.
7. **i18n pass.** Move every string into `LanguageContext`. Don't ship hardcoded English.

---

## Things explicitly out of scope

- Admin dashboard, auth flows, any `/admin/*` route.
- The supabase schema. (You may need a `reservations` table or `slot_index` column if not already there — coordinate with the family before changing.)
- Real photography sourcing.
- Email/SMS template design.

---

## Quickstart for Claude Code

Once you've got this bundle in `~/dream-connect-hub/design_handoff_dream_puppies_b/`:

```bash
cd ~/dream-connect-hub
claude
```

Then prompt:

> Read `design_handoff_dream_puppies_b/README.md` and `design_handoff_dream_puppies_b/Dream Puppies Design System.html`. Then implement step 1 from the "Implementation order" section: update the Tailwind/CSS tokens to match the design system. Don't touch any admin routes. When you're done, summarize what you changed and stop.

Repeat for each step. Review and commit between steps.
