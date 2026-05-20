# Dream Puppies — SEO Remediation Implementation Plan
**Prepared:** May 20, 2026  
**Audited site:** https://puppyheavenllc.com  
**Overall audit score:** ~20/100 → Target: 70+/100  

---

## EXECUTIVE SUMMARY

The site has solid bones: Netlify CDN, a working `postbuild-seo.tsx` SSR script, a centralized `BUSINESS` constants object, and rich breed-content data. **The entire crawlability failure has a single root cause:** the `VITE_SITE_URL` environment variable is absent from the Netlify build, causing `postbuild-seo.tsx` to exit early and skip generating static HTML for every route. Fix that one env var and ~60% of the SEO problem is solved instantly.

The remaining work layers in: better titles/descriptions, `LocalBusiness` schema, static content blocks on each page, an About page, city-level keywords in the footer, and a Google Business Profile.

Phases are ordered by ROI. **Do Phase 0 first — everything else is wasted effort without it.**

---

## HOW TO USE THIS PLAN (HAIKU MODE)

Each task includes:
- **Exact file path** to edit or create
- **Exact code** to add/change (copy-paste ready)
- **Why** the change matters
- **Verification** so you know when it's done

Do tasks in phase order. Within a phase, tasks are independent unless noted.

---

## PHASE 0 — UNBLOCK THE SSR POSTBUILD (30 minutes, operator action + 1 code change)

**Root cause:** `scripts/postbuild-seo.tsx` calls `appEnv.siteUrl` (reads `VITE_SITE_URL`). When absent, the script exits without generating per-route HTML files, sitemap.xml, or a complete robots.txt. Google crawls every route and gets an empty SPA shell.

### Task 0.1 — Add VITE_SITE_URL to Netlify build environment

**Operator action (no code required):**
1. Log in to Netlify → Site Settings → Environment Variables
2. Add: `VITE_SITE_URL` = `https://puppyheavenllc.com`
3. Trigger a new deploy

**Verification:** After deploy, check:
- `https://puppyheavenllc.com/puppies/index.html` returns a full HTML document (not just `<div id="root"></div>`)
- `https://puppyheavenllc.com/sitemap.xml` returns XML listing all public routes
- `https://puppyheavenllc.com/robots.txt` includes `Sitemap: https://puppyheavenllc.com/sitemap.xml`

### Task 0.2 — Add VITE_SITE_URL to the SEO build verification CI step

**File:** `.github/workflows/ci.yml`

Find the build job and add an env var and verification step. The `verify:seo:build` script already exists in package.json but is never called in CI.

Add after the build step:
```yaml
      - name: Verify SEO build output
        env:
          VITE_SITE_URL: https://puppyheavenllc.com
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: npm run verify:seo:build
```

Also ensure the build step itself has `VITE_SITE_URL` in its env block.

**Why:** Prevents regression — if the env var disappears from Netlify again, CI will fail loudly.

### Task 0.3 — Add Sitemap reference to robots.txt template

**File:** `scripts/postbuild-seo.tsx`

Search for where `robots.txt` content is generated. Add the Sitemap line:

Find the robots.txt generation block (look for `User-agent:` string) and ensure it outputs:
```
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

Sitemap: https://puppyheavenllc.com/sitemap.xml
```

The `VITE_SITE_URL` value should be substituted dynamically:
```ts
const sitemapUrl = `${siteUrl}/sitemap.xml`;
// append to robots content:
robotsContent += `\nSitemap: ${sitemapUrl}\n`;
```

**Why:** Google won't discover the sitemap without this line.

---

## PHASE 1 — TITLE, DESCRIPTION & H1 FIXES (2–3 hours)

These are changes to `src/lib/seo.ts` and individual page components. All changes are isolated and non-breaking.

### Task 1.1 — Rewrite home page title and meta description

**File:** `src/lib/seo.ts`

Find `SEO_ROUTE_CONFIG.home` and update:

```ts
home: {
  title: 'Family-Raised Puppies for Sale in Orlando, FL | Dream Puppies',
  description:
    'Family-raised puppies for sale in Orlando, FL and Raeford, NC. French Bulldogs, Goldendoodles, Mini Goldendoodles, Shih Tzus, and more. Reserve yours today — call (321) 697-8864.',
  robots: 'index,follow',
},
```

**Why:** Current title "Dream Puppies" contains no location or keyword. Google needs "puppies for sale Orlando FL" as a signal.

### Task 1.2 — Rewrite all public page titles with location context

**File:** `src/lib/seo.ts`

Update each entry in `SEO_ROUTE_CONFIG`:

```ts
puppies: {
  title: 'Available Puppies for Sale in Florida | Dream Puppies',
  description:
    'Browse available puppies from Dream Puppies — Goldendoodles, French Bulldogs, Shih Tzus, and more. Family-raised in Orlando, FL. Photos, prices, and pickup info included.',
  robots: 'index,follow',
},
consultation: {
  title: 'Virtual Puppy Consultation | Dream Puppies Orlando, FL',
  description:
    'Book a free virtual consultation with Dream Puppies. We help Florida and North Carolina families find the perfect breed for their home and lifestyle.',
  robots: 'index,follow',
},
essentials: {
  title: 'Puppy Starter Kits & Essentials | Dream Puppies',
  description:
    'Shop puppy starter kits and essentials recommended by Dream Puppies. Everything your new family member needs from day one.',
  robots: 'index,follow',
},
contact: {
  title: 'Contact Dream Puppies | Orlando, FL (321) 697-8864',
  description:
    'Contact Dream Puppies in Orlando, FL or Raeford, NC. Call or text (321) 697-8864, email Dreampuppies22@gmail.com, or fill out our inquiry form.',
  robots: 'index,follow',
},
upcomingLitters: {
  title: 'Upcoming Puppy Litters in Florida | Dream Puppies',
  description:
    'See upcoming Goldendoodle, Labradoodle, and French Bulldog litters from Dream Puppies in Orlando, FL. Reserve your spot before the litter arrives.',
  robots: 'index,follow',
},
breeds: {
  title: 'Dog Breeds We Raise | Dream Puppies Orlando, FL',
  description:
    'Explore the breeds raised by Dream Puppies: Mini Goldendoodles, French Bulldogs, Shih Tzus, Toy Poodles, and more. Compare temperament, size, and care needs.',
  robots: 'index,follow',
},
```

Also add new entries for pages currently missing from `SEO_ROUTE_CONFIG`. Add these to the `SeoPageId` union type AND to `SEO_ROUTE_CONFIG`:

```ts
// Add to SeoPageId union:
| 'dreamyReviews'
| 'trainingPlan'
| 'faq'

// Add to SEO_ROUTE_CONFIG:
dreamyReviews: {
  title: 'Customer Reviews | Dream Puppies Orlando, FL',
  description:
    'Read reviews from Dream Puppies families. Real stories from happy puppy owners in Florida and North Carolina.',
  robots: 'index,follow',
},
trainingPlan: {
  title: 'Free Puppy Training Plan | Dream Puppies',
  description:
    'Get a free customized puppy training plan from Dream Puppies. Address common puppy problems with step-by-step guidance.',
  robots: 'index,follow',
},
faq: {
  title: 'FAQ — Deposits, Pickup, Health & Care | Dream Puppies',
  description:
    'Frequently asked questions about Dream Puppies: deposits, pricing, pickup process, health guarantees, vaccinations, and puppy care.',
  robots: 'index,follow',
},
```

**Why:** Every public route needs a keyword-rich, location-specific title and description. Currently most pages have generic titles.

### Task 1.3 — Add `<Seo>` calls to pages missing them

**File:** `src/pages/DreamyReviews.tsx`
Find the return statement. If `<Seo>` is missing, add as the first child:
```tsx
<Seo pageId="dreamyReviews" />
```

**File:** `src/pages/TrainingPlanPage.tsx`
Same pattern:
```tsx
<Seo pageId="trainingPlan" />
```

**File:** `src/pages/FaqPage.tsx`
The FAQ page uses a manual `<Seo>` call with hardcoded strings. Replace it with:
```tsx
<Seo pageId="faq" />
```
(This makes it consistent and picks up the config above.)

### Task 1.4 — Verify H1 tags exist on every public page

Check each of these files for an `<h1>` tag. If absent, add one inside the hero/top section:

| File | Expected H1 content |
|------|---------------------|
| `src/pages/Index.tsx` | Already present (dynamic from i18n) — verify it renders |
| `src/pages/Puppies.tsx` | Already present — verify |
| `src/pages/Breeds.tsx` | Already present — verify |
| `src/pages/UpcomingLitters.tsx` | Already present ("What is coming next.") — verify |
| `src/pages/FaqPage.tsx` | Already present ("Frequently Asked Questions") — verify |
| `src/pages/Contact.tsx` | Add if missing: `<h1 className="sr-only">Contact Dream Puppies</h1>` |
| `src/pages/Essentials.tsx` | Add if missing: `<h1 className="sr-only">Puppy Essentials & Starter Kits</h1>` |
| `src/pages/Consultation.tsx` | Add if missing: `<h1 className="sr-only">Virtual Puppy Consultation</h1>` |
| `src/pages/DreamyReviews.tsx` | Add if missing: `<h1 className="sr-only">Dream Puppies Reviews</h1>` |
| `src/pages/TrainingPlanPage.tsx` | Add if missing: `<h1 className="sr-only">Free Puppy Training Plan</h1>` |

**Note:** `sr-only` is a Tailwind class that hides the element visually but keeps it accessible to screen readers and search engines. Use it only when a visible H1 would break the design.

**Why:** H1 is one of the most basic on-page SEO signals. All pages currently appear to be missing crawlable H1 text.

---

## PHASE 2 — SCHEMA MARKUP / STRUCTURED DATA (2–3 hours)

All schema is injected via `<script type="application/ld+json">` in `useEffect`. The FAQ page already does this correctly — copy the same pattern.

### Task 2.1 — Add LocalBusiness + Organization schema to the home page

**File:** `src/pages/Index.tsx`

Add a `useEffect` that injects JSON-LD into `<head>`. Place it alongside the existing `<Seo pageId="home" />` component:

```tsx
useEffect(() => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'PetStore'],
    name: 'Dream Puppies',
    legalName: 'Dream Enterprises LLC',
    url: 'https://puppyheavenllc.com',
    logo: 'https://puppyheavenllc.com/dream-puppies-logo.png',
    image: 'https://puppyheavenllc.com/dream-puppies-logo.png',
    description:
      'Family-raised puppies for sale in Orlando, FL and Raeford, NC. Goldendoodles, French Bulldogs, Shih Tzus, Mini Goldendoodles, and more.',
    telephone: '+13216978864',
    email: 'Dreampuppies22@gmail.com',
    address: [
      {
        '@type': 'PostalAddress',
        addressLocality: 'Orlando',
        addressRegion: 'FL',
        addressCountry: 'US',
      },
      {
        '@type': 'PostalAddress',
        addressLocality: 'Raeford',
        addressRegion: 'NC',
        addressCountry: 'US',
      },
    ],
    areaServed: [
      { '@type': 'City', name: 'Orlando', containedInPlace: { '@type': 'State', name: 'Florida' } },
      { '@type': 'City', name: 'Kissimmee', containedInPlace: { '@type': 'State', name: 'Florida' } },
      { '@type': 'City', name: 'Sanford', containedInPlace: { '@type': 'State', name: 'Florida' } },
      { '@type': 'City', name: 'Raeford', containedInPlace: { '@type': 'State', name: 'North Carolina' } },
      { '@type': 'City', name: 'Fayetteville', containedInPlace: { '@type': 'State', name: 'North Carolina' } },
    ],
    sameAs: [],
    priceRange: '$$',
    openingHours: 'Mo-Su 09:00-20:00',
    hasMap: 'https://maps.google.com/?q=Orlando,FL',
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'local-business-jsonld';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
  return () => { document.getElementById('local-business-jsonld')?.remove(); };
}, []);
```

**Why:** `LocalBusiness` schema tells Google the physical business details. Without it, the site gets zero Knowledge Panel consideration. This is the highest-value schema for a local service business.

### Task 2.2 — Add BreadcrumbList schema to inner pages

**File:** `src/pages/Puppies.tsx`

Add breadcrumb schema:
```tsx
useEffect(() => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://puppyheavenllc.com' },
      { '@type': 'ListItem', position: 2, name: 'Available Puppies', item: 'https://puppyheavenllc.com/puppies' },
    ],
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'breadcrumb-jsonld';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
  return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
}, []);
```

Apply the same pattern to `/breeds`, `/contact`, `/upcoming-litters`, `/consultation`, `/essentials`, adjusting position 2 for each page.

### Task 2.3 — Add ItemList schema to the Puppies page for available puppies

**File:** `src/pages/Puppies.tsx`

After puppies are loaded from the API, add a dynamic schema:
```tsx
useEffect(() => {
  if (!puppies || puppies.length === 0) return;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Available Puppies',
    description: 'Puppies currently available for adoption from Dream Puppies in Orlando, FL',
    itemListElement: puppies.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: `${p.name} — ${p.breed}`,
        description: p.description ?? `${p.breed} puppy available in Orlando, FL`,
        image: p.primary_photo ?? p.photos?.[0],
        offers: {
          '@type': 'Offer',
          price: p.final_price ?? p.base_price,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: 'Dream Puppies' },
        },
      },
    })),
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'puppies-list-jsonld';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
  return () => { document.getElementById('puppies-list-jsonld')?.remove(); };
}, [puppies]);
```

**Why:** Product schema for individual puppies can trigger rich result cards in Google Search.

### Task 2.4 — Add individual puppy page SEO entries

**File:** `src/lib/seo.ts`

The `/puppies/:id` route exists but has no SEO config entry. The `Seo` component in Puppies.tsx already handles dynamic title/description via props — verify this code path is working:

```tsx
// In Puppies.tsx, the Seo call should already do something like:
<Seo
  pageId="puppies"
  title={selectedPuppy ? `${selectedPuppy.name} — ${selectedPuppy.breed} | Dream Puppies` : undefined}
  description={selectedPuppy ? `${selectedPuppy.breed} puppy for sale in Orlando, FL. ${selectedPuppy.description ?? ''}` : undefined}
  canonicalPath={selectedPuppy ? `/puppies/${selectedPuppy.id}` : '/puppies'}
  imageUrl={selectedPuppy?.primary_photo ?? selectedPuppy?.photos?.[0]}
/>
```

Confirm this is wired up and that the `postbuild-seo.tsx` script generates a static HTML entry for the generic `/puppies` route (individual IDs can't be pre-rendered without a full SSG setup, which is out of scope here).

---

## PHASE 3 — LOCAL SEO SIGNALS (2–3 hours)

### Task 3.1 — Add city-level keywords to the footer

**File:** `src/components/home/GalacticHomeMiniFooter.tsx`  
**Also update:** `src/components/layout/Footer.tsx` (same changes, both files)

Find the "Service Areas" column (currently just "Florida" and "North Carolina"). Replace with city-level markup:

```tsx
{/* Service Areas column */}
<div>
  <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Service Areas</h3>
  <address className="not-italic text-sm space-y-1">
    <p>
      <MapPin className="inline w-3 h-3 mr-1" aria-hidden="true" />
      Orlando, FL · Kissimmee · Sanford
    </p>
    <p>
      <MapPin className="inline w-3 h-3 mr-1" aria-hidden="true" />
      Raeford, NC · Fayetteville
    </p>
    <p className="mt-2 font-medium">
      <a href={`tel:${BUSINESS.phoneRaw}`} className="hover:underline">
        {BUSINESS.phone}
      </a>
    </p>
    <p>
      <a href={`mailto:${BUSINESS.email}`} className="hover:underline">
        {BUSINESS.email}
      </a>
    </p>
    <p className="text-xs mt-2">{BUSINESS.legalName}</p>
  </address>
</div>
```

**Why:** The footer is rendered on every page. City-level keywords ("Orlando FL", "Kissimmee", "Sanford") here give Google strong local relevance signals even before body content changes are made.

### Task 3.2 — Add NAP (Name, Address, Phone) block to the Contact page

**File:** `src/pages/Contact.tsx`

Add a visible, crawlable NAP block at the top of the page content area (before or after the form):

```tsx
<section aria-label="Contact information" className="mb-8">
  <h1 className="text-2xl font-bold mb-2">Contact Dream Puppies</h1>
  <address className="not-italic text-base space-y-1">
    <p><strong>Dream Puppies</strong> (Dream Enterprises LLC)</p>
    <p>
      <a href="tel:+13216978864">(321) 697-8864</a> — call or text
    </p>
    <p>
      <a href="mailto:Dreampuppies22@gmail.com">Dreampuppies22@gmail.com</a>
    </p>
    <p>Serving Orlando, FL · Kissimmee, FL · Sanford, FL</p>
    <p>and Raeford, NC · Fayetteville, NC</p>
  </address>
</section>
```

**Why:** Google's local ranking algorithm looks for consistent NAP across the web. Having it in `<address>` HTML gives explicit semantic meaning.

### Task 3.3 — Add location keywords to the home page static intro paragraph

**File:** `src/i18n/translations.ts`

Find the key `indexHeroDescription` (the paragraph under the H1 on the home page). Update the English (`en`) value to include city and breed keywords:

```ts
indexHeroDescription: {
  en: 'Family-raised Goldendoodles, Mini Goldendoodles, French Bulldogs, and Shih Tzus in Orlando, FL and Raeford, NC. Every puppy is home-raised with love, health-checked, vaccinated, and ready to join your family.',
  es: '...', // keep existing Spanish
  pt: '...', // keep existing Portuguese
},
```

**Why:** The existing description text is vague. Adding "Orlando, FL", breed names, and "home-raised" signals improves both keyword relevance and E-E-A-T.

### Task 3.4 — Add location and breed keywords to breeds page intro

**File:** `src/i18n/translations.ts`

Find the keys for `breedsHeroTitleLine1`, `breedsHeroTitleLine2`, and the breeds intro paragraph. Add or update:

```ts
breedsIntroDescription: {
  en: 'We raise Goldendoodles, Mini Goldendoodles, Labradoodles, French Bulldogs, Shih Tzus, and Toy Poodles at our family-operated home in Orlando, Florida. Compare breeds by temperament, size, and grooming needs to find your perfect match.',
  es: '...',
  pt: '...',
},
```

Then in `src/pages/Breeds.tsx`, render this paragraph below the H1:
```tsx
<p className="mt-4 text-base max-w-2xl">
  {t('breedsIntroDescription')}
</p>
```

**Why:** The breeds page currently has ~60 words of static text. This doubles it and adds breed-specific keywords that rank for "[breed] puppies Florida" searches.

### Task 3.5 — Update upcoming litters page with location context

**File:** `src/i18n/translations.ts`

Find the key for the upcoming litters hero paragraph and add location:

```ts
upcomingLittersDescription: {
  en: 'Reserve your spot in an upcoming Goldendoodle, Labradoodle, or French Bulldog litter from Dream Puppies in Orlando, FL. Limited spots available — deposits are $300 and fully applied to your purchase price.',
  es: '...',
  pt: '...',
},
```

Render it in `src/pages/UpcomingLitters.tsx` below the existing H1.

---

## PHASE 4 — E-E-A-T: BUILD THE ABOUT PAGE (3–4 hours)

### Task 4.1 — Create the About page component

**Create new file:** `src/pages/About.tsx`

```tsx
import { Seo } from '@/components/seo/Seo';
import { BUSINESS } from '@/lib/constants/business';

export default function About() {
  return (
    <>
      <Seo
        pageId="about"
        title="About Dream Puppies | Family Breeder in Orlando, FL"
        description="Dream Puppies is a family-operated puppy breeder in Orlando, FL. Learn about our story, our commitment to health-tested, home-raised puppies, and why families across Florida and North Carolina trust us."
        canonicalPath="/about"
      />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">About Dream Puppies</h1>

        <p className="text-lg mb-6">
          Dream Puppies is a small, family-operated breeder based in Orlando, Florida, with
          a second location in Raeford, North Carolina. We specialize in raising
          Goldendoodles, Mini Goldendoodles, French Bulldogs, Shih Tzus, and Toy Poodles
          in a home environment — not a kennel.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">Our Story</h2>
        <p className="mb-4">
          {/* Owner: fill in your personal story here */}
          Every puppy at Dream Puppies is born and raised in our home. We believe the
          first weeks of a puppy's life set the foundation for their temperament and health
          for years to come. That's why we keep our litters small, socialize every puppy
          with children and adults, and never ship puppies unsupervised.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">Health & Care</h2>
        <p className="mb-4">
          Every puppy leaves with up-to-date vaccinations, a health certificate from a
          licensed veterinarian, and microchipping. We provide a health guarantee and are
          available to answer questions long after pickup day.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">Service Areas</h2>
        <p className="mb-4">
          We serve families in Orlando, Kissimmee, Sanford, and surrounding Central Florida
          communities, as well as Raeford, Fayetteville, and the greater Fayetteville, NC
          area. Out-of-area families can arrange supervised transport.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">Contact Us</h2>
        <address className="not-italic">
          <p><strong>{BUSINESS.legalName} — {BUSINESS.primaryBrand}</strong></p>
          <p>Phone / Text: <a href={`tel:${BUSINESS.phoneRaw}`}>{BUSINESS.phone}</a></p>
          <p>Email: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
          <p>Orlando, FL · Raeford, NC</p>
        </address>
      </main>
    </>
  );
}
```

### Task 4.2 — Register the About route in App.tsx

**File:** `src/App.tsx`

Find the public routes section. Add the About route alongside `/contact`, `/breeds`, etc.:

```tsx
import About from './pages/About';

// In the routes JSX:
<Route path="/about" element={<About />} />
```

### Task 4.3 — Add About to the SEO route config and public routes list

**File:** `src/lib/seo.ts`

Add `'about'` to the `SeoPageId` union and `PUBLIC_SEO_ROUTES` array:

```ts
// Add to SeoPageId:
| 'about'

// Add to SEO_ROUTE_CONFIG:
about: {
  title: 'About Dream Puppies | Family Breeder in Orlando, FL',
  description:
    'Dream Puppies is a family-operated puppy breeder in Orlando, FL. Home-raised Goldendoodles, French Bulldogs, Shih Tzus, and more. Health-checked, vaccinated, and loved from birth.',
  robots: 'index,follow',
},

// Add to PUBLIC_SEO_ROUTES array:
{ path: '/about', pageId: 'about' },
```

**Why:** The postbuild script iterates `PUBLIC_SEO_ROUTES` to generate static HTML. Adding `/about` here gives it its own `dist/about/index.html`.

### Task 4.4 — Add About link to the navigation

**File:** `src/components/home/GalacticHomeNav.tsx`

Find the nav links array (likely contains "Home", "Available", "Upcoming", "Breeds", etc.). Add:

```tsx
{ label: 'About', href: '/about' },
```

Place it before or after "Contact" in the list.

### Task 4.5 — Add About link to the sitemap

The `postbuild-seo.tsx` script generates `sitemap.xml` from `PUBLIC_SEO_ROUTES`. By adding `/about` in Task 4.3, the sitemap is automatically updated.

Verify after next deploy: `https://puppyheavenllc.com/sitemap.xml` includes `<loc>https://puppyheavenllc.com/about</loc>`.

---

## PHASE 5 — CONTENT DEPTH (4–6 hours)

### Task 5.1 — Add static breed description blocks to the Breeds page

**File:** `src/pages/Breeds.tsx`  
**Data source:** `src/data/breeds-content.ts` (the `BREEDS_DATA` array already has `shortDesc`, `temperament`, `history`, `coolFact` fields)

Below the existing breed cards grid, add a static SEO content section that renders all breed descriptions as crawlable HTML. This section can be visually subtle (small text, muted colors) but must be in the DOM:

```tsx
{/* Static SEO content — crawlable breed descriptions */}
<section aria-label="About our breeds" className="mt-16 border-t pt-8">
  <h2 className="text-2xl font-semibold mb-6">About the Breeds We Raise</h2>
  <div className="grid gap-8 md:grid-cols-2">
    {BREEDS_DATA.map((breed) => (
      <article key={breed.id}>
        <h3 className="text-lg font-semibold">{breed.name}</h3>
        <p className="text-sm mt-1">{breed.shortDesc}</p>
        <p className="text-sm mt-2 text-muted-foreground">
          <strong>Temperament:</strong> {breed.temperament}
        </p>
        <p className="text-sm mt-1 text-muted-foreground">
          <strong>History:</strong> {breed.history}
        </p>
        <p className="text-sm mt-1 text-muted-foreground">
          <strong>Fun fact:</strong> {breed.coolFact}
        </p>
        <p className="text-sm mt-1">
          <strong>Ideal for:</strong> {breed.idealFor.join(', ')}
        </p>
        <p className="text-xs mt-2 text-muted-foreground">
          Size: {breed.size} · Weight: {breed.weight} · Lifespan: {breed.lifespan} ·
          {breed.hypoallergenic ? ' Hypoallergenic' : ' Not hypoallergenic'}
        </p>
      </article>
    ))}
  </div>
</section>
```

**Why:** `BREEDS_DATA` already contains 200–400 words per breed — this unlocks that content for Google at zero content-writing cost. This alone adds ~2,000 words of breed-specific, SEO-relevant content.

### Task 5.2 — Add static intro content to the Puppies page

**File:** `src/pages/Puppies.tsx`

Above the dynamic puppy grid, add a short static paragraph:

```tsx
<section className="max-w-2xl mb-8">
  <p className="text-base">
    Browse puppies currently available from Dream Puppies in Orlando, FL and Raeford, NC.
    All puppies are home-raised, health-checked, vaccinated, and come with a health guarantee.
    Reserve with a $300 deposit — applied in full to your purchase price.
    Questions? Call or text <a href="tel:+13216978864">(321) 697-8864</a>.
  </p>
</section>
```

**Why:** The page currently has ~40 words of crawlable text. This brings it to ~90 words with key signals: location, breed process, deposit info, and phone.

### Task 5.3 — Add static intro to Upcoming Litters page

**File:** `src/pages/UpcomingLitters.tsx`

After the H1, add:
```tsx
<p className="mt-4 max-w-xl text-base">
  Upcoming litters from Dream Puppies — Orlando, FL and Raeford, NC.
  Reserve your spot with a $300 deposit before the litter arrives.
  We raise Goldendoodles, Mini Goldendoodles, French Bulldogs, and Labradoodles.
  Limited spots per litter. Text us at <a href="sms:+13216978864">(321) 697-8864</a> to ask about availability.
</p>
```

### Task 5.4 — Add static content blocks to Contact page

**File:** `src/pages/Contact.tsx`

Below the NAP section from Phase 3 (Task 3.2), add:

```tsx
<section className="mt-6 mb-8 max-w-xl">
  <h2 className="text-xl font-semibold mb-2">How We Help</h2>
  <p className="text-base">
    Whether you're looking for a specific breed, want to join the waitlist for an upcoming
    litter, or just have general questions about puppy care, we're happy to help. We respond
    to most inquiries within a few hours. You can also text us at (321) 697-8864 for a faster
    reply.
  </p>
  <p className="mt-3 text-base">
    We serve families in Orlando, Kissimmee, Sanford, and the greater Central Florida area,
    as well as Raeford and Fayetteville, North Carolina.
  </p>
</section>
```

### Task 5.5 — Improve Essentials page static content

**File:** `src/pages/Essentials.tsx`

Add a short static intro above the product grid:

```tsx
<section className="max-w-2xl mb-8">
  <h1 className="text-2xl font-bold mb-3">Puppy Essentials & Starter Kits</h1>
  <p className="text-base">
    Everything your new puppy needs from day one. Dream Puppies recommends these essentials
    for the first weeks at home — from food and crates to grooming tools and training aids.
    Available for pickup in Orlando, FL or Raeford, NC.
  </p>
</section>
```

---

## PHASE 6 — OG IMAGE & BRAND CONSISTENCY (1 hour)

### Task 6.1 — Add OG image URL to seo.ts

**File:** `src/lib/seo.ts`

The `Seo.tsx` component accepts an `imageUrl` prop and sets `og:image`. The home page fallback is `dream-puppies-logo.png`. Add an explicit default image URL to `SEO_ROUTE_CONFIG.home`:

```ts
home: {
  title: 'Family-Raised Puppies for Sale in Orlando, FL | Dream Puppies',
  description: '...',
  robots: 'index,follow',
  imageUrl: 'https://puppyheavenllc.com/dream-puppies-og.png',  // 1200×630 image
},
```

**Prerequisite:** Create or designate a 1200×630 px hero image as `public/dream-puppies-og.png`. This can be a photo of puppies with the Dream Puppies logo overlay.

### Task 6.2 — Add OG image to index.html fallback

**File:** `index.html`

The current `<head>` has no `og:image` tag. Add:
```html
<meta property="og:image" content="https://puppyheavenllc.com/dream-puppies-og.png" />
<meta name="twitter:image" content="https://puppyheavenllc.com/dream-puppies-og.png" />
```

### Task 6.3 — Document domain/brand mismatch

**Do not rename the domain** (costly, risky for any existing backlinks). Instead, make the relationship explicit on the site:

**File:** `src/pages/About.tsx` (created in Phase 4)

Add a short paragraph:
```tsx
<p className="text-sm text-muted-foreground mt-8">
  Dream Puppies is the brand name of Dream Enterprises LLC, operating at puppyheavenllc.com.
  We're the same family — same puppies, same people.
</p>
```

**File:** `src/components/home/GalacticHomeMiniFooter.tsx`

In the legal bottom bar, ensure it reads:
```tsx
© {year} Dream Enterprises LLC — Dream Puppies | puppyheavenllc.com
```

---

## PHASE 7 — OPERATOR ACTIONS (no code required)

These are manual steps only the site owner can complete.

### Task 7.1 — Set up Google Business Profile

1. Go to https://business.google.com
2. Create a profile for **Dream Puppies**
3. Category: **Pet Breeder** (primary); **Pet Store** (secondary)
4. Add both locations:
   - Orlando, FL (primary)
   - Raeford, NC (secondary)
5. Phone: (321) 697-8864
6. Website: https://puppyheavenllc.com
7. Add 10+ photos (puppies, you with puppies, your home/space)
8. Write a 250-word business description using these keywords:
   - "family-raised", "home-raised", "puppies for sale Orlando FL", breed names
9. Request reviews from past customers (email or text them the GBP review link)

**ROI estimate:** This is the single highest-ROI action on the list. GBP listings appear in Google Maps results and the local 3-pack. A puppy breeder with 10+ reviews will outrank SEO-optimized sites with no reviews.

### Task 7.2 — Set up Google Search Console

1. Go to https://search.google.com/search-console
2. Add property for `https://puppyheavenllc.com`
3. Verify ownership via DNS TXT record (Netlify DNS makes this easy)
4. Submit sitemap: `https://puppyheavenllc.com/sitemap.xml`
5. Request indexing for each URL manually on first setup
6. Monitor Coverage report weekly for crawl errors

### Task 7.3 — Verify Netlify Analytics or set up GA4

1. Enable Netlify Analytics in the Netlify dashboard (server-side, no JS required)
2. Or: Set up Google Analytics 4 and add the measurement ID to the site

### Task 7.4 — Set merchant descriptor (already in Wave H plan)

In Square dashboard: set display name to `DREAMPUPPIES 321-697-8864`.

---

## PHASE 8 — CI/CD & MONITORING (1–2 hours)

### Task 8.1 — Add SEO build verification to CI

**File:** `.github/workflows/ci.yml`

The `npm run verify:seo:build` script exists in package.json but is never called. Add it to the CI pipeline after the build step:

```yaml
      - name: Build
        env:
          VITE_SITE_URL: https://puppyheavenllc.com
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: npm run build

      - name: Verify SEO output
        run: npm run verify:seo:build
```

This ensures the postbuild script runs and its output is validated on every PR.

### Task 8.2 — Add SEO route coverage check to verify-seo-build.ts

**File:** `scripts/verify-seo-build.ts`

Read the existing script and add a check that every route in `PUBLIC_SEO_ROUTES` has:
1. A `dist/{route}/index.html` file
2. That file contains the expected `<title>` tag
3. That file contains at least one `<h1>` tag
4. `dist/sitemap.xml` exists and contains all routes
5. `dist/robots.txt` contains `Sitemap:` reference

---

## SUMMARY SCORECARD: BEFORE → AFTER

| Section | Before | After Phases 0–8 | Key Changes |
|---------|--------|-----------------|-------------|
| Technical Foundation | 3/10 | 8/10 | SSR working, sitemap generated, CI verified |
| On-Page SEO | 2/10 | 7/10 | Location keywords in titles, H1s on all pages |
| Local SEO | 1/10 | 7/10 | Footer NAP, city keywords, GBP set up |
| E-E-A-T | 2/10 | 6/10 | About page, NAP in contact, schema markup |
| Content Strategy | 2/10 | 6/10 | Breed descriptions, static intros on all pages |
| Social/Platform | 4/10 | 6/10 | OG image, brand consistency text |
| **Overall** | **20/100** | **~65/100** | |

---

## FILE CHANGE MANIFEST

### Modified files
| File | Phase | Change |
|------|-------|--------|
| `src/lib/seo.ts` | 1 | Rewrite all route titles/descriptions; add about, dreamyReviews, trainingPlan, faq entries |
| `src/i18n/translations.ts` | 3 | Update indexHeroDescription, breedsIntroDescription, upcomingLittersDescription |
| `src/pages/Index.tsx` | 2 | Add LocalBusiness JSON-LD useEffect |
| `src/pages/Puppies.tsx` | 2, 5 | Add BreadcrumbList + ItemList schema; add static intro paragraph |
| `src/pages/Breeds.tsx` | 1, 3, 5 | Add sr-only H1 if missing; add breeds intro; add static breed descriptions section |
| `src/pages/Contact.tsx` | 1, 3, 5 | Add H1; add NAP block; add static "How we help" section |
| `src/pages/Essentials.tsx` | 1, 5 | Add H1; add static intro |
| `src/pages/Consultation.tsx` | 1 | Add sr-only H1 |
| `src/pages/DreamyReviews.tsx` | 1 | Add `<Seo pageId="dreamyReviews" />`; add H1 |
| `src/pages/TrainingPlanPage.tsx` | 1 | Add `<Seo pageId="trainingPlan" />`; add H1 |
| `src/pages/FaqPage.tsx` | 1 | Update Seo call to use pageId |
| `src/pages/UpcomingLitters.tsx` | 3, 5 | Add location paragraph |
| `src/components/home/GalacticHomeMiniFooter.tsx` | 3, 6 | Add city-level keywords; update legal line |
| `src/components/layout/Footer.tsx` | 3 | Mirror footer changes |
| `src/App.tsx` | 4 | Add `/about` route |
| `scripts/postbuild-seo.tsx` | 0 | Add Sitemap reference to robots.txt output |
| `index.html` | 6 | Add og:image and twitter:image tags |
| `.github/workflows/ci.yml` | 0, 8 | Add VITE_SITE_URL env var; add verify:seo:build step |

### New files
| File | Phase | Purpose |
|------|-------|---------|
| `src/pages/About.tsx` | 4 | About page with story, NAP, service areas |
| `docs/seo/SEO_IMPLEMENTATION_PLAN.md` | — | This document |

---

## IMPLEMENTATION ORDER FOR HAIKU MODE

Execute in this exact order to minimize risk:

1. **Phase 0 (operator):** Add `VITE_SITE_URL` to Netlify → trigger deploy → verify sitemap
2. **Phase 0 (code):** Fix postbuild robots.txt Sitemap line + CI env var
3. **Phase 1:** All title/description updates in `seo.ts` (no visual changes, safe)
4. **Phase 2:** LocalBusiness schema on home page (no visual changes)
5. **Phase 3:** Footer city keywords (small visual change — test on mobile)
6. **Phase 4:** About page (new page, no risk to existing pages)
7. **Phase 5:** Static content blocks (additive to existing pages)
8. **Phase 6:** OG image (requires creating the 1200×630 image first)
9. **Phase 7:** Operator actions (Google Business Profile, Search Console)
10. **Phase 8:** CI verification step

---

*Plan authored May 20, 2026 | Based on live audit + full codebase read*
