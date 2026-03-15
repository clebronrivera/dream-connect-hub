import { describe, expect, it } from "vitest";
import {
  NOINDEX_ROBOTS,
  PUBLIC_SEO_ROUTES,
  SEO_ROUTE_CONFIG,
  buildCanonicalUrl,
  getPageTitle,
  normalizeCanonicalPath,
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

  it("falls back to the Supabase banner image when no explicit banner is configured", () => {
    expect(
      resolveSocialImageUrl({
        supabaseUrl: "https://project.supabase.co/",
      })
    ).toBe(
      "https://project.supabase.co/storage/v1/object/public/site-assets/banner-puppies.png.jpeg"
    );
  });

  it("returns the expected page title format", () => {
    expect(getPageTitle("Puppy Heaven")).toBe("Puppy Heaven");
    expect(getPageTitle("Available Puppies")).toBe("Available Puppies | Puppy Heaven");
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
