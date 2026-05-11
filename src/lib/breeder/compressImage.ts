// Client-side photo compression for breeder uploads.
//
// Sizing rationale: 2000px longest edge at 85% JPEG quality is the sweet
// spot for "phone-friendly upload that still looks great on a desktop
// browse" — typical output is 600KB-1.2MB. A four-photo capture per puppy
// uploads in ~3-5MB total, manageable on LTE. The hard server-side cap is
// 5MB per file (breeder-upload-photo); we aim well under that.

import imageCompression from "browser-image-compression";

const MAX_SIZE_MB = 1.2;
const MAX_DIM = 2000;
const QUALITY = 0.85;

export async function compressPhoto(file: File): Promise<File> {
  // Already-tiny or non-photo files (e.g. small webp icons) pass through.
  if (file.size <= 200_000) return file;

  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_DIM,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: QUALITY,
  });

  // browser-image-compression returns Blob in some browsers; wrap to File.
  if (compressed instanceof File) return compressed;
  return new File([compressed], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
  });
}
