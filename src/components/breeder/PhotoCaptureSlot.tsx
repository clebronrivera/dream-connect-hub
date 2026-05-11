// Tap-to-capture one photo, compress it client-side, upload it through
// breeder-upload-photo, and surface the uploaded URL via onUploaded.
//
// On mobile, the `capture="environment"` attribute opens the rear camera.
// On desktop, the same input renders as a file picker — same flow.
//
// The slot is dumb: it doesn't store the value (the parent does). It
// reports the uploaded { path, publicUrl } back via onUploaded, then a
// re-render with `value={publicUrl}` shows the preview.

import { useRef, useState } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import { compressPhoto } from "@/lib/breeder/compressImage";
import { uploadBreederPhoto } from "@/lib/breeder/api";
import { useBreederAuth } from "@/hooks/use-breeder-auth";

export interface PhotoCaptureSlotProps {
  label: string;
  kind: "puppy" | "parent";
  subjectId: string;
  value?: string | null; // current publicUrl, if any
  onUploaded: (result: { path: string; publicUrl: string }) => void;
  disabled?: boolean;
}

export function PhotoCaptureSlot({
  label,
  kind,
  subjectId,
  value,
  onUploaded,
  disabled,
}: PhotoCaptureSlotProps) {
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
      const res = await uploadBreederPhoto({
        token: session.token,
        file: compressed,
        kind,
        subjectId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onUploaded(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const showRetake = !!value && !busy;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        aria-label={value ? `${label} — replace photo` : `${label} — capture photo`}
        className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/30 transition active:scale-[0.99] ${
          value ? "border-emerald-500/40" : "border-muted-foreground/30"
        } ${disabled || busy ? "opacity-60" : "hover:bg-muted/50"}`}
      >
        {value && !busy && (
          <img
            src={value}
            alt={label}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {!value && !busy && (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-muted-foreground">
            <Camera className="h-8 w-8" />
            <span className="text-sm font-medium">{label}</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 text-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs">Uploading…</span>
          </div>
        )}
        {showRetake && (
          <div className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow">
            <RotateCcw className="h-4 w-4" aria-hidden />
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
