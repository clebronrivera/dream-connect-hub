# Dream Puppies — Design System

> **Source of truth** for colors, typography, spacing, radius, and component patterns.  
> Canonical token values live in `src/index.css` + `tailwind.config.ts`.  
> Full visual spec in `design_handoff_dream_puppies_b/Dream Puppies Design System.html` (Direction B, the active direction).  
> Last token file change: `801f4ad` (May 3, 2026).

---

## Color palette

### Core tokens

All shipped as CSS custom properties (HSL) and aliased into Tailwind via `tailwind.config.ts`.

| Token | CSS var | Hex | HSL | Tailwind class | Use |
|---|---|---|---|---|---|
| BG | `--bg` | `#1A1438` | `252 49% 15%` | `bg-bg`, `text-bg` | Hero / editorial dark sections |
| BG Soft | `--bg-soft` | `#2A2152` | `251 43% 23%` | `bg-bgSoft` | Secondary dark surface, admin sidebar |
| Paper | `--paper` | `#FAF6FF` | `264 100% 98%` | `bg-paper` | Light-mode page canvas (default `--background`) |
| Ink | `--ink` | `#0F0A24` | `252 56% 9%` | `text-ink`, `bg-ink` | Body text on paper; CTA fill on light |
| Ink Soft | `--ink-soft` | `#5A5478` | `251 17% 40%` | `text-inkSoft` | Secondary text, labels, timestamps |
| Line | `--line` | `#E8E0F5` | `264 50% 92%` | `border-line` | All borders, dividers, card edges |
| Primary | `--primary` | `#A78BFA` | `252 91% 76%` | `bg-primary`, `text-primary` | Soft lavender; light-mode accent links |
| Primary Deep | `--primary-deep` | `#7C5CFF` | `252 100% 68%` | `bg-primaryDeep`, `text-primaryDeep` | Brand action; hover/focus rings; sticker drop-shadow |
| Accent | `--accent` | `#FF6FBE` | `327 100% 72%` | `bg-accent`, `text-accent` | Pink sticker primary CTA; open reservation slots |
| Sun | `--sun` | `#FFD66B` | `43 100% 71%` | `bg-sun`, `text-sun` | Warning / milestone tags; stat cards |
| Leaf | `--leaf` | `#5BE5A4` | `149 73% 63%` | `bg-leaf`, `text-leaf` | Success / available status; positive states |
| Cyan | `--cyan` | `#5BC8FF` | `201 100% 68%` | `bg-cyan`, `text-cyan` | Info tags; third candy accent |

### shadcn semantic aliases (light mode)

| CSS var | Resolves to | Use |
|---|---|---|
| `--background` | `--paper` | Page canvas |
| `--foreground` | `--ink` | Default text |
| `--card` | `0 0% 100%` (pure white) | Card surface |
| `--muted` | `264 42% 95%` | Subdued backgrounds |
| `--muted-foreground` | `--ink-soft` | Subdued text |
| `--border` | `--line` | Input and card borders |
| `--destructive` | `0 84% 60%` | Error states |
| `--ring` | `--primary-deep` | Focus rings |

### Dark mode (`.dark` class)

The dark shell uses `--bg` as background and all whites inverted. Admin UI does **not** use `.dark` — admin always renders on the light (`--paper`) surface.

### Galactic public-page extension (from branch `feat/puppies-hero-color-scheme`, commit `42c0f27`)

The galactic pages opt into a slightly deeper dark shell than `--bg`. These are **not** CSS token overrides — they're hardcoded Tailwind values in component className strings:

| Purpose | Value | Use |
|---|---|---|
| Page shell bg | `#0f041b` | Full-page dark background (`min-h-screen bg-[#0f041b]`) |
| Hero radial gradient | `#2a0f3a → #1a0a2e → #0f041b` | Hero background (`radial-gradient(...)`) |
| Card surface | `bg-white/[0.06]` or `bg-[#12051f]/90` | Content cards on the dark shell |
| Card border | `border-white/10` to `border-white/15` | Subtle separators |
| Primary CTA (pink) | `#ff3399` | Glossy pink sticker buttons |
| Secondary CTA | `bg-violet-500` style | Purple outline variants |

The galactic extension does not update the token system — it layered on top. The token system remains the source of truth for all admin, form, and agreement components.

---

## Typography

Three typefaces. All loaded via Google Fonts (see `index.html` → `<link rel="preconnect" ...>`).

### Fonts

| Family | Weight | Tailwind class | CSS var | Use |
|---|---|---|---|---|
| **Archivo** | 900 (Black) | `font-display` | `--display` | All headings, display text, card titles, eyebrows |
| **Inter Tight** | 400–800 | `font-body` (default) | `--body` | Body, forms, UI labels, navigation |
| **JetBrains Mono** | 400–600 | `font-monoDream` | `--mono` | ID badges, timestamps, price tags, code refs, `.micro-label` |

### Type scale

| Role | Font | Size | Weight | Tracking | Transform | Class pattern |
|---|---|---|---|---|---|---|
| Display hero | Archivo | 72–96px | 900 | `-0.02em` | Uppercase | `font-display text-7xl uppercase tracking-tight` |
| Section H2 | Archivo | 56–72px | 900 | `-0.02em` | Uppercase | `font-display text-5xl uppercase tracking-tight` |
| Card H3 | Archivo | 22–28px | 900 | `-0.02em` | Uppercase | `font-display text-2xl uppercase tracking-tight` |
| Eyebrow | JetBrains Mono | 11px | 700 | `0.18em` | Uppercase | `micro-label` utility class |
| Body | Inter Tight | 15px | 400–500 | default | none | (default body) |
| Subtext / label | Inter Tight | 12–13px | 500 | default | none | `text-sm text-inkSoft` |
| Mono badge | JetBrains Mono | 11–12px | 500–700 | default | default | `font-monoDream text-xs` |

### CSS utilities (defined in `src/index.css` `@layer utilities`)

```css
.font-display   { font-family: "Archivo", "Inter Tight", system-ui, sans-serif; }
.font-body      { font-family: "Inter Tight", system-ui, sans-serif; }
.font-mono-dream{ font-family: "JetBrains Mono", monospace; }
.micro-label {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase;
}
```

---

## Spacing

8-point scale via standard Tailwind. No custom spacing tokens — use Tailwind's default multipliers.

| Step | Value | Primary use |
|---|---|---|
| 1 (`4px`) | `gap-1`, `p-1` | Tag inner gap, icon-text gap |
| 2 (`8px`) | `gap-2`, `p-2` | Chip group gaps |
| 3 (`12px`) | `gap-3`, `p-3` | Inline button groups |
| 4 (`16px`) | `gap-4`, `p-4` | Card-to-card grid gaps |
| 6 (`24px`) | `gap-6`, `p-6` | Section internals, card padding (standard) |
| 8 (`32px`) | `gap-8`, `p-8` | Card padding (large), hero internals |
| 12 (`48px`) | `p-12` | Page gutter, hero padding |
| 20 (`80px`) | `.section-space` | Vertical section rhythm |

`.section-space` CSS utility: `padding-top: 80px; padding-bottom: 80px`.

---

## Border radius

4-step scale, all custom tokens. **No in-betweens.** Curvature signals friendliness — use larger radii for content cards, smaller for inputs.

| Token | CSS var | Value | Tailwind class | Use |
|---|---|---|---|---|
| Pill | `--radius-pill` | `999px` | `rounded-pill` | Buttons, tags, chips, filter chips |
| Large | `--radius-lg` | `28px` | `rounded-lg` | Cards, story tiles, dialog panels |
| Medium | `--radius-md` | `18px` | `rounded-md` | Slot tiles, photo wells, smaller cards |
| Small | `--radius-sm` | `8px` | `rounded-sm` | Inputs, small chips, code blocks |

> ⚠️ `rounded` (Tailwind default: 4px) does not exist in the design system. Use `rounded-sm` (8px) as the minimum.

---

## Buttons

Pill-shaped (`rounded-pill`), all-caps, slight letter-spacing. Primary has sticker drop-shadow in `--primary-deep`.

### Variants

| Variant | Background | Text | Shadow | Use |
|---|---|---|---|---|
| **Primary (accent)** | `bg-accent` | `text-ink` | `shadow-sticker` (`0 6px 0 hsl(--primary-deep)`) | Main public CTA |
| **Dark** | `bg-ink` | `text-white` | none | Secondary public CTA on light bg |
| **Ghost light** | transparent | `text-ink` | `border-2 border-ink` | Tertiary on light bg |
| **Ghost dark** | transparent | `text-white` | `border-2 border-white/50` | Tertiary on dark bg |
| **Sun** | `bg-sun` | `text-ink` | none | Submit / interest forms |
| **Leaf** | `bg-leaf` | `text-ink` | none | Available / positive action |

### Tailwind class pattern (from `PublicDesignPrimitives.tsx`)

```tsx
// DreamCTA — the primary sticker button
className={cn(
  "rounded-pill font-bold tracking-[0.08em] uppercase shadow-sticker active:sticker-press",
  className
)}

// DreamTag — the label chip
className={cn(
  "inline-flex items-center gap-2 rounded-pill bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink",
  className
)}
```

### Admin buttons

Admin pages use shadcn `<Button>` with `variant="default"` (maps to `--primary` fill) or `variant="outline"` (maps to `--border` border). The sticker shadow is not applied in admin UI — cleaner utilitarian style for operator focus.

---

## Status tags

Solid-fill pills with a leading `●` dot for live states. Never carry hover states — labels only.

| Status | Background | Text | Example |
|---|---|---|---|
| Available | `bg-leaf` | `text-ink` | `● AVAILABLE` |
| Updated / Active | `bg-sun` | `text-ink` | `● UPDATED 4H AGO` |
| Puppy of the week | `bg-cyan` | `text-ink` | `● PUPPY OF THE WEEK` |
| Spots remaining | `bg-accent` | `text-ink` | `● 4 SPOTS LEFT` |
| Reserved | `bg-[#E0DCEB]` | `text-ink` | `RESERVED` |
| Sold | `bg-[#E0DCEB]` | `text-inkSoft` | `SOLD` |

---

## Cards

Three flavors. All share `rounded-lg` (28px) and candy-accent rotation.

| Flavor | Used on | Background | Border |
|---|---|---|---|
| **Puppy card** | `/puppies`, home marquee | `white` | `2px solid --ink` |
| **Litter card** | `/upcoming-litters` | `--bg` (dark) | none |
| **Story tile** | Home, About | `bg-accent` (rotates by index) | none, slight tilt |
| **Admin card** | All admin pages | `bg-card` (pure white) | `1px border-line` |
| **Galactic content card** | Dark public pages | `bg-white/[0.06]` or `bg-[#12051f]/90` | `border-white/10` |

---

## Semantic color mapping for admin / form components

Admin components should use **only** these patterns for semantic states. Off-system Tailwind color classes (`green-*`, `emerald-*`, `blue-*`, `amber-*`) are drift and should be replaced.

| Semantic state | Background | Border | Text | Badge |
|---|---|---|---|---|
| Success / confirmed | `bg-leaf/10` | `border-leaf/30` | `text-ink` | `bg-leaf text-ink` |
| Info / next step | `bg-primary/10` | `border-primary/20` | `text-ink` | `bg-primary text-ink` |
| Warning / mismatch | `bg-sun/15` | `border-sun/30` | `text-ink` | `bg-sun text-ink` |
| Error / destructive | `bg-destructive/10` | `border-destructive/30` | `text-destructive` | — |
| Neutral / muted | `bg-muted` | `border-border` | `text-muted-foreground` | — |
| Primary action button | `bg-primaryDeep hover:bg-primary` | — | `text-white` | — |

> Note: Admin primary buttons do NOT get `shadow-sticker`. That's a public-CTA-only treatment.

---

## Component patterns established by the redesign

### `DreamTag` (public tags)
```tsx
// src/components/redesign/PublicDesignPrimitives.tsx
<DreamTag className="bg-leaf">● AVAILABLE</DreamTag>
<DreamTag className="bg-sun">UPCOMING LITTER</DreamTag>
```

### Admin section headers
```tsx
// Consistent admin card-title pattern
<CardTitle className="text-sm font-semibold text-foreground">Section name</CardTitle>
```

### Admin layout surface
```tsx
// AdminLayout.tsx — the established pattern
<div className="flex h-screen bg-muted/40">
  <div className="... bg-card border-r border-line ...">
    <p className="font-display text-lg tracking-tight text-ink">Dream Puppies</p>
  </div>
</div>
```

### Eyebrow labels
```tsx
// JetBrains Mono, 11px, uppercase, 0.18em tracking
<span className="micro-label text-primaryDeep">UPCOMING LITTERS · RESERVE EARLY</span>
```

---

## Custom Tailwind extensions (`tailwind.config.ts`)

```ts
extend: {
  colors: {
    bg, bgSoft, paper, ink, inkSoft, line, primaryDeep, sun, leaf, cyan,
    // + all shadcn aliases (border, input, ring, background, foreground, primary, secondary, ...)
  },
  fontFamily: {
    display: ["Archivo", "Inter Tight", "system-ui", "sans-serif"],
    body:    ["Inter Tight", "system-ui", "sans-serif"],
    monoDream: ["JetBrains Mono", "monospace"],
  },
  borderRadius: {
    lg:   "28px",   // --radius-lg  (overrides Tailwind default 8px)
    md:   "18px",   // --radius-md
    sm:   "8px",    // --radius-sm
    pill: "999px",  // --radius-pill (new)
  },
  boxShadow: {
    sticker: "0 6px 0 hsl(var(--primary-deep))",  // the chunky CTA shadow
  },
  animation: {
    marquee: "marquee 40s linear infinite",
  },
}
```

> ⚠️ `rounded-lg` in this codebase means **28px**, NOT Tailwind's default 8px. Every future component should use the system radii — never `rounded-2xl`, `rounded-3xl`, or other off-scale values.
