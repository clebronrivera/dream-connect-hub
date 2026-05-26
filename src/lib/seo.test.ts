import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_URL,
  NOINDEX_PRIVATE_SEO,
  NOINDEX_ROBOTS,
  PUBLIC_SEO_ROUTES,
  SEO_ROUTE_CONFIG,
  buildCanonicalUrl,
  buildFaqPageJsonLd,
  getBreedSeoMetadata,
  getPageTitle,
  normalizeCanonicalPath,
  normalizePublicAssetUrl,
  renderBreadcrumbJsonLd,
  renderBreedBodyFallback,
  renderBreedJsonLd,
  renderFaqPageJsonLd,
  renderLocalBusinessJsonLd,
  renderRouteBodyFallback,
  requireSiteUrlForBuild,
  resolveSeoMetadata,
  resolveSocialImageUrl,
  sanitizeFaqAnswerForJsonLd,
} from "@/lib/seo";

describe("seo helpers", () => {
  it("normalizes root and nested canonical paths", () => {
    expect(normalizeCanonicalPath("/")).toBe("/");
    expect(normalizeCanonicalPath("/puppies/")).toBe("/puppies");
    expect(normalizeCanonicalPath("contact")).toBe("/contact");
  });

  it("strips query strings and hashes from canonical paths", () => {
    expect(normalizeCanonicalPath("/puppies?breed=poodle")).toBe("/puppies");
    expect(normalizeCanonicalPath("/contact#form")).toBe("/contact");
  });

  it("builds canonical urls from a provided site url", () => {
    expect(
      buildCanonicalUrl("/upcoming-litters/?sort=soon", undefined, {
        siteUrl: "https://puppyheaven.example/",
      })
    ).toBe("https://puppyheaven.example/upcoming-litters");
  });

  it("prefers the explicit banner image for social previews", () => {
    expect(
      resolveSocialImageUrl({
        bannerImageUrl: "https://cdn.example.com/social/banner.png",
        supabaseUrl: "https://project.supabase.co",
      })
    ).toBe("https://cdn.example.com/social/banner.png");
  });

  it("falls back to the local og-image when no explicit banner is configured", () => {
    expect(
      resolveSocialImageUrl({
        siteUrl: "https://puppyheaven.example/",
        supabaseUrl: "https://project.supabase.co/",
      })
    ).toBe(
      "https://puppyheaven.example/og-image.jpg?v=2"
    );
  });

  it("normalizes Supabase dashboard asset urls to public storage urls", () => {
    expect(
      normalizePublicAssetUrl(
        "https://supabase.com/dashboard/project/xwudsqswlfpoljuhbphr/storage/v1/object/public/site-assets/banner-puppies.png.jpeg"
      )
    ).toBe(
      "https://xwudsqswlfpoljuhbphr.supabase.co/storage/v1/object/public/site-assets/banner-puppies.png.jpeg"
    );
  });

  it("returns the expected page title format", () => {
    expect(getPageTitle("Dream Puppies")).toBe("Dream Puppies");
    expect(getPageTitle("Available Puppies")).toBe("Available Puppies | Dream Puppies");
  });
});

describe("seo route config", () => {
  it("defines metadata for every public route", () => {
    expect(PUBLIC_SEO_ROUTES.map((route) => route.path)).toEqual([
      "/",
      "/puppies",
      "/consultation",
      "/essentials",
      "/contact",
      "/upcoming-litters",
      "/breeds",
      "/faq",
      "/dreamy-reviews",
      "/training-plan",
      "/about",
      "/our-dogs",
    ]);

    for (const route of PUBLIC_SEO_ROUTES) {
      expect(route.title.length).toBeGreaterThan(0);
      expect(route.description.length).toBeGreaterThan(0);
      expect(route.robots).toBeUndefined();
    }
  });

  it("marks admin and 404 routes as noindex", () => {
    expect(SEO_ROUTE_CONFIG.admin.robots).toBe(NOINDEX_ROBOTS);
    expect(SEO_ROUTE_CONFIG.adminLogin.robots).toBe(NOINDEX_ROBOTS);
    expect(SEO_ROUTE_CONFIG.notFound.robots).toBe(NOINDEX_ROBOTS);
  });

  it("does not mention French Bulldog in public SEO copy", () => {
    const serialized = JSON.stringify(SEO_ROUTE_CONFIG);
    expect(serialized).not.toContain("French Bulldog");
  });
});

describe("private page seo", () => {
  it("exposes noindex metadata for buyer flows", () => {
    expect(NOINDEX_PRIVATE_SEO.robots).toBe(NOINDEX_ROBOTS);
    const meta = resolveSeoMetadata({
      title: NOINDEX_PRIVATE_SEO.title,
      description: NOINDEX_PRIVATE_SEO.description,
      robots: NOINDEX_PRIVATE_SEO.robots,
      canonicalPath: "/deposit",
      currentOrigin: "https://puppyheavenllc.com",
    });
    expect(meta.robots).toBe("noindex,nofollow");
    expect(meta.title).toContain("Private Puppy Reservation");
  });
});

describe("faq json-ld helpers", () => {
  it("builds FAQPage schema with sanitized answers", () => {
    const payload = buildFaqPageJsonLd([
      { question: "How much is the deposit?", answer: "The deposit is **$300**.\nSee FAQ." },
    ]) as { mainEntity: Array<{ acceptedAnswer: { text: string } }> };
    expect(payload["@type"]).toBe("FAQPage");
    expect(payload.mainEntity).toHaveLength(1);
    expect(payload.mainEntity[0].acceptedAnswer.text).toBe(
      sanitizeFaqAnswerForJsonLd("The deposit is **$300**.\nSee FAQ.")
    );
  });

  it("renders an empty string when there are no FAQ items", () => {
    expect(renderFaqPageJsonLd([])).toBe("");
  });
});

describe("seo build helpers", () => {
  it("defaults site url to puppyheavenllc.com when env is missing", () => {
    expect(requireSiteUrlForBuild({ siteUrl: undefined })).toBe(DEFAULT_SITE_URL);
    expect(requireSiteUrlForBuild({ siteUrl: "" })).toBe(DEFAULT_SITE_URL);
  });

  it("strips a trailing slash from the build site url", () => {
    expect(requireSiteUrlForBuild({ siteUrl: "https://example.com/" })).toBe(
      "https://example.com"
    );
  });

  it("emits a noscript body fallback containing the route h1", () => {
    const html = renderRouteBodyFallback("puppies", "https://puppyheavenllc.com");
    expect(html).toContain("<noscript>");
    expect(html).toContain("Available Puppies for Sale");
    expect(html).toContain("/upcoming-litters");
    expect(html).toContain("(321) 697-8864");
  });

  it("emits a generic noscript fallback when the page id is unknown", () => {
    const html = renderRouteBodyFallback(undefined, "https://puppyheavenllc.com");
    expect(html).toContain("<noscript>");
    expect(html).toContain("Dream Puppies");
  });

  it("emits LocalBusiness JSON-LD with the configured site url", () => {
    const html = renderLocalBusinessJsonLd("https://puppyheavenllc.com");
    expect(html).toContain("application/ld+json");
    expect(html).toContain('"@type":"LocalBusiness"');
    expect(html).toContain("https://puppyheavenllc.com/#business");
    expect(html).toContain("Orlando");
    expect(html).toContain("Raeford");
  });

  it("emits BreadcrumbList JSON-LD with sequential positions", () => {
    const html = renderBreadcrumbJsonLd("https://puppyheavenllc.com", [
      { name: "Home", path: "/" },
      { name: "Breeds", path: "/breeds" },
    ]);
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"position":1');
    expect(html).toContain('"position":2');
    expect(html).toContain('"item":"https://puppyheavenllc.com/breeds"');
  });
});

describe("breed seo helpers", () => {
  const sampleBreed = {
    id: "goldendoodle",
    name: "Goldendoodle",
    shortDesc: "Sweet, Loyal, Family-Oriented",
    temperament: "Gentle, Patient, Social, Affectionate",
    hypoallergenic: true,
    size: "Medium-Large",
    weight: "30-70 lbs",
    lifespan: "10-15 years",
  };

  it("builds canonical breed metadata from a breed record", () => {
    const meta = getBreedSeoMetadata(sampleBreed);
    expect(meta.slug).toBe("goldendoodle");
    expect(meta.path).toBe("/breeds/goldendoodle");
    expect(meta.title).toContain("Goldendoodle Puppies for Sale");
    expect(meta.title).toContain("Orlando");
    expect(meta.description).toContain("Goldendoodle puppies");
    expect(meta.description).toContain("hypoallergenic");
    expect(meta.description).toContain("(321) 697-8864");
    expect(meta.h1).toContain("Goldendoodle Puppies");
  });

  it("omits the hypoallergenic note for non-hypoallergenic breeds", () => {
    const meta = getBreedSeoMetadata({ ...sampleBreed, hypoallergenic: false });
    expect(meta.description).not.toContain("hypoallergenic");
  });

  it("emits a breed noscript fallback with cross-links and traits", () => {
    const meta = getBreedSeoMetadata(sampleBreed);
    const html = renderBreedBodyFallback(sampleBreed, meta, "https://puppyheavenllc.com");
    expect(html).toContain("<noscript>");
    // h1 contains "&", which is HTML-escaped to "&amp;" in the rendered output.
    expect(html).toContain("Goldendoodle Puppies");
    expect(html).toContain("Family-Raised in Orlando, FL &amp; Raeford, NC");
    expect(html).toContain("View available Goldendoodle puppies");
    expect(html).toContain("Hypoallergenic");
    expect(html).toContain("/upcoming-litters");
    expect(html).toContain("(321) 697-8864");
  });

  it("emits Article JSON-LD pointing at the canonical breed URL", () => {
    const meta = getBreedSeoMetadata(sampleBreed);
    const html = renderBreedJsonLd(sampleBreed, meta, "https://puppyheavenllc.com");
    expect(html).toContain("application/ld+json");
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"@id":"https://puppyheavenllc.com/breeds/goldendoodle"');
    expect(html).toContain("Goldendoodle dog breed");
  });
});
