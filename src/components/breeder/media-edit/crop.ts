// Canvas-based crop + rotate, driven by react-easy-crop's onCropComplete.
//
// react-easy-crop only reports *where* the crop rectangle sits over the
// source image (in source-pixel coordinates, post-rotation) — it never
// touches pixels itself. Extracting the actual image is the standard
// two-canvas dance from the library's own docs: draw the rotated full image
// onto an oversized canvas, read out the crop rectangle, draw that onto a
// second canvas sized to the final output.

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The three presets the edit sheet offers. `null` means free-form. */
export type CropAspect = "square" | "portrait" | "free";

export const CROP_ASPECT_RATIO: Record<Exclude<CropAspect, "free">, number> = {
  square: 1,
  portrait: 4 / 5,
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for cropping"));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Bounding box of the source image once rotated, so nothing gets clipped
 *  when we draw it onto the working canvas. */
function rotatedSize(width: number, height: number, rotationDeg: number) {
  const rad = degreesToRadians(rotationDeg);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/**
 * Produce the cropped, rotated image as a File.
 *
 * @param sourceUrl the object URL / http URL of the image being edited
 * @param croppedAreaPixels the Area react-easy-crop reported via onCropComplete
 * @param rotationDeg 0/90/180/270 (or any angle the user dialed in)
 * @param mimeType output format — jpeg for photos with no transparency need
 */
export async function cropImage(
  sourceUrl: string,
  croppedAreaPixels: CropArea,
  rotationDeg: number,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<File> {
  const image = await loadImage(sourceUrl);

  const { width: rotW, height: rotH } = rotatedSize(image.width, image.height, rotationDeg);

  const working = document.createElement("canvas");
  working.width = rotW;
  working.height = rotH;
  const workingCtx = working.getContext("2d");
  if (!workingCtx) throw new Error("Canvas 2D context unavailable");

  workingCtx.translate(rotW / 2, rotH / 2);
  workingCtx.rotate(degreesToRadians(rotationDeg));
  workingCtx.translate(-image.width / 2, -image.height / 2);
  workingCtx.drawImage(image, 0, 0);

  const output = document.createElement("canvas");
  output.width = Math.round(croppedAreaPixels.width);
  output.height = Math.round(croppedAreaPixels.height);
  const outputCtx = output.getContext("2d");
  if (!outputCtx) throw new Error("Canvas 2D context unavailable");

  outputCtx.drawImage(
    working,
    Math.round(croppedAreaPixels.x),
    Math.round(croppedAreaPixels.y),
    Math.round(croppedAreaPixels.width),
    Math.round(croppedAreaPixels.height),
    0,
    0,
    Math.round(croppedAreaPixels.width),
    Math.round(croppedAreaPixels.height),
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    output.toBlob(resolve, mimeType, 0.92),
  );
  if (!blob) throw new Error("Failed to encode cropped image");

  const ext = mimeType === "image/png" ? "png" : "jpg";
  return new File([blob], `cropped.${ext}`, { type: mimeType });
}
