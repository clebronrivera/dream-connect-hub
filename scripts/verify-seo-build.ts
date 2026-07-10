import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Node < 22 has no global WebSocket. supabase-js 2.106's realtime-js throws at
// `createClient` time if no WebSocket constructor exists — which crashes this
// script the moment it reads puppy data through the lazy Supabase client. This
// script only READS via PostgREST and never opens a realtime channel, so a
// no-op constructor satisfies realtime-js's existence check. Mirrors the same
// guard in scripts/postbuild-seo.tsx.
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

import {
  NOINDEX_PRIVATE_SEO,
  PUBLIC_SEO_ROUTES,
  SEO_ROUTE_CONFIG,
  getBreedSeoMetadata,
  getPuppySeoMetadata,
  getBreedLocationSeoMetadata,
} from "../src/lib/seo";
import { BREEDS_DATA } from "../src/data/breeds-content";
import { SERVICE_LOCATIONS, LOCATION_BREEDS } from "../src/data/locations-content";
import { PROBLEM_TYPES } from "../src/lib/constants/trainingPlan";
import { fetchPuppiesForPrerender, fetchNonPublicPuppySlugsForVerify } from "../src/lib/puppies-api";
import { getPuppyMediaList } from "../src/lib/puppy-display-utils";

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

const breedLocationRoutes = LOCATION_BREEDS.flatMap((breed) =>
  SERVICE_LOCATIONS.map((location) => {
    const meta = getBreedLocationSeoMetadata({
      breedSlug: breed.slug,
      breedDisplayName: breed.displayName,
      locationSlug: location.slug,
      city: location.city,
      state: location.state,
    });
    return { path: meta.path, title: meta.title, description: meta.description };
  })
);

async function main() {
  const puppies = await fetchPuppiesForPrerender();
  const puppyRoutes = puppies
    .filter((p) => !!p.slug)
    .map((p) => {
      const { photos } = getPuppyMediaList(p);
      const meta = getPuppySeoMetadata({
        slug: p.slug!,
        name: p.name,
        breed: p.breed,
        generation: p.generation,
        status: p.status,
        readyDate: p.ready_date,
        primaryImage: photos[0] ?? null,
      });
      return { path: meta.path, title: meta.title, description: meta.description, h1: meta.h1 };
    });

  const allRoutes = [
    ...PUBLIC_SEO_ROUTES.map((r) => ({
      path: r.path,
      title: r.title,
      description: r.description,
    })),
    ...trainingPlanProblemRoutes,
    ...breedRoutes,
    ...puppyRoutes,
    ...breedLocationRoutes,
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

  // City x breed pages: each needs >=400 words of body text (not a thin doorway
  // page) and must not read as a near-duplicate of any other location. Doorway-page
  // detection in practice (and Google's own near-duplicate detection) is phrase-level,
  // not bag-of-words — two honest paragraphs about the same breed necessarily share
  // most individual words, so a single-word Jaccard check would flag genuinely distinct
  // prose as "too similar". 4-word shingles catch actual copy-pasted/templated
  // sentences while tolerating shared vocabulary.
  {
    const bodyTextByPath = new Map<string, string>();
    for (const route of breedLocationRoutes) {
      const html = await fs.readFile(
        path.join(distDir, route.path.replace(/^\/+/, ""), "index.html"),
        "utf8"
      );
      const h1Match = html.match(/<h1>(.+?)<\/h1>/);
      if (!h1Match || !h1Match[1].trim()) {
        throw new Error(`Missing or empty ${route.path} h1`);
      }
      const noscriptMatch = html.match(/<noscript>([\s\S]*?)<\/noscript>/);
      if (!noscriptMatch) {
        throw new Error(`Missing ${route.path} noscript body`);
      }
      const bodyText = noscriptMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const wordCount = bodyText.split(" ").filter(Boolean).length;
      if (wordCount < 400) {
        throw new Error(
          `${route.path} body is only ${wordCount} words; needs >=400 for genuinely location-specific content`
        );
      }
      bodyTextByPath.set(route.path, bodyText);
      assertIncludes(html, '"@type":"LocalBusiness"', `${route.path} LocalBusiness JSON-LD`);
    }

    const shingles = (text: string, n = 4): Set<string> => {
      const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
      const result = new Set<string>();
      for (let i = 0; i <= words.length - n; i++) {
        result.add(words.slice(i, i + n).join(" "));
      }
      return result;
    };
    const paths = [...bodyTextByPath.keys()];
    const shingleSets = new Map(paths.map((p) => [p, shingles(bodyTextByPath.get(p)!)]));
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const a = shingleSets.get(paths[i])!;
        const b = shingleSets.get(paths[j])!;
        const intersection = [...a].filter((s) => b.has(s)).length;
        const union = new Set([...a, ...b]).size;
        const similarity = union === 0 ? 0 : intersection / union;
        if (similarity > 0.4) {
          throw new Error(
            `${paths[i]} and ${paths[j]} are too similar (${Math.round(similarity * 100)}% phrase overlap; ` +
              `need >=60% different, i.e. <=40% overlap)`
          );
        }
      }
    }
  }

  if (supabaseConfigured) {
    for (const route of puppyRoutes) {
      const html = await fs.readFile(
        path.join(distDir, route.path.replace(/^\/+/, ""), "index.html"),
        "utf8"
      );
      const h1Match = html.match(/<h1>(.+?)<\/h1>/);
      if (!h1Match || !h1Match[1].trim()) {
        throw new Error(`Missing or empty ${route.path} h1`);
      }
      assertIncludes(html, '"@type":"Product"', `${route.path} Product JSON-LD`);
    }

    const nonPublicSlugs = await fetchNonPublicPuppySlugsForVerify();
    for (const slug of nonPublicSlugs) {
      const filePath = path.join(distDir, "puppies", slug, "index.html");
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        throw new Error(
          `Sold/Deceased/Pending puppy "${slug}" must not have a prerendered page: ${filePath}`
        );
      }
    }
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
