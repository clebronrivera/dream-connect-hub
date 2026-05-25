import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  NOINDEX_PRIVATE_SEO,
  PUBLIC_SEO_ROUTES,
  SEO_ROUTE_CONFIG,
  getBreedSeoMetadata,
} from "../src/lib/seo";
import { BREEDS_DATA } from "../src/data/breeds-content";
import { PROBLEM_TYPES } from "../src/lib/constants/trainingPlan";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

const HOME_PUBLIC_TITLE = SEO_ROUTE_CONFIG.home.title;

const trainingPlanProblemRoutes = PROBLEM_TYPES.map((p) => ({
  path: `/training-plan/${p.slug}`,
  title: p.seoTitle,
  description: p.seoDescription,
}));

const breedRoutes = BREEDS_DATA.map((breed) => {
  const meta = getBreedSeoMetadata(breed);
  return {
    path: meta.path,
    title: meta.title,
    description: meta.description,
  };
});

const NOINDEX_PRIVATE_PATHS = ["/deposit", "/request-deposit"] as const;

async function main() {
  const allRoutes = [
    ...PUBLIC_SEO_ROUTES.map((r) => ({
      path: r.path,
      title: r.title,
      description: r.description,
    })),
    ...trainingPlanProblemRoutes,
    ...breedRoutes,
  ];

  for (const route of allRoutes) {
    const filePath =
      route.path === "/"
        ? path.join(distDir, "index.html")
        : path.join(distDir, route.path.replace(/^\/+/, ""), "index.html");
    const html = await fs.readFile(filePath, "utf8");

    const titleMatch = html.match(/<title>(.+?)<\/title>/);
    if (!titleMatch) {
      throw new Error(`Missing ${route.path} title tag`);
    }
    const decodedActual = titleMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    if (!decodedActual.includes(route.title)) {
      throw new Error(
        `Incorrect ${route.path} title: expected to contain "${route.title}", got "${decodedActual}"`
      );
    }
    const descMatch = html.match(/<meta name="description" content="(.+?)"/);
    if (!descMatch) {
      throw new Error(`Missing ${route.path} description tag`);
    }
    const decodedDesc = descMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    if (decodedDesc !== route.description) {
      throw new Error(
        `Incorrect ${route.path} description: expected "${route.description}", got "${decodedDesc}"`
      );
    }
    assertIncludes(html, `<link rel="canonical" href="`, `${route.path} canonical`);
    assertIncludes(html, `<noscript>`, `${route.path} noscript body fallback`);
    assertIncludes(html, `application/ld+json`, `${route.path} JSON-LD block`);
    const ogTitleMatch = html.match(/<meta property="og:title" content="(.+?)"/);
    if (!ogTitleMatch) {
      throw new Error(`Missing ${route.path} og:title`);
    }
    const decodedOgTitle = ogTitleMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    if (!decodedOgTitle.includes(route.title)) {
      throw new Error(
        `Incorrect ${route.path} og:title: expected to contain "${route.title}", got "${decodedOgTitle}"`
      );
    }
    const twDescMatch = html.match(/<meta name="twitter:description" content="(.+?)"/);
    if (!twDescMatch) {
      throw new Error(`Missing ${route.path} twitter:description`);
    }
    const decodedTwDesc = twDescMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    if (decodedTwDesc !== route.description) {
      throw new Error(
        `Incorrect ${route.path} twitter:description: expected "${route.description}", got "${decodedTwDesc}"`
      );
    }
  }

  for (const routePath of NOINDEX_PRIVATE_PATHS) {
    const html = await fs.readFile(
      path.join(distDir, routePath.replace(/^\/+/, ""), "index.html"),
      "utf8"
    );
    assertIncludes(html, "noindex,nofollow", `${routePath} robots noindex`);
    assertIncludes(
      html,
      NOINDEX_PRIVATE_SEO.title,
      `${routePath} private title`
    );
    if (html.includes(HOME_PUBLIC_TITLE)) {
      throw new Error(
        `${routePath} must not use the public home title "${HOME_PUBLIC_TITLE}"`
      );
    }
  }

  const faqHtml = await fs.readFile(path.join(distDir, "faq", "index.html"), "utf8");
  const supabaseConfigured = Boolean(
    process.env.VITE_SUPABASE_URL?.trim() && process.env.VITE_SUPABASE_ANON_KEY?.trim()
  );
  if (supabaseConfigured) {
    assertIncludes(faqHtml, '"@type":"FAQPage"', "/faq FAQPage JSON-LD");
  }

  const seoSource = await fs.readFile(path.join(projectRoot, "src/lib/seo.ts"), "utf8");
  const indexTemplate = await fs.readFile(path.join(projectRoot, "index.html"), "utf8");
  const puppiesSource = await fs.readFile(
    path.join(projectRoot, "src/pages/Puppies.tsx"),
    "utf8"
  );
  for (const source of [seoSource, indexTemplate, puppiesSource]) {
    if (source.includes("French Bulldog")) {
      throw new Error("French Bulldog must be removed from SEO/static copy sources");
    }
  }

  const sitemap = await fs.readFile(path.join(distDir, "sitemap.xml"), "utf8");
  for (const route of allRoutes) {
    assertIncludes(sitemap, route.path === "/" ? "/" : route.path, `sitemap entry ${route.path}`);
  }

  const robots = await fs.readFile(path.join(distDir, "robots.txt"), "utf8");
  assertIncludes(robots, "Sitemap: ", "robots sitemap reference");

  console.log("SEO build verification passed.");
}

function assertIncludes(content: string, expected: string, label: string) {
  if (!content.includes(expected)) {
    throw new Error(`Missing ${label}: ${expected}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
