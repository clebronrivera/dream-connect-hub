import { appEnv } from "@/lib/env";

export const SITE_NAME = "Dream Puppies";
export const SITE_AUTHOR = "Dream Enterprises LLC — Dream Puppies";
export const DEFAULT_ROBOTS = "index,follow";
export const NOINDEX_ROBOTS = "noindex,nofollow";
export const DEFAULT_OG_TYPE = "website";
// "summary" is correct for our square 1024×1024 logo; "summary_large_image"
// expects a wide (≥2:1) banner and would crop/distort the logo.
export const DEFAULT_TWITTER_CARD = "summary";
export const DEFAULT_SOCIAL_IMAGE_PATH = "/dream-puppies-logo.png";

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
      "Family-raised puppies for sale in Orlando, FL and Raeford, NC. Goldendoodles, Mini Goldendoodles, French Bulldogs, Shih Tzus, and more. Reserve yours today — call (321) 697-8864.",
  },
  puppies: {
    pageId: "puppies",
    path: "/puppies",
    title: "Available Puppies for Sale in Florida",
    description:
      "Browse available puppies from Dream Puppies — Goldendoodles, French Bulldogs, Shih Tzus, and more. Family-raised in Orlando, FL. Photos, prices, and pickup info included.",
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
      "See upcoming Goldendoodle, Labradoodle, and French Bulldog litters from Dream Puppies in Orlando, FL. Reserve your spot before the litter arrives.",
  },
  breeds: {
    pageId: "breeds",
    path: "/breeds",
    title: "Dog Breeds We Raise | Dream Puppies Orlando, FL",
    description:
      "Explore the breeds raised by Dream Puppies: Mini Goldendoodles, French Bulldogs, Shih Tzus, Toy Poodles, and more. Compare temperament, size, and care needs.",
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
      "Dream Puppies is a family-operated puppy breeder in Orlando, FL. Home-raised Goldendoodles, French Bulldogs, Shih Tzus, and more. Health-checked, vaccinated, and loved from birth.",
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
    tags.push(`<meta property="og:image:type" content="image/png" />`);
    tags.push(`<meta property="og:image:width" content="1024" />`);
    tags.push(`<meta property="og:image:height" content="1024" />`);
    tags.push(`<meta property="og:image:alt" content="Dream Puppies logo" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(metadata.socialImage)}" />`);
    tags.push(`<meta name="twitter:image:alt" content="Dream Puppies logo" />`);
  }

  return tags.join("");
}

export function requireSiteUrlForBuild(env: SeoEnvOverrides = appEnv): string {
  const siteUrl = env.siteUrl?.trim();
  if (!siteUrl) {
    throw new Error(
      "Missing VITE_SITE_URL. Set it in the environment before running the production SEO build."
    );
  }

  return siteUrl.replace(/\/$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
