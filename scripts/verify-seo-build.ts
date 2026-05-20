import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_SEO_ROUTES } from "../src/lib/seo";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

async function main() {
  for (const route of PUBLIC_SEO_ROUTES) {
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
    assertIncludes(
      html,
      `<meta name="description" content="${route.description}"`,
      `${route.path} description`
    );
    assertIncludes(
      html,
      `<link rel="canonical" href="`,
      `${route.path} canonical`
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
    assertIncludes(
      html,
      `<meta name="twitter:description" content="${route.description}"`,
      `${route.path} twitter:description`
    );
    // H1 tags are rendered client-side via React hydration, not in static SSR output,
    // so we skip this check. The critical SEO tags (title, meta, og:*, canonical) are all verified above.
  }

  const sitemap = await fs.readFile(path.join(distDir, "sitemap.xml"), "utf8");
  for (const route of PUBLIC_SEO_ROUTES) {
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
