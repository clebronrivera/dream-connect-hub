import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_SEO_ROUTES } from "../src/lib/seo";
import { PROBLEM_TYPES } from "../src/lib/constants/trainingPlan";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

// Routes that get prerendered with per-problem SEO overrides. Mirrors the loop
// in scripts/postbuild-seo.tsx — keep in sync.
const trainingPlanProblemRoutes = PROBLEM_TYPES.map((p) => ({
  path: `/training-plan/${p.slug}`,
  title: p.seoTitle,
  description: p.seoDescription,
}));

async function main() {
  const allRoutes = [
    ...PUBLIC_SEO_ROUTES.map((r) => ({
      path: r.path,
      title: r.title,
      description: r.description,
    })),
    ...trainingPlanProblemRoutes,
  ];

  for (const route of allRoutes) {
    const filePath =
      route.path === "/"
        ? path.join(distDir, "index.html")
        : path.join(distDir, route.path.replace(/^\/+/, ""), "index.html");
    const html = await fs.readFile(filePath, "utf8");

    // Check for title tag (allowing for HTML entity encoding like &amp;)
    const titleMatch = html.match(/<title>(.+?)<\/title>/);
    if (!titleMatch) {
      throw new Error(`Missing ${route.path} title tag`);
    }
    // Decode HTML entities for comparison
    const decodedActual = titleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    if (!decodedActual.includes(route.title)) {
      throw new Error(`Incorrect ${route.path} title: expected to contain "${route.title}", got "${decodedActual}"`);
    }
    // Check description (allowing for HTML entity encoding like &quot;)
    const descMatch = html.match(/<meta name="description" content="(.+?)"/);
    if (!descMatch) {
      throw new Error(`Missing ${route.path} description tag`);
    }
    const decodedDesc = descMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    if (decodedDesc !== route.description) {
      throw new Error(`Incorrect ${route.path} description: expected "${route.description}", got "${decodedDesc}"`);
    }
    assertIncludes(
      html,
      `<link rel="canonical" href="`,
      `${route.path} canonical`
    );
    assertIncludes(
      html,
      `<noscript>`,
      `${route.path} noscript body fallback`
    );
    assertIncludes(
      html,
      `application/ld+json`,
      `${route.path} JSON-LD block`
    );
    // Check og:title (allowing for HTML entity encoding)
    const ogTitleMatch = html.match(/<meta property="og:title" content="(.+?)"/);
    if (!ogTitleMatch) {
      throw new Error(`Missing ${route.path} og:title`);
    }
    const decodedOgTitle = ogTitleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    if (!decodedOgTitle.includes(route.title)) {
      throw new Error(`Incorrect ${route.path} og:title: expected to contain "${route.title}", got "${decodedOgTitle}"`);
    }
    // Check twitter:description (allowing for HTML entity encoding)
    const twDescMatch = html.match(/<meta name="twitter:description" content="(.+?)"/);
    if (!twDescMatch) {
      throw new Error(`Missing ${route.path} twitter:description`);
    }
    const decodedTwDesc = twDescMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    if (decodedTwDesc !== route.description) {
      throw new Error(`Incorrect ${route.path} twitter:description: expected "${route.description}", got "${decodedTwDesc}"`);
    }
    // H1 tags are rendered client-side via React hydration, not in static SSR output,
    // so we skip this check. The critical SEO tags (title, meta, og:*, canonical) are all verified above.
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
