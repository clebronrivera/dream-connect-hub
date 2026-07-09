// Manual, one-off optimizer for public/*.{jpg,jpeg,png} — not part of the build.
// For each source image, emits a same-name .webp sibling and re-encodes the
// original in place at quality 80. Run via `npm run optimize:images` whenever
// a new heavy image lands in public/.
import { readdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const QUALITY = 80;

// og-image.jpg is consumed only as og:image/twitter:image meta content, never
// via <picture>. Some link-preview scrapers don't accept WebP, so it stays JPEG-only.
const SKIP_WEBP = new Set(["og-image.jpg"]);

// dream-puppies-logo.png ships at 1024x1024 but is only ever rendered as a
// <=40px icon (nav/footer). 256px covers 2x-retina display with headroom to
// spare — re-encoding at full resolution wastes bytes no <picture> can undo.
const MAX_DIMENSION: Record<string, number> = {
  "dream-puppies-logo.png": 256,
};

async function optimizeImage(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);
  const before = (await stat(filePath)).size;
  const maxDimension = MAX_DIMENSION[name];

  const withResize = (img: sharp.Sharp) =>
    maxDimension ? img.resize(maxDimension, maxDimension, { fit: "inside" }) : img;

  let webpNote = "";
  if (!SKIP_WEBP.has(name)) {
    const webpPath = filePath.slice(0, -ext.length) + ".webp";
    const webpBuffer = await withResize(sharp(filePath)).webp({ quality: QUALITY }).toBuffer();
    await writeFile(webpPath, webpBuffer);
    webpNote = ` (+ ${path.basename(webpPath)}: ${(webpBuffer.length / 1024).toFixed(0)}KB)`;
  }

  // PNG needs `palette: true` for real lossy quantization (libimagequant) — the
  // `quality` option alone is a no-op on sharp's default lossless PNG encoder
  // and can even grow the file vs. the source's own compression.
  const reencoded =
    ext === ".png"
      ? await withResize(sharp(filePath))
          .png({ quality: QUALITY, palette: true, compressionLevel: 9 })
          .toBuffer()
      : await withResize(sharp(filePath)).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();

  // Only replace the original if re-encoding actually shrank it — a few source
  // images are already hand-optimized and a naive re-encode can lose that.
  if (reencoded.length < before) {
    await writeFile(filePath, reencoded);
  }

  const after = Math.min(reencoded.length, before);
  console.log(
    `${name}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB${webpNote}`
  );
}

async function main() {
  const entries = await readdir(PUBLIC_DIR);
  const targets = entries.filter((name) => /\.(jpe?g|png)$/i.test(name));

  if (targets.length === 0) {
    console.log("No .jpg/.jpeg/.png files found in public/.");
    return;
  }

  for (const name of targets) {
    await optimizeImage(path.join(PUBLIC_DIR, name));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
