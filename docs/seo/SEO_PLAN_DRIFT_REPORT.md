# SEO Implementation Plan — Drift Report

**Verified against:** `/Users/lebron/Documents/Dream Enterprises Puppy Heaven LLC/` on 2026-05-20
**Purpose:** Lock down inaccuracies so Haiku does not invent code or repeat already-done work.

---

## Severity legend

- **BLOCKER** — Haiku will produce broken code or compile errors if it follows the plan literally.
- **WRONG** — The plan's instruction is factually incorrect (work already done, file shape differs, etc.). Haiku will waste a turn or make things worse.
- **TIGHTEN** — Plan is directionally right but the patch text needs a precise edit before handing off.
- **OK** — Verified accurate; Haiku can follow as written.

---

## PHASE 0 — Postbuild & CI

### Task 0.1 — Add `VITE_SITE_URL` to Netlify — **OK**
Operator action. `src/lib/env.ts:39-41` confirms `appEnv.siteUrl` → `readEnv("VITE_SITE_URL")`. Adding the var to Netlify will unblock the postbuild.

### Task 0.2 — Add `VITE_SITE_URL` + verify step to CI — **OK**
Verified: `.github/workflows/ci.yml` does **not** currently set `VITE_SITE_URL` and does **not** call `npm run verify:seo:build`. The `verify:seo:build` script exists in `package.json:19` (`tsx scripts/verify-seo-build.ts`). Patch as written is correct.

### Task 0.3 — Add `Sitemap:` line to robots.txt — **WRONG / ALREADY DONE**
`scripts/postbuild-seo.tsx:143-160` already emits the Sitemap line:
```
Sitemap: ${siteUrl}/sitemap.xml
```
**Action for Haiku:** **Skip Task 0.3 entirely.** Do not edit `buildRobots()`. Just verify after deploy that `robots.txt` already contains the line (it will, as soon as Task 0.1 unblocks the postbuild).

### Drift note — function name
Plan says postbuild "calls `appEnv.siteUrl`." Actual code uses `requireSiteUrlForBuild()` (a helper that itself reads via `appEnv`). Doesn't affect the patch, but if Haiku tries to grep for `appEnv.siteUrl` in `postbuild-seo.tsx` it won't find it.

---

## PHASE 1 — Titles, descriptions, H1s

### `SeoRouteConfig` shape — **BLOCKER for every new entry**

Actual type (`src/lib/seo.ts:23-29`):
```ts
export type SeoRouteConfig = {
  pageId: SeoPageId;
  path: string;
  title: string;
  description: string;
  robots?: string;
};
```
**`imageUrl` is not a member.** Existing entries also include `pageId` and `path`. The plan's new-entry examples omit both required fields. Every new config object Haiku writes must include `pageId` and `path`, e.g.:
```ts
faq: {
  pageId: "faq",
  path: "/faq",
  title: "FAQ — Deposits, Pickup, Health & Care | Dream Puppies",
  description: "...",
  robots: "index,follow",
},
```

### `PUBLIC_SEO_ROUTES` is generated, not literal — **BLOCKER**

Plan says "add to `PUBLIC_SEO_ROUTES` array: `{ path: '/about', pageId: 'about' }`." That array does not exist as a literal. Actual code (`src/lib/seo.ts:104-114`):
```ts
export const PUBLIC_ROUTE_PAGE_IDS = ["home","puppies","consultation","essentials","contact","upcomingLitters","breeds"] as const satisfies readonly SeoPageId[];
export const PUBLIC_SEO_ROUTES = PUBLIC_ROUTE_PAGE_IDS.map((pageId) => SEO_ROUTE_CONFIG[pageId]);
```
**Correct instruction:** add the new page id (e.g. `"about"`) to `PUBLIC_ROUTE_PAGE_IDS`. `PUBLIC_SEO_ROUTES` derives automatically. The same applies to `dreamyReviews`, `trainingPlan`, `faq` if they are intended to be in the sitemap (the plan does not currently call this out — confirm intent with Carlos).

### Task 1.2 — New entries `dreamyReviews`, `trainingPlan`, `faq` — **TIGHTEN**
Verified missing from `SeoPageId` and `SEO_ROUTE_CONFIG`. Adding them is correct. Each entry must include `pageId` and `path` (see above).

### Task 1.3 — `<Seo>` calls on pages currently missing them — **TIGHTEN**

Verification of current state:
- `FaqPage.tsx:84-88` — calls `<Seo>` with **hardcoded** `title`/`description`/`canonicalPath`, no `pageId`. Replacing with `<Seo pageId="faq" />` is correct.
- `DreamyReviews.tsx:303-307` — same hardcoded pattern. Replacement is correct.
- `TrainingPlanPage.tsx:36` — same hardcoded pattern. Replacement is correct.

Note Haiku must remove the hardcoded props in the same edit, not leave both.

### Task 1.4 — Add `sr-only` H1s — **WRONG / MOSTLY ALREADY DONE**

Every public page already has a **visible** H1. Specifically:

| File | Existing H1 | Plan says |
|---|---|---|
| Contact.tsx:153 | `Contact Us` (visible) | "Add if missing: sr-only H1" — **already has visible H1, skip** |
| Essentials.tsx:306 | `Pet Essentials` (visible) | "Add if missing: sr-only H1" — **skip** |
| Consultation.tsx:419 | `Virtual Pet Consultation` (visible) | "Add if missing: sr-only H1" — **skip** |
| DreamyReviews.tsx:321 | visible H1 present | "Add if missing: sr-only H1" — **skip** |
| TrainingPlanPage.tsx:51 | visible H1 present | "Add if missing: sr-only H1" — **skip** |
| Index.tsx:77 | `Dream Puppies for Your Family` (visible) | "Already present — verify" — **OK** |
| Puppies.tsx:133 | present (visible) | "Already present — verify" — **OK** |
| Breeds.tsx:105 | `Compare Breeds` (visible) | "Already present — verify" — **OK** |
| UpcomingLitters.tsx:36 | `What is coming next.` | "Already present — verify" — **OK** |
| FaqPage.tsx:102 | present (visible) | "Already present — verify" — **OK** |

**Action for Haiku:** Task 1.4 collapses to "verify, do not add." If Haiku adds sr-only H1s on top of existing visible H1s, the pages will have two H1s.

---

## PHASE 2 — Schema markup

### Task 2.1 — LocalBusiness JSON-LD on home — **OK**
`Index.tsx` has no existing JSON-LD (verified via grep). The `useEffect` pattern matches `FaqPage.tsx:52-80`, which works. Patch is safe.

### Task 2.2 — BreadcrumbList on inner pages — **OK**
No conflicts. Same `useEffect` pattern.

### Task 2.3 — ItemList schema on Puppies — **OK on field names, TIGHTEN on variable**
Puppy row fields `primary_photo`, `photos`, `final_price`, `base_price`, `description`, `name`, `breed`, `id` are all confirmed in `src/lib/supabase.ts:223-255`. The `puppies` variable in `Puppies.tsx` comes from `useQuery({ queryFn: fetchAvailablePuppies })` — Haiku should depend the `useEffect` on `puppies` (which can be `undefined` while loading; the early-return guard in the plan handles that). The `description` field is nullable — keep the `?? \`${p.breed} puppy available in Orlando, FL\`` fallback as written.

### Task 2.4 — Per-puppy SEO already wired — **WRONG / ALREADY DONE**
`Puppies.tsx:99-119` already passes dynamic `title`/`description`/`canonicalPath`/`imageUrl` to `<Seo>` when a puppy detail is selected (URL-driven via `puppyIdFromUrl`). **Skip Task 2.4** — there is nothing to verify-then-add; just verify, do not edit.

---

## PHASE 3 — Local SEO

### Task 3.1 — Footer city keywords — **TIGHTEN** (structural)

Both footers exist and are different components:
- `src/components/home/GalacticHomeMiniFooter.tsx:53-65` — dark theme (`text-white/70`, `bg-black`), used on home/Contact context
- `src/components/layout/Footer.tsx:58-71` — light theme (`text-muted-foreground`)

Both currently render bare `Florida` and `North Carolina` rows with a `MapPin` icon and the heading `{t("footerServiceAreas")}`. The plan's replacement snippet uses:
- A raw English heading `"Service Areas"` — would **break i18n consistency**. Keep `{t("footerServiceAreas")}`, or add a new translation key for the longer string.
- `className="text-sm font-semibold uppercase tracking-wider mb-3"` — does not match either footer's existing class palette. Use the existing `font-semibold text-white` (dark) / `font-semibold text-foreground` (light) styling.
- `BUSINESS.phoneRaw` formatting: plan uses `tel:${BUSINESS.phoneRaw}`. `phoneRaw` is `"3216978864"` (verified, `business.ts:13`), so `tel:3216978864` works; alternatively `tel:+1${BUSINESS.phoneRaw}` is more correct internationally.

**Action for Haiku:** preserve the `{t("footerServiceAreas")}` heading; add city lines (`Orlando, FL · Kissimmee · Sanford` / `Raeford, NC · Fayetteville`) inside the existing column layout in both footers. Match existing class palette per footer.

### Task 3.2 — Contact page NAP — **TIGHTEN**
Contact.tsx already has a visible `<h1>Contact Us</h1>` at line 153. The plan's NAP block also includes an `<h1>Contact Dream Puppies</h1>`. **Two H1s on one page is bad SEO.** Either:
- Drop the H1 from the NAP block and just add an `<h2>` heading, or
- Replace the existing `Contact Us` H1 with `Contact Dream Puppies` (better — has the brand name).

Choose the second; tell Haiku explicitly.

### Task 3.3 — `indexHeroDescription` — **OK** (key exists)
Verified at `translations.ts:40-41`. Plan's rewrite is safe; remember to update **all three** locales (`en`, `es`, `pt`) or leave `es`/`pt` untouched explicitly. Translations file shape is `{ en, es, pt }` per key.

### Task 3.4 — `breedsIntroDescription` — **BLOCKER: KEY DOES NOT EXIST**
Verified missing. Haiku must **add** a new key (not edit). All three locales required. If Haiku doesn't supply `es`/`pt` versions, the translation lookup will fall through to `en` (acceptable) but tests may fail. Add at least placeholder Spanish/Portuguese strings.

### Task 3.5 — `upcomingLittersDescription` — **BLOCKER: KEY DOES NOT EXIST**
Same as 3.4. Add to all three locales.

---

## PHASE 4 — About page

### Task 4.1 — Create `src/pages/About.tsx` — **OK** (file absent, verified)

### Task 4.2 — Register `/about` in App.tsx — **OK**
Insertion point is between `/breeds` (line 102) and `/deposit`. Add the import.

### Task 4.3 — Add `'about'` to seo.ts — **BLOCKER** (see Phase 1 above)
Must:
1. Extend `SeoPageId` union with `"about"`.
2. Add the `about` entry to `SEO_ROUTE_CONFIG` **with `pageId` and `path` fields** included.
3. Add `"about"` to `PUBLIC_ROUTE_PAGE_IDS` (not `PUBLIC_SEO_ROUTES`).

### Task 4.4 — Add About to nav — **BLOCKER**
Plan says: `{ label: 'About', href: '/about' }`. Actual nav array shape (`GalacticHomeNav.tsx:27-36`):
```ts
const galacticNavLinks: { to: string; label: TranslationKey; end?: boolean }[] = [
  { to: "/", label: "navHome", end: true },
  { to: "/puppies", label: "navShortAvailable" },
  ...
];
```
- Field is `to`, not `href`.
- Field is `label: TranslationKey`, not raw string. Haiku must add a `navAbout` translation key (all three locales) and reference it.

Patch must be:
```ts
{ to: "/about", label: "navAbout" },
```
plus a `navAbout` entry in `translations.ts`.

### Task 4.5 — Sitemap auto-update — **OK** (derives from `PUBLIC_ROUTE_PAGE_IDS`)

---

## PHASE 5 — Content depth

### Task 5.1 — Breed descriptions on Breeds page — **OK** (with caveats)
`BREEDS_DATA` in `src/data/breeds-content.ts` has additional fields beyond what the plan uses (`category`, `height`, `stats`, `care`, `imageUrl`, `color`, `borderColor`, `accentColor`, `parityCard`). All fields the plan references (`shortDesc`, `temperament`, `history`, `coolFact`, `idealFor`, `size`, `weight`, `lifespan`, `hypoallergenic`) exist. The patch is safe; extra fields are simply unused in the new section.

### Task 5.2–5.5 — Static intros — **OK** (additive markup, no breaking changes)

---

## PHASE 6 — OG image & brand consistency

### Task 6.1 — Add `imageUrl` to `SEO_ROUTE_CONFIG.home` — **BLOCKER**
The `SeoRouteConfig` type does **not** allow `imageUrl`. Adding it will cause a TypeScript error. Two options:
- **Recommended:** add `imageUrl?: string` to `SeoRouteConfig`, then teach `resolveSeoMetadata()` (`src/lib/seo.ts`) to fall back to the config's `imageUrl` when the prop is absent. Currently (line 238) only the prop is read: `socialImage: imageUrl ?? resolveSocialImageUrl(env)`.
- **Quick alternative:** skip the route-config change and pass `imageUrl` as a prop on the home page's `<Seo>` call: `<Seo pageId="home" imageUrl="https://puppyheavenllc.com/dream-puppies-og.png" />`.

Pick one and instruct Haiku explicitly. **Do not let Haiku add an unknown property to a typed config.**

### Task 6.2 — Add `og:image` / `twitter:image` to `index.html` — **OK**
Verified absent. Patch is safe.

### Task 6.3 — Footer legal line — **TIGHTEN**
Plan's literal `© {year} Dream Enterprises LLC — Dream Puppies | puppyheavenllc.com` ignores the existing `BUSINESS.footerLine` constant (`business.ts:17`: `"Dream Enterprises LLC — DBA Dream Puppies / Puppy Heaven · Florida"`). Either:
- Use `BUSINESS.footerLine` as-is (preserves existing source-of-truth), or
- Update `BUSINESS.footerLine` in `business.ts` to the new string and let it propagate.

Tell Haiku which.

---

## PHASE 7 — Operator actions — **OK** (no code)

---

## PHASE 8 — CI & monitoring

### Task 8.1 — CI verify step — **OK** (combined with 0.2)

### Task 8.2 — Add coverage checks to `verify-seo-build.ts` — **TIGHTEN / PARTIALLY DONE**
The script already checks:
- `<title>` tag presence per route ✓
- description meta tag ✓
- canonical link tag ✓
- `og:title` ✓
- `twitter:description` ✓
- sitemap.xml contains route paths ✓
- robots.txt contains `Sitemap:` ✓

**Missing from the script:** the H1 presence check the plan asks for. Adding "at least one `<h1>` per generated HTML file" is the only new check.

---

## Summary table — what changes for Haiku

| Plan task | Action |
|---|---|
| 0.1 | OK |
| 0.2 | OK |
| **0.3** | **SKIP — already done** |
| 1.1 / 1.2 | OK, but every new `SEO_ROUTE_CONFIG` entry must include `pageId` and `path` (BLOCKER if forgotten) |
| 1.3 | OK — also delete the old hardcoded props |
| **1.4** | **SKIP all "Add sr-only H1" rows — visible H1s already exist on every page listed** |
| 2.1, 2.2, 2.3 | OK |
| **2.4** | **SKIP — per-puppy SEO is already wired in Puppies.tsx:99-119** |
| 3.1 | TIGHTEN — preserve `{t("footerServiceAreas")}` heading; match existing class palette per footer |
| 3.2 | TIGHTEN — Contact.tsx already has visible H1; replace it instead of adding a second |
| 3.3 | OK |
| **3.4, 3.5** | **Add NEW keys** `breedsIntroDescription` and `upcomingLittersDescription` to translations.ts (en/es/pt) — they don't exist yet |
| 4.1, 4.2 | OK |
| **4.3** | Add `"about"` to `PUBLIC_ROUTE_PAGE_IDS`, not `PUBLIC_SEO_ROUTES`. Include `pageId` + `path` in the config entry. |
| **4.4** | Nav shape is `{ to, label: TranslationKey }`, not `{ label, href }`. Add a `navAbout` translation key. |
| 5.1–5.5 | OK |
| **6.1** | Either extend `SeoRouteConfig` to include `imageUrl?: string` AND update `resolveSeoMetadata`, or pass `imageUrl` as a prop on the home `<Seo>` call. Picking is required. |
| 6.2 | OK |
| 6.3 | TIGHTEN — reconcile with `BUSINESS.footerLine` (already exists) |
| 7.x | OK |
| 8.1 | OK |
| **8.2** | Most checks already in `verify-seo-build.ts`. Only the H1-presence check is new. |

---

## Bottom line for Haiku

Three things to drop entirely (Tasks 0.3, 1.4 across all pages, 2.4).
Two blockers to fix in the plan before execution (`PUBLIC_SEO_ROUTES` vs `PUBLIC_ROUTE_PAGE_IDS`; nav shape `{to, label}` not `{href, label}`).
Two type-safety landmines (every new `SEO_ROUTE_CONFIG` entry needs `pageId` + `path`; `imageUrl` is not currently a route-config field).
Two translation keys don't exist and need to be added, not edited (`breedsIntroDescription`, `upcomingLittersDescription`).
One duplicate H1 risk on Contact (replace, don't add).

Everything else is directionally correct.
