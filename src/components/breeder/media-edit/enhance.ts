// "Auto-enhance" — a fixed, subtle canvas filter. Deliberately not an
// adjustable slider set: the operator is snapping photos of puppies all day
// and wants a one-tap improvement, not a photo editor with knobs. The values
// below are tuned to correct the flat, slightly-dim look of indoor phone
// shots without making the fix obvious.

const BRIGHTNESS = 1.06;
const CONTRAST = 1.08;
const SATURATION = 1.12;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for enhancement"));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

/** Apply the fixed enhance filter and return the result as a File. Canvas
 *  `filter` support is universal in the browsers this app targets, so this
 *  stays a plain 2D-context draw rather than a manual pixel-by-pixel pass. */
export async function enhanceImage(
  sourceUrl: string,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<File> {
  const image = await loadImage(sourceUrl);

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.filter = `brightness(${BRIGHTNESS}) contrast(${CONTRAST}) saturate(${SATURATION})`;
  ctx.drawImage(image, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
  if (!blob) throw new Error("Failed to encode enhanced image");

  const ext = mimeType === "image/png" ? "png" : "jpg";
  return new File([blob], `enhanced.${ext}`, { type: mimeType });
}
