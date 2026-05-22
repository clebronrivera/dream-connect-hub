import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_URL,
  NOINDEX_ROBOTS,
  PUBLIC_SEO_ROUTES,
  SEO_ROUTE_CONFIG,
  buildCanonicalUrl,
  getPageTitle,
  normalizeCanonicalPath,
  normalizePublicAssetUrl,
  renderBreadcrumbJsonLd,
  renderLocalBusinessJsonLd,
  renderRouteBodyFallback,
  requireSiteUrlForBuild,
  resolveSocialImageUrl,
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

  it("falls back to the local logo image when no explicit banner is configured", () => {
    expect(
      resolveSocialImageUrl({
        siteUrl: "https://puppyheaven.example/",
        supabaseUrl: "https://project.supabase.co/",
      })
    ).toBe(
      "https://puppyheaven.example/dream-puppies-logo.png"
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
