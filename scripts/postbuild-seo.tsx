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

async function main() {
  // Load only env + seo first so we can skip without pulling in App (and thus Supabase).
  const {
    PUBLIC_SEO_ROUTES,
    renderStaticSeoTags,
    requireSiteUrlForBuild,
    resolveSeoMetadata,
  } = await import("../src/lib/seo");
  const { appEnv } = await import("../src/lib/env");

  let siteUrl: string;
  try {
    siteUrl = requireSiteUrlForBuild();
  } catch (error) {
    console.warn("Skipping SEO postbuild.");
    console.warn((error as Error).message);
    return;
  }

  if (!appEnv.supabaseUrl?.trim() || !appEnv.supabaseAnonKey?.trim()) {
    console.warn("Skipping SEO postbuild. Missing Supabase config.");
    console.warn(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify (and VITE_SITE_URL) to enable pre-render."
    );
    return;
  }

  const { AppProviders, AppRoutes } = await import("../src/App");
  const { createAppQueryClient } = await import("../src/lib/query-client");
  const template = await fs.readFile(distIndexPath, "utf8");

  for (const route of PUBLIC_SEO_ROUTES) {
    const metadata = resolveSeoMetadata({
      pageId: route.pageId,
      canonicalPath: route.path,
      currentOrigin: siteUrl,
    });
    const html = renderRouteHtml(template, route.path, renderStaticSeoTags(metadata), {
      AppProviders,
      AppRoutes,
      createAppQueryClient,
    });
    await writeRouteHtml(route.path, html);
  }

  await fs.writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(siteUrl, PUBLIC_SEO_ROUTES), "utf8");
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
  modules: RenderModules
): string {
  const { AppProviders, AppRoutes, createAppQueryClient } = modules;

  const appHtml = renderToString(
    <AppProviders queryClient={createAppQueryClient()}>
      <StaticRouter location={routePath}>
        <AppRoutes />
      </StaticRouter>
    </AppProviders>
  );

  let html = stripManagedHeadTags(template);
  html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
  html = html.replace("</head>", `${seoTags}</head>`);

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
    .replace(/<link[^>]+rel="canonical"[^>]*>\s*/gi, "");
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
  routes: ReadonlyArray<{ path: string }>
): string {
  const urls = routes.map(
    ({ path: routePath }) => `  <url><loc>${siteUrl}${routePath === "/" ? "/" : routePath}</loc></url>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobots(siteUrl: string): string {
  return `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
}

main().catch((error) => {
  const msg = (error && (error as Error).message) || String(error);
  if (msg.includes("Missing Supabase config") || msg.includes("VITE_SUPABASE")) {
    console.warn("Skipping SEO postbuild. Missing Supabase config.");
    console.warn(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify (and VITE_SITE_URL) to enable pre-render."
    );
    process.exitCode = 0;
    return;
  }
  console.error("SEO postbuild failed.");
  console.error(error);
  process.exitCode = 1;
});
