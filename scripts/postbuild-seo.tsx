import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";
import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const distIndexPath = path.join(distDir, "index.html");

loadDotEnv({ path: path.join(projectRoot, ".env.local"), override: false });
loadDotEnv({ path: path.join(projectRoot, ".env"), override: false });

// Node < 22 has no global WebSocket. supabase-js 2.106's realtime-js throws at
// `createClient` time if no WebSocket constructor exists — which crashes this
// SEO prerender the moment it first reads data (e.g. FAQ JSON-LD) through the
// lazy Supabase client. This prerender only READS via PostgREST and never opens
// a realtime channel, so a no-op constructor satisfies realtime-js's existence
// check without pulling in `ws`. Belt to the netlify.toml/CI Node-22 suspenders,
// so the build is correct even if the runner is pinned to Node 20.
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  class SsrNoopWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  }
  (globalThis as { WebSocket?: unknown }).WebSocket = SsrNoopWebSocket;
}

async function main() {
  const {
    PUBLIC_SEO_ROUTES,
    renderStaticSeoTags,
    requireSiteUrlForBuild,
    resolveSeoMetadata,
    renderRouteBodyFallback,
    renderLocalBusinessJsonLd,
    renderBreadcrumbJsonLd,
    getBreedSeoMetadata,
    renderBreedBodyFallback,
    renderBreedJsonLd,
    renderFaqPageJsonLd,
    NOINDEX_PRIVATE_PRERENDER_ROUTES,
    renderPrivateNoindexBodyFallback,
    getPuppySeoMetadata,
    renderPuppyBodyFallback,
    renderPuppyJsonLd,
    getBreedLocationSeoMetadata,
    renderBreedLocationBodyFallback,
  } = await import("../src/lib/seo");
  const { BREEDS_DATA } = await import("../src/data/breeds-content");
  const { SERVICE_LOCATIONS, LOCATION_BREEDS } = await import("../src/data/locations-content");
  const { appEnv } = await import("../src/lib/env");
  const { fetchPuppiesForPrerender } = await import("../src/lib/puppies-api");
  const { getPuppyMediaList } = await import("../src/lib/puppy-display-utils");

  // requireSiteUrlForBuild now falls back to https://puppyheavenllc.com when
  // VITE_SITE_URL is not set, so the SEO output is always produced. The
  // postbuild MUST emit per-route HTML + sitemap.xml + robots.txt on every
  // deploy — silent skip = crawlers see empty body = zero indexed pages.
  const siteUrl = requireSiteUrlForBuild();

  const supabaseConfigured = Boolean(
    appEnv.supabaseUrl?.trim() && appEnv.supabaseAnonKey?.trim()
  );
  if (!supabaseConfigured) {
    console.warn(
      "[postbuild-seo] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set. " +
        "Continuing with static HTML emission only — body SSR will be skipped " +
        "for any route that requires runtime data."
    );
  }

  const { PROBLEM_TYPES } = await import("../src/lib/constants/trainingPlan");
  const template = await fs.readFile(distIndexPath, "utf8");

  const renderModules = supabaseConfigured
    ? {
        AppProviders: (await import("../src/App")).AppProviders,
        AppRoutes: (await import("../src/App")).AppRoutes,
        createAppQueryClient: (await import("../src/lib/query-client")).createAppQueryClient,
      }
    : null;

  for (const route of PUBLIC_SEO_ROUTES) {
    const metadata = resolveSeoMetadata({
      pageId: route.pageId,
      canonicalPath: route.path,
      currentOrigin: siteUrl,
    });
    const seoTags = renderStaticSeoTags(metadata);
    const bodyFallback = renderRouteBodyFallback(route.pageId, siteUrl);
    const jsonLdBlocks: string[] = [];
    if (route.pageId === "home") {
      jsonLdBlocks.push(renderLocalBusinessJsonLd(siteUrl));
    } else {
      jsonLdBlocks.push(
        renderBreadcrumbJsonLd(siteUrl, [
          { name: "Home", path: "/" },
          { name: route.title, path: route.path },
        ])
      );
    }
    if (route.pageId === "faq" && supabaseConfigured) {
      const { fetchActiveFaqItems } = await import("../src/lib/faq-api");
      const faqItems = await fetchActiveFaqItems();
      const faqLd = renderFaqPageJsonLd(faqItems);
      if (faqLd) jsonLdBlocks.push(faqLd);
    }
    const html = renderRouteHtml(template, route.path, seoTags, bodyFallback, jsonLdBlocks, renderModules);
    await writeRouteHtml(route.path, html);
  }

  for (const route of NOINDEX_PRIVATE_PRERENDER_ROUTES) {
    const metadata = resolveSeoMetadata({
      title: route.title,
      description: route.description,
      canonicalPath: route.path,
      robots: route.robots,
      currentOrigin: siteUrl,
    });
    const seoTags = renderStaticSeoTags(metadata);
    const bodyFallback = renderPrivateNoindexBodyFallback();
    const html = renderRouteHtml(template, route.path, seoTags, bodyFallback, [], null);
    await writeRouteHtml(route.path, html);
  }

  // Prerender each /training-plan/:slug page with its problem-specific SEO.
  // The TrainingPlanPage component overrides title/description from PROBLEM_TYPES;
  // we mirror that override here so static HTML matches the client-side metadata.
  const extraPaths: string[] = [];
  for (const problem of PROBLEM_TYPES) {
    const routePath = `/training-plan/${problem.slug}`;
    const metadata = resolveSeoMetadata({
      pageId: "trainingPlan",
      title: problem.seoTitle,
      description: problem.seoDescription,
      canonicalPath: routePath,
      currentOrigin: siteUrl,
    });
    const seoTags = renderStaticSeoTags(metadata);
    const bodyFallback = renderRouteBodyFallback("trainingPlan", siteUrl);
    const jsonLdBlocks = [
      renderBreadcrumbJsonLd(siteUrl, [
        { name: "Home", path: "/" },
        { name: "Training Plan", path: "/training-plan" },
        { name: problem.seoTitle, path: routePath },
      ]),
    ];
    const html = renderRouteHtml(template, routePath, seoTags, bodyFallback, jsonLdBlocks, renderModules);
    await writeRouteHtml(routePath, html);
    extraPaths.push(routePath);
  }

  // Per-breed pages — one prerendered HTML + sitemap entry per breed in
  // src/data/breeds-content.ts. Each breed gets a unique title, description,
  // canonical, noscript body, BreadcrumbList, and Article JSON-LD.
  const breedPaths: string[] = [];
  for (const breed of BREEDS_DATA) {
    const breedMeta = getBreedSeoMetadata(breed);
    const metadata = resolveSeoMetadata({
      pageId: "breeds",
      title: breedMeta.title,
      description: breedMeta.description,
      canonicalPath: breedMeta.path,
      currentOrigin: siteUrl,
    });
    const seoTags = renderStaticSeoTags(metadata);
    const bodyFallback = renderBreedBodyFallback(breed, breedMeta, siteUrl);
    const jsonLdBlocks = [
      renderBreadcrumbJsonLd(siteUrl, [
        { name: "Home", path: "/" },
        { name: "Breeds", path: "/breeds" },
        { name: breed.name, path: breedMeta.path },
      ]),
      renderBreedJsonLd(breed, breedMeta, siteUrl),
    ];
    const html = renderRouteHtml(template, breedMeta.path, seoTags, bodyFallback, jsonLdBlocks, renderModules);
    await writeRouteHtml(breedMeta.path, html);
    breedPaths.push(breedMeta.path);
  }

  // Per-puppy pages — one prerendered HTML + sitemap entry per Available/Reserved
  // puppy. Sold/Deceased/Pending puppies are excluded by fetchPuppiesForPrerender
  // so no stale page stays indexable. Degrades to an empty list (not a throw)
  // when Supabase env isn't configured, same as the rest of this script.
  const puppyPaths: string[] = [];
  const puppies = await fetchPuppiesForPrerender();
  for (const puppy of puppies) {
    if (!puppy.slug) continue;
    const { photos } = getPuppyMediaList(puppy);
    const puppySeoSource = {
      slug: puppy.slug,
      name: puppy.name,
      breed: puppy.breed,
      generation: puppy.generation,
      status: puppy.status,
      readyDate: puppy.ready_date,
      primaryImage: photos[0] ?? null,
    };
    const puppyMeta = getPuppySeoMetadata(puppySeoSource);
    const metadata = resolveSeoMetadata({
      pageId: "puppies",
      title: puppyMeta.title,
      description: puppyMeta.description,
      canonicalPath: puppyMeta.path,
      imageUrl: photos[0] ?? undefined,
      currentOrigin: siteUrl,
    });
    const seoTags = renderStaticSeoTags(metadata);
    const bodyFallback = renderPuppyBodyFallback(puppySeoSource, puppyMeta, siteUrl);
    const jsonLdBlocks = [
      renderBreadcrumbJsonLd(siteUrl, [
        { name: "Home", path: "/" },
        { name: "Available Puppies", path: "/puppies" },
        { name: puppy.name, path: puppyMeta.path },
      ]),
      renderPuppyJsonLd(puppySeoSource, puppyMeta, siteUrl),
    ];
    const html = renderRouteHtml(template, puppyMeta.path, seoTags, bodyFallback, jsonLdBlocks, renderModules);
    await writeRouteHtml(puppyMeta.path, html);
    puppyPaths.push(puppyMeta.path);
  }

  // City x breed landing pages (Phase 4) — mini-goldendoodle x all 7 service
  // locations for now (LOCATION_BREEDS). Each carries its own LocalBusiness
  // JSON-LD (areaServed scoped to that city) plus hand-written, per-location
  // body copy from locations-content.ts so pages aren't near-duplicate doorway
  // pages.
  const breedLocationPaths: string[] = [];
  for (const breed of LOCATION_BREEDS) {
    for (const location of SERVICE_LOCATIONS) {
      const blMeta = getBreedLocationSeoMetadata({
        breedSlug: breed.slug,
        breedDisplayName: breed.displayName,
        locationSlug: location.slug,
        city: location.city,
        state: location.state,
      });
      const metadata = resolveSeoMetadata({
        title: blMeta.title,
        description: blMeta.description,
        canonicalPath: blMeta.path,
        currentOrigin: siteUrl,
      });
      const seoTags = renderStaticSeoTags(metadata);
      const bodyFallback = renderBreedLocationBodyFallback(location, blMeta, siteUrl);
      const jsonLdBlocks = [
        renderBreadcrumbJsonLd(siteUrl, [
          { name: "Home", path: "/" },
          { name: "Available Puppies", path: "/puppies" },
          { name: blMeta.h1, path: blMeta.path },
        ]),
        renderLocalBusinessJsonLd(siteUrl, { city: location.city, state: location.state }),
      ];
      const html = renderRouteHtml(template, blMeta.path, seoTags, bodyFallback, jsonLdBlocks, renderModules);
      await writeRouteHtml(blMeta.path, html);
      breedLocationPaths.push(blMeta.path);
    }
  }

  const sitemapRoutes = [
    ...PUBLIC_SEO_ROUTES.map((r) => ({ path: r.path })),
    ...extraPaths.map((p) => ({ path: p })),
    ...breedPaths.map((p) => ({ path: p })),
    ...puppyPaths.map((p) => ({ path: p, changefreq: "weekly" as const, priority: 0.8 })),
    ...breedLocationPaths.map((p) => ({ path: p, changefreq: "weekly" as const, priority: 0.7 })),
  ];
  await fs.writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(siteUrl, sitemapRoutes), "utf8");
  await fs.writeFile(path.join(distDir, "robots.txt"), buildRobots(siteUrl), "utf8");
}

type RenderModules = {
  AppProviders: typeof import("../src/App").AppProviders;
  AppRoutes: typeof import("../src/App").AppRoutes;
  createAppQueryClient: typeof import("../src/lib/query-client").createAppQueryClient;
};

function renderRouteHtml(
  template: string,
  routePath: string,
  seoTags: string,
  bodyFallback: string,
  jsonLdBlocks: ReadonlyArray<string>,
  modules: RenderModules | null
): string {
  let appHtml = "";
  if (modules) {
    const { AppProviders, AppRoutes, createAppQueryClient } = modules;
    try {
      appHtml = renderToString(
        <AppProviders queryClient={createAppQueryClient()}>
          <StaticRouter location={routePath}>
            <AppRoutes />
          </StaticRouter>
        </AppProviders>
      );
    } catch {
      // React.lazy components cannot be rendered synchronously via renderToString.
      // SEO tags + body fallback below carry the crawler payload; the live React
      // app fully renders on hydration.
      console.warn(`  [postbuild] SSR body skipped for ${routePath} (lazy route); fallback body injected.`);
    }
  }

  let html = stripManagedHeadTags(template);
  html = stripExistingNoscript(html);
  if (appHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
  }
  html = html.replace("</head>", `${seoTags}${jsonLdBlocks.join("")}</head>`);
  // Inject body fallback right after #root so crawlers without JS see real
  // content. JS-enabled browsers ignore <noscript> entirely, so there's no
  // hydration mismatch risk.
  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>/,
    (match) => `${match}\n    ${bodyFallback}`
  );

  return html;
}

function stripManagedHeadTags(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta[^>]+name="description"[^>]*>\s*/gi, "")
    .replace(/<meta[^>]+name="author"[^>]*>\s*/gi, "")
    .replace(/<meta[^>]+name="robots"[^>]*>\s*/gi, "")
    .replace(/<meta[^>]+name="googlebot"[^>]*>\s*/gi, "")
    .replace(/<meta[^>]+name="twitter:[^"]+"[^>]*>\s*/gi, "")
    .replace(/<meta[^>]+property="og:[^"]+"[^>]*>\s*/gi, "")
    .replace(/<link[^>]+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<script[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/gi, "");
}

function stripExistingNoscript(html: string): string {
  return html.replace(/<noscript>[\s\S]*?<\/noscript>\s*/gi, "");
}

async function writeRouteHtml(routePath: string, html: string) {
  const normalized = routePath === "/" ? "" : routePath.replace(/^\/+/, "");
  const outputPath = normalized
    ? path.join(distDir, normalized, "index.html")
    : distIndexPath;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, "utf8");
}

function buildSitemap(
  siteUrl: string,
  routes: ReadonlyArray<{ path: string; changefreq?: string; priority?: number }>
): string {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = routes
    .map(({ path: routePath, changefreq, priority }) => {
      const loc = `${siteUrl}${routePath === "/" ? "/" : routePath}`;
      const changefreqTag = changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : "";
      const priorityTag = priority != null ? `\n    <priority>${priority}</priority>` : "";
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>${changefreqTag}${priorityTag}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobots(siteUrl: string): string {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /breeder
Disallow: /breeder/
Disallow: /payment/
Disallow: /agreements/
Disallow: /deposit
Disallow: /request-deposit
Disallow: /__mockup/

Sitemap: ${siteUrl}/sitemap.xml
`;
}

main().catch((error) => {
  console.error("SEO postbuild failed.");
  console.error(error);
  process.exitCode = 1;
});
