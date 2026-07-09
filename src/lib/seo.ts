import { appEnv } from "@/lib/env";

export const SITE_NAME = "Dream Puppies";
export const SITE_AUTHOR = "Dream Enterprises LLC — Dream Puppies";
export const DEFAULT_ROBOTS = "index,follow";
export const NOINDEX_ROBOTS = "noindex,nofollow";

/** Buyer / deposit / payment pages — must not appear in search results. */
export const NOINDEX_PRIVATE_SEO = {
  title: "Private Puppy Reservation",
  description:
    "This private page is used for puppy reservation and payment coordination.",
  robots: NOINDEX_ROBOTS,
} as const;

export const NOINDEX_PRIVATE_PRERENDER_ROUTES = [
  { path: "/deposit", ...NOINDEX_PRIVATE_SEO },
  { path: "/request-deposit", ...NOINDEX_PRIVATE_SEO },
] as const;

export type FaqJsonLdItem = {
  question: string;
  answer: string;
};

export function buildFaqPageJsonLd(items: ReadonlyArray<FaqJsonLdItem>): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: sanitizeFaqAnswerForJsonLd(item.answer),
      },
    })),
  };
}

export function sanitizeFaqAnswerForJsonLd(answer: string): string {
  return answer.replace(/[*#\n]/g, " ").trim();
}

export function renderFaqPageJsonLd(items: ReadonlyArray<FaqJsonLdItem>): string {
  if (items.length === 0) return "";
  return `<script type="application/ld+json">${JSON.stringify(buildFaqPageJsonLd(items))}</script>`;
}

export function renderPrivateNoindexBodyFallback(): string {
  return `<noscript>
  <h1>Private reservation page</h1>
  <p>This page is not indexed. Use the personalized link we emailed you to continue your reservation.</p>
</noscript>`;
}

export const DEFAULT_OG_TYPE = "website";
export const DEFAULT_TWITTER_CARD = "summary_large_image";
export const DEFAULT_SOCIAL_IMAGE_PATH = "/og-image.jpg?v=2";

export type SeoPageId =
  | "home"
  | "puppies"
  | "consultation"
  | "essentials"
  | "contact"
  | "upcomingLitters"
  | "breeds"
  | "faq"
  | "dreamyReviews"
  | "trainingPlan"
  | "about"
  | "ourDogs"
  | "admin"
  | "adminLogin"
  | "notFound";

export type SeoRouteConfig = {
  pageId: SeoPageId;
  path: string;
  title: string;
  description: string;
  robots?: string;
};

export const SEO_ROUTE_CONFIG: Record<SeoPageId, SeoRouteConfig> = {
  home: {
    pageId: "home",
    path: "/",
    title: "Family-Raised Puppies for Sale in Orlando, FL",
    description:
      "Family-raised puppies for sale in Orlando, FL and Raeford, NC. Goldendoodles, Labradoodles, Shih Tzus, Toy Poodles, Pomeranians, Maltese, and more. Reserve yours today — call (321) 697-8864.",
  },
  puppies: {
    pageId: "puppies",
    path: "/puppies",
    title: "Available Puppies for Sale in Florida",
    description:
      "Browse available puppies from Dream Puppies — Goldendoodles, Labradoodles, Shih Tzus, Poodles, and more. Family-raised in Orlando, FL. Photos, prices, and pickup info included.",
  },
  consultation: {
    pageId: "consultation",
    path: "/consultation",
    title: "Virtual Puppy Consultation | Dream Puppies Orlando, FL",
    description:
      "Book a free virtual consultation with Dream Puppies. We help Florida and North Carolina families find the perfect breed for their home and lifestyle.",
  },
  essentials: {
    pageId: "essentials",
    path: "/essentials",
    title: "Puppy Starter Kits & Essentials",
    description:
      "Shop puppy starter kits and essentials recommended by Dream Puppies. Everything your new family member needs from day one.",
  },
  contact: {
    pageId: "contact",
    path: "/contact",
    title: "Contact Dream Puppies | Orlando, FL (321) 697-8864",
    description:
      "Contact Dream Puppies in Orlando, FL or Raeford, NC. Call or text (321) 697-8864, email Dreampuppies22@gmail.com, or fill out our inquiry form.",
  },
  upcomingLitters: {
    pageId: "upcomingLitters",
    path: "/upcoming-litters",
    title: "Upcoming Puppy Litters in Florida",
    description:
      "See upcoming Goldendoodle, Labradoodle, and small-breed litters from Dream Puppies in Orlando, FL. Reserve your spot before the litter arrives.",
  },
  breeds: {
    pageId: "breeds",
    path: "/breeds",
    title: "Dog Breeds We Raise | Dream Puppies Orlando, FL",
    description:
      "Explore the breeds raised by Dream Puppies: Goldendoodles, Labradoodles, Shih Tzus, Toy Poodles, Pomeranians, Maltese, and more. Compare temperament, size, and care needs.",
  },
  faq: {
    pageId: "faq",
    path: "/faq",
    title: "FAQ — Deposits, Pickup, Health & Care",
    description:
      "Frequently asked questions about Dream Puppies: deposits, pricing, pickup process, health guarantees, vaccinations, and puppy care.",
  },
  dreamyReviews: {
    pageId: "dreamyReviews",
    path: "/dreamy-reviews",
    title: "Customer Reviews | Dream Puppies Orlando, FL",
    description:
      "Read reviews from Dream Puppies families. Real stories from happy puppy owners in Florida and North Carolina.",
  },
  trainingPlan: {
    pageId: "trainingPlan",
    path: "/training-plan",
    title: "Free Puppy Training Plan",
    description:
      "Get a free customized puppy training plan from Dream Puppies. Address common puppy problems with step-by-step guidance.",
  },
  about: {
    pageId: "about",
    path: "/about",
    title: "About Dream Puppies | Family Breeder in Orlando, FL",
    description:
      "Dream Puppies is a family-operated puppy breeder in Orlando, FL. Home-raised Goldendoodles, Labradoodles, Shih Tzus, Poodles, and more. Health-checked, vaccinated, and loved from birth.",
  },
  ourDogs: {
    pageId: "ourDogs",
    path: "/our-dogs",
    title: "Our Dogs — Meet the Moms & Dads | Dream Puppies",
    description:
      "Meet the moms and dads behind every Dream Puppies litter. Health-checked, family-raised Goldendoodles, Labradoodles, Poodles, and Shih Tzus in Orlando, FL and Raeford, NC.",
  },
  admin: {
    pageId: "admin",
    path: "/admin",
    title: "Admin Dashboard",
    description: "Internal Dream Puppies admin dashboard.",
    robots: NOINDEX_ROBOTS,
  },
  adminLogin: {
    pageId: "adminLogin",
    path: "/admin/login",
    title: "Admin Login",
    description: "Internal Dream Puppies admin login.",
    robots: NOINDEX_ROBOTS,
  },
  notFound: {
    pageId: "notFound",
    path: "/404",
    title: "Page Not Found",
    description: "The page you are looking for could not be found.",
    robots: NOINDEX_ROBOTS,
  },
};

export const PUBLIC_ROUTE_PAGE_IDS = [
  "home",
  "puppies",
  "consultation",
  "essentials",
  "contact",
  "upcomingLitters",
  "breeds",
  "faq",
  "dreamyReviews",
  "trainingPlan",
  "about",
  "ourDogs",
] as const satisfies readonly SeoPageId[];

export const PUBLIC_SEO_ROUTES = PUBLIC_ROUTE_PAGE_IDS.map((pageId) => SEO_ROUTE_CONFIG[pageId]);

export type SeoEnvOverrides = {
  siteUrl?: string;
  supabaseUrl?: string;
  bannerImageUrl?: string;
};

export type ResolvedSeoMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  ogType: string;
  twitterCard: string;
  author: string;
  siteName: string;
  socialImage?: string;
};

export function normalizeCanonicalPath(pathname: string): string {
  const withoutHash = pathname.split("#")[0] ?? pathname;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  if (withLeadingSlash === "/") return "/";
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

export function getPageTitle(title: string): string {
  return title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;
}

export function resolveSiteOrigin(currentOrigin?: string, env: SeoEnvOverrides = appEnv): string | undefined {
  const envSiteUrl = env.siteUrl?.trim().replace(/\/$/, "");
  if (envSiteUrl) return envSiteUrl;

  const origin = currentOrigin?.trim().replace(/\/$/, "");
  if (origin) return origin;

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  return undefined;
}

export function buildCanonicalUrl(
  pathname: string,
  currentOrigin?: string,
  env: SeoEnvOverrides = appEnv
): string {
  const normalizedPath = normalizeCanonicalPath(pathname);
  const origin = resolveSiteOrigin(currentOrigin, env);
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}

export function normalizePublicAssetUrl(rawUrl?: string): string | undefined {
  const url = rawUrl?.trim();
  if (!url) return undefined;

  const dashboardMatch = url.match(
    /^https:\/\/supabase\.com\/dashboard\/project\/([^/]+)\/(storage\/v1\/object\/public\/.+)$/i
  );
  if (dashboardMatch) {
    const [, projectRef, publicPath] = dashboardMatch;
    return `https://${projectRef}.supabase.co/${publicPath}`;
  }

  return url;
}

export function resolveSocialImageUrl(env: SeoEnvOverrides = appEnv): string | undefined {
  const explicitBanner = normalizePublicAssetUrl(env.bannerImageUrl);
  if (explicitBanner) return explicitBanner;

  const origin = resolveSiteOrigin(undefined, env);
  if (origin) return `${origin}${DEFAULT_SOCIAL_IMAGE_PATH}`;

  return undefined;
}

export function getSeoRoute(pageId: SeoPageId): SeoRouteConfig {
  return SEO_ROUTE_CONFIG[pageId];
}

type ResolveSeoMetadataOptions = {
  pageId?: SeoPageId;
  title?: string;
  description?: string;
  canonicalPath?: string;
  robots?: string;
  imageUrl?: string;
  currentOrigin?: string;
  env?: SeoEnvOverrides;
};

export function resolveSeoMetadata({
  pageId,
  title,
  description,
  canonicalPath,
  robots,
  imageUrl,
  currentOrigin,
  env = appEnv,
}: ResolveSeoMetadataOptions): ResolvedSeoMetadata {
  const routeMeta = pageId ? getSeoRoute(pageId) : undefined;
  const resolvedTitle = title ?? routeMeta?.title ?? SITE_NAME;
  const resolvedDescription =
    description ??
    routeMeta?.description ??
    "Your trusted partner for finding the perfect puppy, expert pet consultation, and everything your furry friend needs to thrive.";
  const resolvedRobots = robots ?? routeMeta?.robots ?? DEFAULT_ROBOTS;
  const resolvedCanonicalPath = canonicalPath ?? routeMeta?.path ?? "/";

  return {
    title: getPageTitle(resolvedTitle),
    description: resolvedDescription,
    canonicalUrl: buildCanonicalUrl(resolvedCanonicalPath, currentOrigin, env),
    robots: resolvedRobots,
    ogType: DEFAULT_OG_TYPE,
    twitterCard: DEFAULT_TWITTER_CARD,
    author: SITE_AUTHOR,
    siteName: SITE_NAME,
    socialImage: imageUrl ?? resolveSocialImageUrl(env),
  };
}

export function renderStaticSeoTags(metadata: ResolvedSeoMetadata): string {
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="author" content="${escapeHtml(metadata.author)}" />`,
    `<meta name="robots" content="${escapeHtml(metadata.robots)}" />`,
    `<meta name="googlebot" content="${escapeHtml(metadata.robots)}" />`,
    `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(metadata.siteName)}" />`,
    `<meta property="og:type" content="${escapeHtml(metadata.ogType)}" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}" />`,
    `<meta name="twitter:card" content="${escapeHtml(metadata.twitterCard)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`,
  ];

  if (metadata.socialImage) {
    tags.push(`<meta property="og:image" content="${escapeHtml(metadata.socialImage)}" />`);
    tags.push(`<meta property="og:image:type" content="image/jpeg" />`);
    tags.push(`<meta property="og:image:width" content="1200" />`);
    tags.push(`<meta property="og:image:height" content="630" />`);
    tags.push(`<meta property="og:image:alt" content="Dream Puppies — family-raised puppies in Orlando, FL and Raeford, NC" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(metadata.socialImage)}" />`);
    tags.push(`<meta name="twitter:image:alt" content="Dream Puppies — family-raised puppies in Orlando, FL and Raeford, NC" />`);
  }

  return tags.join("");
}

export const DEFAULT_SITE_URL = "https://puppyheavenllc.com";

export type BreedSeoSource = {
  id: string;
  name: string;
  shortDesc: string;
  temperament: string;
  hypoallergenic: boolean;
  size: string;
  weight: string;
  lifespan: string;
};

export type BreedSeoMetadata = {
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
};

export function getBreedSeoMetadata(breed: BreedSeoSource): BreedSeoMetadata {
  const slug = breed.id;
  const hypoNote = breed.hypoallergenic ? "hypoallergenic, " : "";
  const description =
    `Family-raised ${breed.name} puppies from Dream Puppies — ${breed.shortDesc.toLowerCase()}, ${hypoNote}` +
    `vet-checked, and ready for their forever home in Orlando, FL and Raeford, NC. ` +
    `Call (321) 697-8864 to reserve.`;
  return {
    slug,
    path: `/breeds/${slug}`,
    title: `${breed.name} Puppies for Sale in Orlando, FL & Raeford, NC`,
    description,
    h1: `${breed.name} Puppies — Family-Raised in Orlando, FL & Raeford, NC`,
  };
}

export function renderBreedBodyFallback(
  breed: BreedSeoSource,
  meta: BreedSeoMetadata,
  siteUrl: string
): string {
  const base = siteUrl.replace(/\/$/, "");
  const traits = [
    `Size: ${breed.size}`,
    `Weight: ${breed.weight}`,
    `Lifespan: ${breed.lifespan}`,
    `Temperament: ${breed.temperament}`,
    breed.hypoallergenic ? "Hypoallergenic" : null,
  ].filter(Boolean) as string[];

  const traitsHtml = traits.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  return `<noscript>
  <header>
    <h1>${escapeHtml(meta.h1)}</h1>
    <p>${escapeHtml(meta.description)}</p>
  </header>
  <h2>About the ${escapeHtml(breed.name)}</h2>
  <p>${escapeHtml(breed.shortDesc)}.</p>
  <ul>${traitsHtml}</ul>
  <p><a href="${base}/puppies">View available ${escapeHtml(breed.name)} puppies</a></p>
  <p><a href="${base}/upcoming-litters">See upcoming ${escapeHtml(breed.name)} litters</a></p>
  <nav aria-label="Site"><ul>
    <li><a href="${base}/">Dream Puppies home</a></li>
    <li><a href="${base}/breeds">All breeds</a></li>
    <li><a href="${base}/about">About us</a></li>
    <li><a href="${base}/contact">Contact</a></li>
    <li><a href="${base}/faq">FAQ</a></li>
  </ul></nav>
  <p>Call or text <a href="tel:+13216978864">(321) 697-8864</a> &middot; <a href="mailto:Dreampuppies22@gmail.com">Dreampuppies22@gmail.com</a></p>
</noscript>`;
}

export function renderBreedJsonLd(
  breed: BreedSeoSource,
  meta: BreedSeoMetadata,
  siteUrl: string
): string {
  const base = siteUrl.replace(/\/$/, "");
  const payload = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.h1,
    description: meta.description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${base}${meta.path}`,
    },
    about: {
      "@type": "Thing",
      name: `${breed.name} dog breed`,
      description: breed.shortDesc,
    },
    publisher: {
      "@type": "Organization",
      name: "Dream Puppies",
      logo: {
        "@type": "ImageObject",
        url: `${base}/dream-puppies-logo.png`,
      },
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

export type PuppySeoSource = {
  slug: string;
  name: string;
  breed: string;
  generation?: string | null;
  status?: string | null;
  readyDate?: string | null;
  primaryImage?: string | null;
};

export type PuppySeoMetadata = {
  path: string;
  title: string;
  description: string;
  h1: string;
  breedLabel: string;
  isOnHold: boolean;
};

export function getPuppySeoMetadata(puppy: PuppySeoSource): PuppySeoMetadata {
  const breedLabel = puppy.generation ? `${puppy.generation} ${puppy.breed}` : puppy.breed;
  const isOnHold = puppy.status === "Reserved";
  const holdNote = isOnHold
    ? " Currently on hold — contact us to join the waitlist for the next available puppy."
    : "";
  return {
    path: `/puppies/${puppy.slug}`,
    title: `${puppy.name} — ${breedLabel} Puppy in Orlando, FL`,
    description:
      `Meet ${puppy.name}, a ${breedLabel} puppy from Dream Puppies, family-raised in Orlando, FL ` +
      `and Raeford, NC.${holdNote} Call (321) 697-8864 to reserve.`,
    h1: `${puppy.name} — ${breedLabel} in Orlando, FL`,
    breedLabel,
    isOnHold,
  };
}

export function renderPuppyBodyFallback(
  puppy: PuppySeoSource,
  meta: PuppySeoMetadata,
  siteUrl: string
): string {
  const base = siteUrl.replace(/\/$/, "");
  const statusLine = meta.isOnHold
    ? "Status: On Hold (reserved by another family)"
    : "Status: Available";
  return `<noscript>
  <header>
    <h1>${escapeHtml(meta.h1)}</h1>
    <p>${escapeHtml(meta.description)}</p>
  </header>
  <p>${escapeHtml(statusLine)}</p>
  ${puppy.readyDate ? `<p>Ready by: ${escapeHtml(puppy.readyDate)}</p>` : ""}
  <p><a href="${base}/our-dogs">Meet ${escapeHtml(puppy.name)}'s parents</a></p>
  <p><a href="${base}/request-deposit">Ask about ${escapeHtml(puppy.name)}</a></p>
  <nav aria-label="Site"><ul>
    <li><a href="${base}/puppies">All available puppies</a></li>
    <li><a href="${base}/breeds">Breeds we raise</a></li>
    <li><a href="${base}/contact">Contact</a></li>
  </ul></nav>
  <p>Call or text <a href="tel:+13216978864">(321) 697-8864</a> &middot; <a href="mailto:Dreampuppies22@gmail.com">Dreampuppies22@gmail.com</a></p>
</noscript>`;
}

export function renderPuppyJsonLd(
  puppy: PuppySeoSource,
  meta: PuppySeoMetadata,
  siteUrl: string
): string {
  const base = siteUrl.replace(/\/$/, "");
  // No `offers.price` — this site intentionally doesn't publish puppy prices
  // (buyers use the "Inquire about price" flow instead), so the Offer here
  // signals availability only.
  const payload = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${puppy.name} — ${meta.breedLabel} puppy`,
    description: meta.description,
    ...(puppy.primaryImage ? { image: [puppy.primaryImage] } : {}),
    offers: {
      "@type": "Offer",
      url: `${base}${meta.path}`,
      priceCurrency: "USD",
      availability: meta.isOnHold ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
      businessFunction: "https://schema.org/Sell",
      seller: {
        "@type": "Organization",
        name: "Dream Puppies",
      },
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

export type BreedLocationSource = {
  breedSlug: string;
  breedDisplayName: string;
  locationSlug: string;
  city: string;
  state: "FL" | "NC";
};

export type BreedLocationSeoMetadata = {
  path: string;
  title: string;
  description: string;
  h1: string;
};

export function getBreedLocationSeoMetadata(source: BreedLocationSource): BreedLocationSeoMetadata {
  return {
    path: `/puppies/${source.breedSlug}/${source.locationSlug}`,
    title: `${source.breedDisplayName} Puppies in ${source.city}, ${source.state} | Dream Puppies`,
    description:
      `Family-raised ${source.breedDisplayName} puppies for ${source.city}, ${source.state} families. ` +
      `Free local delivery within 30 miles or visit our home to meet the parents. Call (321) 697-8864.`,
    h1: `${source.breedDisplayName} Puppies for Sale in ${source.city}, ${source.state}`,
  };
}

export function renderBreedLocationBodyFallback(
  location: {
    intro: string;
    isPrimary?: boolean;
    driveDistanceMiles: number;
    driveTimeMinutes: number;
    freeDelivery: boolean;
  },
  meta: BreedLocationSeoMetadata,
  siteUrl: string
): string {
  const base = siteUrl.replace(/\/$/, "");
  const deliveryLine = location.isPrimary
    ? "Free local pickup at our home."
    : location.freeDelivery
      ? `Free delivery — ${location.driveDistanceMiles} mi / ~${location.driveTimeMinutes} min from our nearest location.`
      : `Delivery available for a fee — ${location.driveDistanceMiles} mi / ~${location.driveTimeMinutes} min from our nearest location.`;
  const introParagraphs = location.intro
    .split("\n\n")
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n  ");
  return `<noscript>
  <header>
    <h1>${escapeHtml(meta.h1)}</h1>
  </header>
  ${introParagraphs}
  <p>${escapeHtml(deliveryLine)} Every puppy goes home with a veterinarian-issued health certificate regardless of
  destination — if you're crossing the FL/NC state line, confirm current requirements with your own vet.</p>
  <p><a href="${base}/puppies">View all available puppies</a> &middot; <a href="${base}/contact">Contact us</a>
  &middot; Call or text <a href="tel:+13216978864">(321) 697-8864</a></p>
</noscript>`;
}

export function requireSiteUrlForBuild(env: SeoEnvOverrides = appEnv): string {
  const siteUrl = env.siteUrl?.trim();
  if (!siteUrl) {
    return DEFAULT_SITE_URL;
  }

  return siteUrl.replace(/\/$/, "");
}

type RouteFallbackContent = {
  h1: string;
  intro: string;
  bullets?: ReadonlyArray<string>;
  extra?: string;
};

const ROUTE_FALLBACKS: Partial<Record<SeoPageId, RouteFallbackContent>> = {
  home: {
    h1: "Dream Puppies — Family-Raised Puppies for Sale in Orlando, FL & Raeford, NC",
    intro:
      "Dream Puppies is a family-operated breeder placing healthy, home-raised puppies with families across Florida and North Carolina. Call or text (321) 697-8864 to reserve.",
    bullets: [
      "Goldendoodle & Mini Goldendoodle puppies",
      "Labradoodle puppies",
      "Shih Tzu puppies",
      "Toy Poodle & Standard Poodle puppies",
      "Labradoodle, Pomeranian, and Maltese puppies",
    ],
    extra: "Locations served: Orlando, Florida and Raeford, North Carolina.",
  },
  puppies: {
    h1: "Available Puppies for Sale — Dream Puppies (Orlando, FL & Raeford, NC)",
    intro:
      "Browse the puppies currently available from Dream Puppies. Every puppy is family-raised, vet-checked, and ready for pickup or shipping arrangements. Call (321) 697-8864 to reserve.",
    bullets: [
      "Goldendoodle, Mini Goldendoodle, and Labradoodle puppies",
      "Shih Tzu, Toy Poodle, Standard Poodle, Pomeranian, and Maltese puppies",
      "Photos, age, weight, and price displayed per puppy",
    ],
  },
  upcomingLitters: {
    h1: "Upcoming Puppy Litters — Dream Puppies",
    intro:
      "See upcoming Goldendoodle, Labradoodle, and small-breed litters from Dream Puppies in Orlando, FL. Reserve your spot before puppies are announced publicly.",
  },
  breeds: {
    h1: "Dog Breeds We Raise at Dream Puppies",
    intro:
      "Compare the breeds raised by Dream Puppies — temperament, size, grooming needs, and lifestyle fit. Learn which family-raised puppy is right for your home.",
    bullets: [
      "Goldendoodle (Standard and Mini) — see /breeds/goldendoodle",
      "Labradoodle — see /breeds/labradoodle",
      "Toy Poodle — see /breeds/toy-poodle",
      "Standard Poodle — see /breeds/standard-poodle",
      "Shih Tzu — see /breeds/shih-tzu",
      "Pomeranian — see /breeds/pomeranian",
      "Maltese — see /breeds/maltese",
    ],
  },
  about: {
    h1: "About Dream Puppies — A Family Breeder in Orlando, FL",
    intro:
      "Dream Puppies (Dream Enterprises LLC) is a family-operated hobby breeding program based in Orlando, Florida with a second location in Raeford, North Carolina. We raise puppies in our home with daily handling, early socialization, and veterinarian-supervised care.",
  },
  contact: {
    h1: "Contact Dream Puppies",
    intro:
      "Reach Dream Puppies by phone, text, or email. We respond to most inquiries within 24 hours.",
    extra:
      "Phone & text: (321) 697-8864. Email: Dreampuppies22@gmail.com. Locations: Orlando, FL and Raeford, NC.",
  },
  consultation: {
    h1: "Free Virtual Puppy Consultation",
    intro:
      "Not sure which breed is right for your family? Book a free virtual consultation with Dream Puppies. We help Florida and North Carolina families find the right breed for their home, kids, and lifestyle.",
  },
  essentials: {
    h1: "Puppy Starter Kits & Essentials",
    intro:
      "Shop curated puppy starter kits and essentials recommended by Dream Puppies — food, crates, training tools, and grooming supplies for new owners.",
  },
  faq: {
    h1: "Frequently Asked Questions — Dream Puppies",
    intro:
      "Answers to common questions about Dream Puppies: deposits, pricing, pickup, shipping, vaccinations, health guarantees, and care for your new puppy.",
  },
  dreamyReviews: {
    h1: "Customer Reviews — Dream Puppies",
    intro:
      "Read reviews from Dream Puppies families across Florida and North Carolina. Real stories from happy puppy owners.",
  },
  trainingPlan: {
    h1: "Free Puppy Training Plan",
    intro:
      "Get a free, customized puppy training plan from Dream Puppies. Step-by-step guidance for common puppy challenges — biting, potty training, leash manners, and more.",
  },
};

function escapeHtmlPublic(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderRouteBodyFallback(pageId: SeoPageId | undefined, siteUrl: string): string {
  const content = pageId ? ROUTE_FALLBACKS[pageId] : undefined;
  const base = siteUrl.replace(/\/$/, "");
  const navLinks = `<nav aria-label="Site"><ul>
    <li><a href="${base}/puppies">Available puppies</a></li>
    <li><a href="${base}/upcoming-litters">Upcoming litters</a></li>
    <li><a href="${base}/breeds">Breeds we raise</a></li>
    <li><a href="${base}/about">About</a></li>
    <li><a href="${base}/contact">Contact</a></li>
    <li><a href="${base}/faq">FAQ</a></li>
  </ul></nav>`;

  if (!content) {
    return `<noscript>
  <h1>Dream Puppies</h1>
  <p>Family-operated puppy breeder in Orlando, FL and Raeford, NC. Call (321) 697-8864.</p>
  ${navLinks}
</noscript>`;
  }

  const bulletsHtml = content.bullets?.length
    ? `<ul>${content.bullets.map((b) => `<li>${escapeHtmlPublic(b)}</li>`).join("")}</ul>`
    : "";
  const extraHtml = content.extra ? `<p>${escapeHtmlPublic(content.extra)}</p>` : "";

  return `<noscript>
  <header>
    <h1>${escapeHtmlPublic(content.h1)}</h1>
    <p>${escapeHtmlPublic(content.intro)}</p>
    ${extraHtml}
  </header>
  ${bulletsHtml}
  ${navLinks}
  <p>Call or text <a href="tel:+13216978864">(321) 697-8864</a> &middot; <a href="mailto:Dreampuppies22@gmail.com">Dreampuppies22@gmail.com</a></p>
</noscript>`;
}

export type LocalBusinessAddress = {
  city: string;
  state: "FL" | "NC";
  county?: string;
};

const STATE_NAMES: Record<"FL" | "NC", string> = { FL: "Florida", NC: "North Carolina" };

/**
 * @param address When provided (city x location pages), the JSON-LD carries
 * just that city's address + areaServed instead of both home-base states —
 * this is also what a future Google Business Profile will cross-reference
 * per-location, so the shape is built correctly now even though claiming the
 * profile itself is a human/operator action.
 */
export function renderLocalBusinessJsonLd(siteUrl: string, address?: LocalBusinessAddress): string {
  const base = siteUrl.replace(/\/$/, "");
  const payload = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${base}/#business`,
    additionalType: "https://schema.org/PetStore",
    name: "Dream Puppies",
    legalName: "Dream Enterprises LLC",
    url: base,
    telephone: "+1-321-697-8864",
    email: "Dreampuppies22@gmail.com",
    description:
      "Family-operated puppy breeder placing Goldendoodles, Labradoodles, Shih Tzus, Toy Poodles, Pomeranians, Maltese, and more in Orlando, FL and Raeford, NC.",
    logo: {
      "@type": "ImageObject",
      url: `${base}/dream-puppies-logo.png`,
      width: 256,
      height: 256,
    },
    image: `${base}/dream-puppies-logo.png`,
    address: address
      ? [{ "@type": "PostalAddress", addressLocality: address.city, addressRegion: address.state, addressCountry: "US" }]
      : [
          { "@type": "PostalAddress", addressLocality: "Orlando", addressRegion: "FL", addressCountry: "US" },
          { "@type": "PostalAddress", addressLocality: "Raeford", addressRegion: "NC", addressCountry: "US" },
        ],
    areaServed: address
      ? [
          { "@type": "City", name: address.city },
          { "@type": "State", name: STATE_NAMES[address.state] },
        ]
      : [
          { "@type": "State", name: "Florida" },
          { "@type": "State", name: "North Carolina" },
        ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      telephone: "+1-321-697-8864",
      email: "Dreampuppies22@gmail.com",
      areaServed: ["US"],
      availableLanguage: ["English", "Spanish"],
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

export function renderBreadcrumbJsonLd(
  siteUrl: string,
  trail: ReadonlyArray<{ name: string; path: string }>
): string {
  const base = siteUrl.replace(/\/$/, "");
  const payload = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: `${base}${entry.path === "/" ? "/" : entry.path}`,
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
