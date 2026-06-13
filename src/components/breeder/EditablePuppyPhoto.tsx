// One puppy photo that can be replaced in place — no page navigation.
//
// Tapping the tile opens the device's native picker. We deliberately do NOT
// set the `capture` attribute so phones offer the full action sheet ("Photo
// Library / Take Photo / Choose File"), letting the breeder either pick an
// existing photo or shoot a new one. The chosen image is compressed, uploaded
// through breeder-upload-photo, then swapped onto the puppy via the
// replacePuppyPhoto op (which also retires the old storage object).
//
// When `url` is null the tile renders as an "Add photo" slot and appends a
// new picture instead of replacing one.

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Star } from "lucide-react";
import { compressPhoto } from "@/lib/breeder/compressImage";
import { uploadBreederPhoto, replacePuppyPhoto, type BreederPuppyRow } from "@/lib/breeder/api";
import { useBreederAuth } from "@/hooks/use-breeder-auth";

export interface EditablePuppyPhotoProps {
  puppyId: string;
  /** Existing photo URL, or null to render an "add photo" slot. */
  url: string | null;
  /** Marks the primary (first) photo with a badge. */
  isPrimary?: boolean;
  /** Called with the freshly-saved puppy row after a successful swap. */
  onUpdated: (puppy: BreederPuppyRow) => void;
  disabled?: boolean;
}

export function EditablePuppyPhoto({
  puppyId,
  url,
  isPrimary,
  onUpdated,
  disabled,
}: EditablePuppyPhotoProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { session } = useBreederAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!session) {
      setError("Session expired. Sign in again.");
      return;
    }
    const file = files[0]!;
    setBusy(true);
    setError(null);

    try {
      const compressed = await compressPhoto(file);
      const uploaded = await uploadBreederPhoto({
        token: session.token,
        file: compressed,
        kind: "puppy",
        subjectId: puppyId,
      });
      if (!uploaded.ok) {
        setError(uploaded.error);
        return;
      }
      const swapped = await replacePuppyPhoto(session.token, {
        puppyId,
        oldUrl: url,
        newUrl: uploaded.data.publicUrl,
      });
      if (!swapped.ok) {
        setError(swapped.error);
        return;
      }
      onUpdated(swapped.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const label = url ? "Replace photo" : "Add photo";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        aria-label={label}
        className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 bg-muted/30 transition active:scale-[0.98] ${
          url ? "border-transparent" : "border-dashed border-muted-foreground/30"
        } ${disabled || busy ? "opacity-60" : "hover:bg-muted/50"}`}
      >
        {url && !busy && (
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {!url && !busy && (
          <div className="flex flex-col items-center gap-1.5 px-2 text-center text-muted-foreground">
            <ImagePlus className="h-7 w-7" aria-hidden />
            <span className="text-xs font-medium">Add photo</span>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/80 text-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-[11px]">Uploading…</span>
          </div>
        )}

        {isPrimary && url && !busy && (
          <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-amber-600 shadow">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden />
            Main
          </span>
        )}

        {url && !busy && (
          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-background/90 p-1.5 shadow">
            <Camera className="h-4 w-4" aria-hidden />
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
