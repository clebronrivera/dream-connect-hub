import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_SEO_ROUTES, getPageTitle } from "../src/lib/seo";

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

    assertIncludes(html, `<title>${getPageTitle(route.title)}</title>`, `${route.path} title`);
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
    assertIncludes(html, `<meta property="og:title" content="${getPageTitle(route.title)}"`, `${route.path} og:title`);
    assertIncludes(
      html,
      `<meta name="twitter:description" content="${route.description}"`,
      `${route.path} twitter:description`
    );
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
