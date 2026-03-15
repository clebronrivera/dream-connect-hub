import { appEnv } from "@/lib/env";

export const SITE_NAME = "Puppy Heaven";
export const SITE_AUTHOR = "Puppy Heaven Dream Enterprises";
export const DEFAULT_ROBOTS = "index,follow";
export const NOINDEX_ROBOTS = "noindex,nofollow";
export const DEFAULT_OG_TYPE = "website";
export const DEFAULT_TWITTER_CARD = "summary_large_image";

export type SeoPageId =
  | "home"
  | "puppies"
  | "consultation"
  | "essentials"
  | "contact"
  | "upcomingLitters"
  | "breeds"
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
    title: SITE_NAME,
    description:
      "Family-operated puppy placement, pet support, and essentials for families in Florida and North Carolina.",
  },
  puppies: {
    pageId: "puppies",
    path: "/puppies",
    title: "Available Puppies",
    description:
      "Browse available puppies with current photos, breed details, and availability information.",
  },
  consultation: {
    pageId: "consultation",
    path: "/consultation",
    title: "Virtual Pet Consultation",
    description:
      "Book one-on-one puppy and pet consultations for starter help, readiness, and behavior support.",
  },
  essentials: {
    pageId: "essentials",
    path: "/essentials",
    title: "Pet Essentials",
    description:
      "Shop starter kits and pet essentials for feeding, comfort, grooming, training, and play.",
  },
  contact: {
    pageId: "contact",
    path: "/contact",
    title: "Contact Puppy Heaven",
    description:
      "Contact Puppy Heaven about puppy availability, upcoming litters, consultations, or general questions.",
  },
  upcomingLitters: {
    pageId: "upcomingLitters",
    path: "/upcoming-litters",
    title: "Upcoming Litters",
    description:
      "Explore upcoming litters, join the waitlist, and inquire about deposits and timing.",
  },
  breeds: {
    pageId: "breeds",
    path: "/breeds",
    title: "Dog Breeds",
    description:
      "Compare breeds by size, temperament, grooming needs, and family fit.",
  },
  admin: {
    pageId: "admin",
    path: "/admin",
    title: "Admin Dashboard",
    description: "Internal Puppy Heaven admin dashboard.",
    robots: NOINDEX_ROBOTS,
  },
  adminLogin: {
    pageId: "adminLogin",
    path: "/admin/login",
    title: "Admin Login",
    description: "Internal Puppy Heaven admin login.",
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

  const supabaseUrl = env.supabaseUrl?.trim().replace(/\/$/, "");
  if (!supabaseUrl) return undefined;

  return `${supabaseUrl}/storage/v1/object/public/site-assets/banner-puppies.png.jpeg`;
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
    tags.push(`<meta name="twitter:image" content="${escapeHtml(metadata.socialImage)}" />`);
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
