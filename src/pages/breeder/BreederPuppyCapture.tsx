// /breeder/puppies/:puppyId/capture
//
// Step machine for one puppy. Each step auto-saves the puppies row so
// losing signal mid-capture leaves the data on the server. Step state
// and "last-puppy-for-litter" are persisted via lib/breeder/captureState
// so navigating away and back lands the breeder right where she left off.
//
// Steps:
//   1. name    — edit/confirm the auto-suggested name
//   2. face    — face photo (primary)
//   3. back    — back/profile photo
//   4. top     — top-down photo
//   5. paw     — paw photo (optional but encouraged)
//   6. video   — optional 10-second clip
//   7. price   — per-puppy override (inherits litter price if blank)
//   8. notes   — optional notes / description
//   9. status  — status (Available/Pending/Sold/Reserved) + publish toggle
//  10. done    — confirm + return to wizard
//
// Puppies are created with is_publicly_visible=false. The status step
// is where the operator explicitly flips them visible at the end of
// capture — no auto-publish on photo upload anymore.

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoCaptureSlot } from "@/components/breeder/PhotoCaptureSlot";
import { VideoCaptureSlot } from "@/components/breeder/VideoCaptureSlot";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import {
  listAllBreederPuppies,
  listLitterPuppies,
  updatePuppy,
  type BreederPuppyRow,
} from "@/lib/breeder/api";
import { getSuggestedPuppyName } from "@/lib/puppy-name-generator";
import {
  getStepForPuppy,
  setStepForPuppy,
  setLastPuppyForLitter,
} from "@/lib/breeder/captureState";

const PUPPIES_QK = (litterId: string) => ["breeder", "litterPuppies", litterId] as const;
const PUPPY_QK = (id: string) => ["breeder", "puppy", id] as const;
const HOME_QK = ["breeder", "home"] as const;

type Step = "name" | "face" | "back" | "top" | "paw" | "video" | "price" | "notes" | "status" | "done";
const STEPS: Step[] = ["name", "face", "back", "top", "paw", "video", "price", "notes", "status", "done"];
const PHOTO_STEPS: Step[] = ["face", "back", "top", "paw"];

const STEP_LABELS: Record<Step, string> = {
  name: "Name",
  face: "Face photo",
  back: "Back / profile",
  top: "Top-down",
  paw: "Paw print",
  video: "Short video",
  price: "Price",
  notes: "Notes",
  status: "Status & publish",
  done: "Done",
};

type PuppyStatus = "Available" | "Pending" | "Sold" | "Reserved";
const PUPPY_STATUSES: PuppyStatus[] = ["Available", "Pending", "Sold", "Reserved"];

type Generation = "F1" | "F1b" | "F2" | "F2b" | "multigen";
const GENERATIONS: Generation[] = ["F1", "F1b", "F2", "F2b", "multigen"];

function isStep(s: string | null): s is Step {
  return s !== null && (STEPS as string[]).includes(s);
}

interface PhotosState {
  face?: string;
  back?: string;
  top?: string;
  paw?: string;
}

export default function BreederPuppyCapture() {
  const { puppyId } = useParams<{ puppyId: string }>();
  const [searchParams] = useSearchParams();
  const litterId = searchParams.get("from") ?? null;
  const { session } = useBreederAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Primary query: litter siblings when we have a litter context. Cheap +
  // shared with the wizard's "Puppies so far" list so navigating
  // wizard ↔ capture is instant.
  const { data: litterPuppies = [], isLoading: litterLoading } = useQuery({
    queryKey: litterId ? PUPPIES_QK(litterId) : ["breeder", "litterPuppies", "none"],
    enabled: !!session && !!litterId,
    queryFn: async () => {
      if (!session || !litterId) return [];
      const res = await listLitterPuppies(session.token, litterId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  // Fallback: when there's no litter context (older puppies, post-birth
  // puppies missing upcoming_litter_id, etc) OR when the litter query
  // doesn't include this puppy, fall back to the global roster so every
  // puppy can be opened from the Puppies tab without "Puppy not found".
  const needsFallback =
    !litterId || (!litterLoading && !litterPuppies.some((p) => p.id === puppyId));
  const { data: allPuppies = [], isLoading: allLoading } = useQuery({
    queryKey: ["breeder", "allPuppies"] as const,
    enabled: !!session && needsFallback,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await listAllBreederPuppies(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const isLoading = litterLoading || (needsFallback && allLoading);

  const puppy = useMemo<BreederPuppyRow | undefined>(() => {
    const fromLitter = litterPuppies.find((p) => p.id === puppyId);
    if (fromLitter) return fromLitter;
    return allPuppies.find((p) => p.id === puppyId);
  }, [litterPuppies, allPuppies, puppyId]);

  // "Other names in this litter" for the suggest-name button. Use litter
  // siblings when known; otherwise infer from the fallback roster by
  // matching litter_id / upcoming_litter_id on the resolved puppy.
  const otherNames = useMemo(() => {
    if (litterPuppies.length > 0) {
      return litterPuppies.filter((p) => p.id !== puppyId).map((p) => p.name);
    }
    if (!puppy) return [];
    return allPuppies
      .filter((p) => {
        if (p.id === puppyId) return false;
        if (puppy.upcoming_litter_id) {
          return p.upcoming_litter_id === puppy.upcoming_litter_id;
        }
        if (puppy.litter_id) return p.litter_id === puppy.litter_id;
        return false;
      })
      .map((p) => p.name);
  }, [litterPuppies, allPuppies, puppy, puppyId]);

  if (!puppyId) {
    return <div className="p-6 text-sm text-muted-foreground">Missing puppy id.</div>;
  }

  if (isLoading && !puppy) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!puppy) {
    return (
      <div className="mx-auto max-w-screen-sm px-4 py-6 text-sm text-muted-foreground">
        Puppy not found. Return to{" "}
        <button
          type="button"
          onClick={() => navigate(litterId ? `/breeder/litters/${litterId}/wizard` : "/breeder")}
          className="underline"
        >
          the wizard
        </button>
        .
      </div>
    );
  }

  return (
    <CaptureForm
      puppyId={puppyId}
      puppy={puppy}
      otherNames={otherNames}
      litterId={litterId}
      onPersist={() => {
        if (litterId) queryClient.invalidateQueries({ queryKey: PUPPIES_QK(litterId) });
        queryClient.invalidateQueries({ queryKey: ["breeder", "allPuppies"] });
        queryClient.invalidateQueries({ queryKey: HOME_QK });
        queryClient.invalidateQueries({ queryKey: PUPPY_QK(puppyId) });
      }}
    />
  );
}

function CaptureForm({
  puppyId,
  puppy,
  otherNames,
  litterId,
  onPersist,
}: {
  puppyId: string;
  puppy: BreederPuppyRow;
  otherNames: string[];
  litterId: string | null;
  onPersist: () => void;
}) {
  const navigate = useNavigate();
  const { session } = useBreederAuth();

  // Restore the last step the operator was on for this puppy (best-effort
  // UX hint stored in localStorage). If there's nothing saved, start at 0.
  const [stepIdx, setStepIdx] = useState<number>(() => {
    const saved = getStepForPuppy(puppyId);
    if (!isStep(saved)) return 0;
    const idx = STEPS.indexOf(saved);
    return idx >= 0 ? idx : 0;
  });
  const [name, setName] = useState(puppy.name);
  const [notes, setNotes] = useState(puppy.description ?? "");
  const [personalityBlurb, setPersonalityBlurb] = useState(puppy.personality_blurb ?? "");
  // Empty string = inherit from litter (don't override). Otherwise a manual price.
  const [priceText, setPriceText] = useState<string>(
    puppy.base_price != null ? String(puppy.base_price) : "",
  );
  // Empty string = not recorded.
  const [generation, setGeneration] = useState<Generation | "">(
    (puppy.generation as Generation | null) ?? "",
  );
  const [status, setStatus] = useState<PuppyStatus>(
    (puppy.status as PuppyStatus | null) ?? "Available",
  );
  const [isPubliclyVisible, setIsPubliclyVisible] = useState<boolean>(
    puppy.is_publicly_visible ?? false,
  );

  // Persist step + last-puppy hint whenever they change.
  useEffect(() => {
    setStepForPuppy(puppyId, STEPS[stepIdx] ?? "name");
    if (litterId) setLastPuppyForLitter(litterId, puppyId);
  }, [stepIdx, puppyId, litterId]);

  // Derive photo state from the row. We pre-fill slot URLs in order the
  // first time, then track local capture results as the user replaces.
  const initialPhotos: PhotosState = useMemo(() => {
    const arr = puppy.photos ?? [];
    return {
      face: puppy.primary_photo ?? arr[0],
      back: arr[1],
      top: arr[2],
      paw: arr[3],
    };
  }, [puppy.photos, puppy.primary_photo]);

  const [photos, setPhotos] = useState<PhotosState>(initialPhotos);
  const [videoUrl, setVideoUrl] = useState<string | null>(puppy.video_path);

  const patchMut = useMutation({
    mutationFn: async (fields: Parameters<typeof updatePuppy>[2]) => {
      if (!session) throw new Error("No session");
      const res = await updatePuppy(session.token, puppyId, fields);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => onPersist(),
    onError: (err: Error) => toast.error(err.message),
  });

  function buildPhotosArray(next: PhotosState): string[] {
    return [next.face, next.back, next.top, next.paw].filter(
      (u): u is string => typeof u === "string" && u.length > 0,
    );
  }

  function suggestName() {
    setName(getSuggestedPuppyName(puppy.gender, otherNames));
  }

  async function persistCurrent() {
    const step = STEPS[stepIdx]!;
    switch (step) {
      case "name": {
        if (!name.trim() || name === puppy.name) return;
        await patchMut.mutateAsync({ name: name.trim() });
        return;
      }
      case "notes": {
        const patch: Parameters<typeof updatePuppy>[2] = {};
        if (notes !== (puppy.description ?? "")) patch.description = notes;
        if (personalityBlurb !== (puppy.personality_blurb ?? "")) {
          patch.personality_blurb = personalityBlurb.trim() || null;
        }
        if (Object.keys(patch).length === 0) return;
        await patchMut.mutateAsync(patch);
        return;
      }
      case "price": {
        const patch: Parameters<typeof updatePuppy>[2] = {};
        const trim = priceText.trim();
        const initialPrice = puppy.base_price != null ? String(puppy.base_price) : "";
        if (trim !== initialPrice) {
          if (trim === "") {
            patch.base_price = null;
          } else {
            const n = Number(trim);
            if (!Number.isFinite(n) || n < 0 || n > 100000) {
              throw new Error("Price must be a non-negative number up to 100000");
            }
            patch.base_price = n;
          }
        }
        if (generation !== (puppy.generation ?? "")) {
          patch.generation = generation === "" ? null : generation;
        }
        if (Object.keys(patch).length === 0) return;
        await patchMut.mutateAsync(patch);
        return;
      }
      case "status": {
        const patch: Parameters<typeof updatePuppy>[2] = {};
        if (status !== (puppy.status ?? "Available")) patch.status = status;
        if (isPubliclyVisible !== (puppy.is_publicly_visible ?? false))
          patch.is_publicly_visible = isPubliclyVisible;
        if (Object.keys(patch).length === 0) return;
        await patchMut.mutateAsync(patch);
        return;
      }
      default:
        return;
    }
  }

  function onVideoUploaded(result: { path: string; publicUrl: string } | null) {
    const next = result?.publicUrl ?? null;
    setVideoUrl(next);
    patchMut.mutate({ video_path: next });
  }

  function onPhotoUploaded(slot: keyof PhotosState, publicUrl: string) {
    setPhotos((prev) => {
      const next = { ...prev, [slot]: publicUrl };
      const photosArr = buildPhotosArray(next);
      const patch: Parameters<typeof updatePuppy>[2] = { photos: photosArr };
      if (slot === "face") patch.primary_photo = publicUrl;
      // Visibility no longer flips on first photo upload — the operator
      // controls it explicitly on the "status" step at the end so a
      // half-finished puppy doesn't land on the public site.
      patchMut.mutate(patch);
      return next;
    });
  }

  async function goToStep(nextIdx: number) {
    const clamped = Math.max(0, Math.min(nextIdx, STEPS.length - 1));
    if (clamped === stepIdx) return;
    try {
      await persistCurrent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
      return;
    }
    setStepIdx(clamped);
  }

  async function handleNext() {
    await goToStep(stepIdx + 1);
  }

  function handleBack() {
    if (stepIdx === 0) {
      navigate(litterId ? `/breeder/litters/${litterId}/wizard` : "/breeder");
      return;
    }
    setStepIdx((i) => i - 1);
  }

  function handleDone() {
    if (litterId) navigate(`/breeder/litters/${litterId}/wizard`, { replace: true });
    else navigate("/breeder", { replace: true });
  }

  const step = STEPS[stepIdx]!;

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-6">
      <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {STEP_LABELS[step]} · Step {stepIdx + 1} of {STEPS.length}
        </p>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i <= stepIdx ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <h1 className="text-2xl font-bold">{name || "(no name)"}</h1>
        <p className="text-sm text-muted-foreground">{puppy.gender}</p>
      </header>

      <Card className="space-y-4 p-5">
        {step === "name" && (
          <>
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cooper, Daisy…"
              />
              <Button type="button" variant="outline" onClick={suggestName}>
                <Sparkles className="mr-1 h-4 w-4" />
                Suggest
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The auto-suggested name is unique within this litter. Edit if
              the family wants something specific.
            </p>
          </>
        )}

        {PHOTO_STEPS.includes(step) && (
          <PhotoCaptureSlot
            label={STEP_LABELS[step]}
            kind="puppy"
            subjectId={puppyId}
            value={photos[step as keyof PhotosState] ?? null}
            onUploaded={({ publicUrl }) =>
              onPhotoUploaded(step as keyof PhotosState, publicUrl)
            }
          />
        )}

        {step === "video" && (
          <VideoCaptureSlot
            label="Short video"
            subjectId={puppyId}
            value={videoUrl}
            onUploaded={onVideoUploaded}
          />
        )}

        {step === "price" && (
          <>
            <Label htmlFor="price">Price (USD)</Label>
            <p className="text-sm text-muted-foreground">
              Leave blank to inherit the litter's price. Override here to set
              a different price for {puppy.name || "this puppy"} specifically.
            </p>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                min={0}
                step="50"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                className="pl-7"
                placeholder="1500"
              />
            </div>

            <div className="pt-2">
              <Label htmlFor="generation">Generation (optional)</Label>
              <p className="mb-1 text-xs text-muted-foreground">
                F1b and later generations often command a premium — record it here.
              </p>
              <Select
                value={generation || "unset"}
                onValueChange={(v) => setGeneration(v === "unset" ? "" : (v as Generation))}
              >
                <SelectTrigger id="generation" className="mt-1">
                  <SelectValue placeholder="Not recorded" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not recorded</SelectItem>
                  {GENERATIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {step === "notes" && (
          <>
            <Label htmlFor="personality-blurb">Personality (optional)</Label>
            <p className="mb-1 text-xs text-muted-foreground">
              One punchy sentence — used to lead the auto-generated social posts (Breeder →
              Generate Post).
            </p>
            <Input
              id="personality-blurb"
              value={personalityBlurb}
              onChange={(e) => setPersonalityBlurb(e.target.value)}
              placeholder="The cuddly one who falls asleep mid-play."
              maxLength={140}
            />
            <div className="pt-4">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sweetest girl in the litter, loves squeaky toys."
                rows={5}
              />
            </div>
          </>
        )}

        {step === "status" && (
          <>
            <h2 className="text-lg font-semibold">Status &amp; publish</h2>
            <p className="text-sm text-muted-foreground">
              Set how {name || "this puppy"} should appear on the public site.
              The puppy stays hidden until you flip the toggle on.
            </p>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as PuppyStatus)}
              >
                <SelectTrigger id="status" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUPPY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label
              htmlFor="public-toggle"
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-4 transition ${
                isPubliclyVisible
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-muted-foreground/20 bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                {isPubliclyVisible ? (
                  <Eye className="h-5 w-5 text-emerald-700" aria-hidden />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground" aria-hidden />
                )}
                <div>
                  <div className="font-medium">
                    {isPubliclyVisible ? "Showing on public site" : "Hidden from public site"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isPubliclyVisible
                      ? "Buyers can see this puppy on /puppies."
                      : "Toggle on to publish once this puppy is ready for buyers."}
                  </p>
                </div>
              </div>
              <Switch
                id="public-toggle"
                checked={isPubliclyVisible}
                onCheckedChange={setIsPubliclyVisible}
              />
            </label>
          </>
        )}

        {step === "done" && (
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold">All set</h2>
            <p className="text-sm text-muted-foreground">
              {name} is saved. Head back to capture the next puppy.
            </p>
            <p className="text-xs text-muted-foreground">
              Status: <strong>{status}</strong> ·{" "}
              {isPubliclyVisible ? "visible on /puppies" : "hidden"}
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={patchMut.isPending}
          className="flex-1 h-12"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {step === "done" ? (
          <Button onClick={handleDone} className="flex-1 h-12">
            Back to wizard
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={patchMut.isPending || (step === "name" && !name.trim())}
            className="flex-1 h-12"
          >
            {patchMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}
