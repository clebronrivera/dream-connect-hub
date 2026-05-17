# Reusable design-template prompt — IG carousel templates for Dream Puppies

**What this is:** A self-contained prompt Carlos can paste into a fresh Claude session (or hand to a human designer) to commission a new IG carousel template that fits the Dream Puppies brand.

**How to use it:**

1. Decide what *kind* of template you want — a mood, season, audience. Examples below.
2. Paste the whole prompt block below, replacing `[TEMPLATE BRIEF]` with your description.
3. Attach the logo file (`public/dream-puppies-logo.png`) and a sample puppy photo if available.
4. Run the session. You'll get back a 7-slide HTML mockup you can review.
5. Once you approve it, hand the mockup + this doc + [`SOCIAL_POSTS.md`](./SOCIAL_POSTS.md) to Claude Code with: *"Add this as a new template module under `src/features/social-posts/templates/[slug]/`."*

---

## Brief examples — fill in `[TEMPLATE BRIEF]` with one of these (or your own)

- *"Cream Editorial — light, magazine-style template with lots of breathing room, serif accents for puppy names. Feels like Kinfolk for puppies."*
- *"Holiday — December warmth, deep red and forest green accents over our paper background, subtle snowflake squiggles. For Christmas-week posts."*
- *"Bilingual ES — same Lavender brand but with primary copy in Spanish. Eyebrow tags stay English (READY · MALE · etc.)."*
- *"Bold Carnival — saturated, playful, leans into the sun (#FFD66B) and leaf (#86E6B7) accents. For Available-now urgency posts."*
- *"Litter group — one carousel for a whole litter at once, not a single puppy. Hero shows the family pile, then one slide per pup."*

---

## The prompt to paste

```
You are designing a 7-slide Instagram carousel template for Dream Puppies, a family-operated dog
breeding business in Florida and Raeford, North Carolina (DBA Dream Enterprises LLC).

YOUR DELIVERABLE: a single self-contained HTML file (no build step, all CSS and SVG inline) that
renders 7 slides side-by-side at 1080×1350 portrait aspect ratio. The file should scale each slide
down via CSS transform to fit the screen. Use Google Fonts via <link>. Use procedural SVG puppy
placeholders, NOT real photo URLs — the placeholders will be replaced with real Supabase Storage
photos in production.

TEMPLATE BRIEF: [TEMPLATE BRIEF]

NON-NEGOTIABLE BRAND CONSTRAINTS (these come from the existing Direction B / Lavender design system
already shipping on dreampuppies.com — your template must feel like it belongs in this family):

PALETTE (you may add 1–2 supporting colors that fit the brief, but these must remain the spine):
  --bg            #FAF6FF   paper canvas
  --surface       #FFFFFF
  --ink           #2D2A4A   body text
  --ink-soft      #5A5478   secondary text
  --primary       #7C5CFF   vivid violet — primary action
  --primary-soft  #E4DBFF
  --accent        #FBCFE8   bubblegum pink — accents
  --accent-deep   #EC4899
  --sun           #FFD66B   tag accent
  --leaf          #86E6B7   "Available" status, tag accent
  --line          #E8E0F5
  --bg-dark       #1A1438   dark hero variant
  --bg-dark-soft  #2A2152

TYPOGRAPHY (load all three from Google Fonts):
  - Display:  Archivo weight 900, ALL CAPS, letter-spacing -0.02em
  - Body:     Inter Tight weight 500, line-height 1.4
  - Mono:     JetBrains Mono weight 500, ALL CAPS, letter-spacing 0.18em
              (used for eyebrows, status tags, breed labels)

SIGNATURE VISUAL ELEMENTS — at least 3 of these must appear:
  - Sticker shadow: `box-shadow: 0 12px 0 var(--primary);` (a flat color drop, NOT a soft blur)
  - Card tilts ±1.2° on photo cards and story tiles (NEVER on text-only blocks)
  - Pill shapes (border-radius: 999px) for tags, status badges, CTAs
  - Sparkle SVG (star burst), Squiggle SVG (wavy line), PawIcon SVG accent details
  - Procedural puppy SVG with hue + ear params (floppy=0, perky=1)

THE 7 SLIDES (slide order is locked — keep this structure even as you vary the visual treatment):

  1. HERO          - Stop the scroll. Puppy face photo dominant, name in display font, breed/sex/ready-by
                     eyebrow, "AVAILABLE NOW" pill. Logo in corner.
  2. MEET [NAME]   - Personality moment. Face photo (different crop), name, description blurb.
  3. ALL ANGLES    - 3-up grid of body shots (back, top-down, paw print). Tag chips identify each.
  4. PARENTS       - Mom on top half, Dad on bottom half. Each card has photo + name + breed.
                     "Health-tested parents" eyebrow.
  5. WHAT'S        - Icon checklist of what's included. NO photo. Soft-color background.
     INCLUDED
  6. RESERVE       - Ready date, pricing (or "DM for current pricing"), contact methods, location,
                     bold sticker-shadow CTA.
  7. CLOSING       - Logo prominent, "Why Dream Puppies" blurb. Footer: "A Dream Enterprises LLC
                     company".

VOICE RULES — non-negotiable, the family has approved these:
  - Locations are Florida and Raeford, North Carolina — NEVER "Charlotte".
  - Breeds we raise: Mini Goldendoodle, Labradoodle, Mini Poodle, Shih Tzu — only these four.
  - NEVER quote specific puppy counts ("3 of 5 boys" ✗  →  "Cooper is available now" ✓).
  - NEVER say "low-shed" or promise hypoallergenic.
  - NEVER say "Puppy Guide included with every puppy" — it's a free service for everyone.
  - The first-year promise is: "proactive guidance, especially during the formative years."
  - Footer chrome on slide 7 reads exactly: "A Dream Enterprises LLC company".
  - Voice is family-to-family, plain-spoken, warm. Not corporate. Not cute-for-cute's-sake.
    No "fur babies", no "doodles 'til I die", no fake urgency.

DATA THE TEMPLATE WILL RECEIVE IN PRODUCTION (use these placeholder values in your mockup):
  puppy.name              = "Cooper"
  puppy.breed             = "Mini Goldendoodle"
  puppy.gender            = "Male"
  puppy.description       = "Calmest of the bunch, with a white star on his chest. Loves to be held."
  puppy.readyDate         = "July 6, 2026"
  puppy.priceDisplay      = "DM for current pricing"   (string — sometimes price, sometimes that phrase)
  puppy.photos.face       = procedural SVG, apricot hue (28°), floppy ears
  puppy.photos.back       = procedural SVG, same hue
  puppy.photos.top        = procedural SVG, same hue
  puppy.photos.paw        = procedural SVG, same hue
  parents.dam.name        = "Daisy"
  parents.dam.breed       = "Mini Goldendoodle"
  parents.sire.name       = "Bruno"
  parents.sire.breed      = "Mini Goldendoodle"
  business.location       = "Orlando, FL · or Raeford, NC"
  business.contact        = "puppyheavenllc.com · @dreampuppies"
  business.whatsIncluded  = ["AKC paperwork", "Microchip", "Age-appropriate vaccines",
                             "Full vet check", "2-year health guarantee", "Starter food + blanket",
                             "7-day text-anytime onboarding", "Proactive guidance after"]
  business.breedingNote   = "In our home — never a kennel, never a barn. Proactive guidance during
                             the formative years, not just at pickup."

OUTPUT REQUIREMENTS:
  - One HTML file. No external CSS or JS files. No npm. No build step.
  - The 7 slides render side by side or wrapped, each at true 1080×1350 aspect, scaled via CSS
    transform so the whole carousel fits the browser window.
  - At the top of the page, a single H1 naming the template, then the carousel below.
  - Each slide labeled above with a small mono-font caption: "slide 1 · hero", etc.
  - If a slide degrades when data is missing (e.g. no paw photo, no parent records), describe in a
    comment at the bottom of the file how the slide would gracefully shrink or be skipped.

REFERENCES YOU CAN OPEN ALONGSIDE THIS PROMPT:
  - design_handoff_dream_puppies_b/brand.jsx         (token source of truth + SVG primitives)
  - design_handoff_dream_puppies_b/README.md         (voice rules + design system spec)
  - docs/breeder-tool/social-preview.html            (the existing "Lavender" template — your new
                                                      one should feel like a sibling, not a clone)
  - public/dream-puppies-logo.png                    (the logo — reference as `/dream-puppies-logo.png`)

DO NOT design a logo. DO NOT change the brand colors beyond the optional 1–2 supporting accents.
DO NOT use stock-photo-style placeholders for puppies — use procedural SVG only.

Make it feel like Dream Puppies. Family-warm, design-confident, a little playful, never tacky.
```

---

## After you get the template back

You'll have an HTML file. To turn it into a registered template in the codebase, hand it to Claude Code with:

> Read `docs/breeder-tool/SOCIAL_POSTS.md` (sections "Tech stack — rendering" and "File layout"), then convert `[path/to/the/new/template.html]` into a React template module at
> `src/features/social-posts/templates/[slug]/index.tsx`. Use the existing `Lavender` template
> at `src/features/social-posts/templates/lavender/` as the structural reference. Replace the
> mockup's static placeholder values with props from the `CarouselData` type. Register the new
> template in `src/features/social-posts/templates/index.ts`. Don't change the rendering pipeline.

The result: a new option appears in the template dropdown of the post-export modal. Carlos picks it from the dropdown, hits download, gets a 7-slide ZIP in the new style.

---

## Variant ideas worth queueing

| Name | Vibe | When to use |
|---|---|---|
| **Lavender** *(shipped)* | The signature look — paper + violet + bubblegum | Default for every-day announcements |
| **Lavender Dark** | Same palette, dark hero background, white text | Reveal posts, "just listed" energy |
| **Cream Editorial** | Magazine-style, more whitespace, serif accents on names | Premium-feel announcements, breed spotlights |
| **Sunshine** | Sun (`#FFD66B`) and leaf (`#86E6B7`) dominate, lighter mood | Spring/summer litters, energetic puppies |
| **Holiday** | Deep red + forest green over paper, subtle snowflake squiggle | Christmas-week posts only |
| **Litter Group** | Whole-litter format, one slide per pup, family-photo close | "Meet the [Parents]" litters at birth announcement |
| **Bilingual ES** | Spanish primary copy, English mono tags | When targeting Hispanic communities; reuse i18n strings |

Don't build them all up front. Ship Lavender, see what Carlos posts, build the next one when there's a real reason.
