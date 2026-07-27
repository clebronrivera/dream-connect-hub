// In-browser background removal via @imgly/background-removal (WASM + ONNX,
// runs entirely on-device — no per-image API cost, no upload of the photo to
// a third party).
//
// Dynamically imported: this module is only ever pulled in from inside
// MediaEditSheet's "Remove background" action, so the ~30KB library and its
// ~40MB model download never touch the base /breeder/photos bundle and only
// happen once the operator actually asks for it.
//
// Cancellation caveat: the library has no way to abort inference once it
// starts. What we CAN do, and do:
//   - abort the model download in flight (the slow part, and the part most
//     likely to be cancelled) via an AbortSignal threaded through fetchArgs
//   - discard the result if cancel was requested after inference finished,
//     so a stale result never reaches the UI
// This is a soft cancel for the compute phase and a real cancel for the
// download phase, which is the best this API surface allows.

import { compressPhoto } from "@/lib/breeder/compressImage";

export type Backdrop = "white" | "lavender" | "transparent";

const BACKDROP_COLOR: Record<Exclude<Backdrop, "transparent">, string> = {
  white: "#FFFFFF",
  lavender: "#FAF6FF", // brand paper canvas, see design_handoff_dream_puppies_b
};

const MAX_DIM = 2048;
// Quantized model — smallest download (~40MB vs ~80MB for the fp16 default).
// A one-time cost per device; cached by the browser afterward.
const MODEL = "isnet_quint8";

export interface RemoveBackgroundOptions {
  backdrop: Backdrop;
  onProgress?: (fraction: number) => void;
  /** Set to true (from a ref/state the caller flips) to cancel. */
  isCancelled: () => boolean;
}

export class BackgroundRemovalCancelled extends Error {
  constructor() {
    super("Background removal cancelled");
    this.name = "BackgroundRemovalCancelled";
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

/** Downscale defensively before handing the image to the model — larger
 *  input is wasted WASM memory and time for no quality benefit once past
 *  ~2048px on the long edge. Returns the original bytes untouched when
 *  already small enough, to avoid a pointless re-encode. */
async function downscaleForModel(sourceUrl: string): Promise<Blob> {
  const image = await loadImage(sourceUrl);
  if (Math.max(image.width, image.height) <= MAX_DIM) {
    const res = await fetch(sourceUrl);
    return res.blob();
  }

  const scale = MAX_DIM / Math.max(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Failed to downscale image");
  return blob;
}

/** Composite a transparent-background PNG blob onto a solid color and
 *  re-encode as JPEG — used for the white/lavender backdrop choices. */
async function flattenOntoBackdrop(pngBlob: Blob, color: string): Promise<File> {
  const url = URL.createObjectURL(pngBlob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) throw new Error("Failed to flatten image");
    return new File([blob], "bg-removed.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Remove the background from an image, then apply the chosen backdrop.
 *
 * `transparent` returns a PNG with alpha and skips compressPhoto (compression
 * targets JPEG and would destroy the transparency); white/lavender flatten to
 * JPEG and go through the normal compression pipeline like any other upload.
 */
export async function removeBackground(
  sourceUrl: string,
  options: RemoveBackgroundOptions,
): Promise<File> {
  const { backdrop, onProgress, isCancelled } = options;

  const abortController = new AbortController();
  onProgress?.(0);

  const input = await downscaleForModel(sourceUrl);
  if (isCancelled()) {
    abortController.abort();
    throw new BackgroundRemovalCancelled();
  }

  // Dynamic import — this is the line that actually pulls in the ~30KB
  // library and (on first use per device) triggers the model download.
  const { default: imglyRemoveBackground } = await import("@imgly/background-removal");

  const resultBlob = await imglyRemoveBackground(input, {
    model: MODEL,
    device: "cpu",
    proxyToWorker: true, // keep the main thread responsive during inference
    fetchArgs: { signal: abortController.signal },
    output: { format: "image/png", quality: 0.9 },
    progress: (_key, current, total) => {
      if (total > 0) onProgress?.(Math.min(1, current / total));
    },
  });

  // Inference isn't abortable, so this is where a cancel-during-compute is
  // caught: the result is thrown away rather than surfaced.
  if (isCancelled()) throw new BackgroundRemovalCancelled();

  if (backdrop === "transparent") {
    return new File([resultBlob], "bg-removed.png", { type: "image/png" });
  }

  const flattened = await flattenOntoBackdrop(resultBlob, BACKDROP_COLOR[backdrop]);
  return compressPhoto(flattened);
}
