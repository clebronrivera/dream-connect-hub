// Full-screen in-browser photo editor: crop/rotate, one-tap enhance,
// background removal. All three run entirely on-device.
//
// Edits CHAIN within one session — crop, then remove background, then save —
// but the session as a whole always produces exactly one new, staged
// puppy_media row. The original is never touched: this sheet only ever
// uploads a fresh file with `derivedFrom` pointing at the source, so a bad
// edit costs nothing to throw away and the untouched original stays on the
// public site the whole time.
//
// This file is only ever imported from MediaActionSheet's "Edit" action, so
// react-easy-crop and @imgly/background-removal (and the ~40MB model it
// fetches on first use) stay out of every bundle except this one, and the
// model download only starts when the operator actually taps "Remove
// background".

import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, RotateCw, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { resolvePuppyPhotosPublicUrl } from "@/lib/puppy-photos";
import { uploadBreederPhoto, type PuppyMediaRow } from "@/lib/breeder/api";
import { CROP_ASPECT_RATIO, cropImage, type CropAspect } from "./crop";
import { enhanceImage } from "./enhance";
import { BackgroundRemovalCancelled, removeBackground, type Backdrop } from "./backgroundRemoval";

export interface MediaEditSheetProps {
  media: PuppyMediaRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save so the caller can refresh its media list. */
  onSaved: () => void;
}

type Tool = "crop" | "enhance" | "background";

const CROP_ASPECT_LABEL: Record<CropAspect, string> = {
  square: "Square",
  portrait: "4:5",
  free: "Free",
};

/**
 * The caller MUST remount this component per photo — e.g.
 * `<MediaEditSheet key={media?.id ?? "closed"} ... />` — rather than relying
 * on prop changes. That's what resets every tool's state for a new editing
 * session; there is deliberately no "reset on open" effect here. Effects
 * exist to synchronize with the outside world (object-URL cleanup on
 * unmount), not to reinitialize state that a fresh mount already gives you
 * for free, and doing it with an effect would mean a dozen setState calls
 * firing synchronously on every open.
 */
export function MediaEditSheet({ media, open, onOpenChange, onSaved }: MediaEditSheetProps) {
  const { session } = useBreederAuth();

  // The image as it stands after whatever's been applied so far this
  // session. Starts at the untouched original; each tool's "Apply" replaces
  // it, so a crop followed by background removal chains onto the cropped
  // result rather than the source. Safe to read `media` in these
  // initializers because the key-based remount contract above guarantees
  // `media` is fixed for the lifetime of one mounted instance.
  const [workingUrl, setWorkingUrl] = useState<string | null>(() =>
    media ? resolvePuppyPhotosPublicUrl(media.url) : null,
  );
  const [workingFile, setWorkingFile] = useState<File | null>(null);
  const [opsLog, setOpsLog] = useState<Record<string, unknown>[]>([]);
  const createdUrlsRef = useRef<string[]>([]);

  const [tool, setTool] = useState<Tool>("crop");
  const [saving, setSaving] = useState(false);

  const [cropAspect, setCropAspect] = useState<CropAspect>("square");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropBusy, setCropBusy] = useState(false);

  const [enhanceBusy, setEnhanceBusy] = useState(false);

  const [backdrop, setBackdrop] = useState<Backdrop>("white");
  const [bgBusy, setBgBusy] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const cancelledRef = useRef(false);

  // Cleanup only — revoke every object URL this session created once the
  // component is torn down (either the operator closed it, going through the
  // "closed" key, or they moved on to a different photo).
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  if (!media) return null;
  const isVideo = media.media_type === "video";

  function pushWorking(file: File, op: Record<string, unknown>) {
    const url = URL.createObjectURL(file);
    createdUrlsRef.current.push(url);
    setWorkingFile(file);
    setWorkingUrl(url);
    setOpsLog((prev) => [...prev, op]);
  }

  async function applyCrop() {
    if (!workingUrl || !croppedAreaPixels) return;
    setCropBusy(true);
    try {
      const file = await cropImage(workingUrl, croppedAreaPixels, rotation);
      pushWorking(file, { op: "crop", aspect: cropAspect, rotation, area: croppedAreaPixels });
      setRotation(0);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Crop failed");
    } finally {
      setCropBusy(false);
    }
  }

  async function applyEnhance() {
    if (!workingUrl) return;
    setEnhanceBusy(true);
    try {
      const file = await enhanceImage(workingUrl);
      pushWorking(file, { op: "enhance" });
      toast.success("Enhanced");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enhance failed");
    } finally {
      setEnhanceBusy(false);
    }
  }

  async function applyBackgroundRemoval() {
    if (!workingUrl) return;
    setBgBusy(true);
    setBgProgress(0);
    cancelledRef.current = false;
    try {
      const file = await removeBackground(workingUrl, {
        backdrop,
        onProgress: setBgProgress,
        isCancelled: () => cancelledRef.current,
      });
      pushWorking(file, { op: "background-removal", backdrop });
      toast.success("Background removed");
    } catch (e) {
      if (e instanceof BackgroundRemovalCancelled) {
        toast.info("Cancelled");
      } else {
        toast.error(
          e instanceof Error
            ? e.message
            : "Couldn't remove the background on this device",
        );
      }
    } finally {
      setBgBusy(false);
    }
  }

  function cancelBackgroundRemoval() {
    cancelledRef.current = true;
  }

  async function handleSave() {
    if (!workingFile || !session) return;
    setSaving(true);
    try {
      const res = await uploadBreederPhoto({
        token: session.token,
        file: workingFile,
        kind: "puppy",
        subjectId: media.puppy_id,
        record: true,
        mediaKind: media.kind === "video" ? "candid" : media.kind,
        isPublic: false, // edited variants always land in staging for review
        derivedFrom: media.id,
        editOps: opsLog,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved to staging — publish it when you're happy with it.");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const anyBusy = cropBusy || enhanceBusy || bgBusy || saving;

  return (
    <Dialog open={open} onOpenChange={(o) => !anyBusy && onOpenChange(o)}>
      <DialogContent className="inset-0 left-0 top-0 flex h-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:rounded-none">
        <DialogHeader className="border-b p-4 text-left">
          <DialogTitle>Edit photo</DialogTitle>
        </DialogHeader>

        {isVideo ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Editing tools work on photos only.
          </div>
        ) : (
          <Tabs
            value={tool}
            onValueChange={(v) => setTool(v as Tool)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            {/* Three equal-width tabs on a grid: at small widths or with iOS
                Dynamic Type / browser text zoom bumping the font size up,
                "Background" is long enough to overflow a plain whitespace-
                nowrap trigger with no truncation guard — it did, cut off
                mid-word on a narrow phone. truncate + tighter/responsive
                padding keeps every label inside its own pill at any width. */}
            <TabsList className="mx-4 mt-3 grid grid-cols-3 gap-1">
              <TabsTrigger
                value="crop"
                disabled={anyBusy}
                className="truncate px-1 text-xs sm:px-3 sm:text-sm"
              >
                Crop
              </TabsTrigger>
              <TabsTrigger
                value="enhance"
                disabled={anyBusy}
                className="truncate px-1 text-xs sm:px-3 sm:text-sm"
              >
                Enhance
              </TabsTrigger>
              <TabsTrigger
                value="background"
                disabled={anyBusy}
                className="truncate px-1 text-xs sm:px-3 sm:text-sm"
              >
                Background
              </TabsTrigger>
            </TabsList>

            {/* ── Crop ── */}
            <TabsContent value="crop" className="flex flex-1 flex-col overflow-hidden p-4 data-[state=inactive]:hidden">
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-black">
                {workingUrl && (
                  <Cropper
                    image={workingUrl}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={cropAspect === "free" ? undefined : CROP_ASPECT_RATIO[cropAspect]}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
                  />
                )}
              </div>

              <div className="mt-3 flex justify-center gap-2">
                {(Object.keys(CROP_ASPECT_LABEL) as CropAspect[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    disabled={anyBusy}
                    onClick={() => setCropAspect(a)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                      cropAspect === a
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background hover:bg-muted"
                    }`}
                  >
                    {CROP_ASPECT_LABEL[a]}
                  </button>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-3 text-xs text-muted-foreground">
                  Zoom
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    disabled={anyBusy}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1"
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full gap-2"
                  disabled={anyBusy}
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                >
                  <RotateCw className="h-4 w-4" aria-hidden />
                  Rotate 90°
                </Button>
              </div>

              <Button
                className="mt-3 h-11 w-full"
                disabled={anyBusy || !croppedAreaPixels}
                onClick={applyCrop}
              >
                {cropBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Apply crop
              </Button>
            </TabsContent>

            {/* ── Enhance ── */}
            <TabsContent value="enhance" className="flex flex-1 flex-col overflow-hidden p-4 data-[state=inactive]:hidden">
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted/30">
                {workingUrl && (
                  <img
                    src={workingUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                One tap brightens and sharpens up the colors a touch — good for
                photos taken in low indoor light.
              </p>
              <Button
                className="mt-3 h-11 w-full gap-2"
                disabled={anyBusy}
                onClick={applyEnhance}
              >
                {enhanceBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden />
                )}
                Enhance photo
              </Button>
            </TabsContent>

            {/* ── Background removal ── */}
            <TabsContent value="background" className="flex flex-1 flex-col overflow-hidden p-4 data-[state=inactive]:hidden">
              <div
                className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
                }}
              >
                {workingUrl && (
                  <img
                    src={workingUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>

              <div className="mt-3 flex justify-center gap-2">
                {(["white", "lavender", "transparent"] as Backdrop[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    disabled={anyBusy}
                    onClick={() => setBackdrop(b)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition disabled:opacity-60 ${
                      backdrop === b
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background hover:bg-muted"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              {bgBusy ? (
                <div className="mt-3 space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.round(bgProgress * 100)}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    {bgProgress < 1
                      ? "Downloading the on-device model (first time only, ~40MB)…"
                      : "Processing…"}
                  </p>
                  <Button variant="outline" className="h-11 w-full" onClick={cancelBackgroundRemoval}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  className="mt-3 h-11 w-full gap-2"
                  disabled={anyBusy}
                  onClick={applyBackgroundRemoval}
                >
                  <Wand2 className="h-4 w-4" aria-hidden />
                  Remove background
                </Button>
              )}
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Runs on this device — nothing is uploaded to a third party. May
                take longer on an older phone.
              </p>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex gap-2 border-t p-4">
          <Button
            variant="outline"
            className="h-11 flex-1"
            disabled={anyBusy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-11 flex-1"
            disabled={anyBusy || !workingFile || opsLog.length === 0}
            onClick={handleSave}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Save as new photo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
