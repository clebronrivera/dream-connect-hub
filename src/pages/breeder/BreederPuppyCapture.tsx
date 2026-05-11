// /breeder/puppies/:puppyId/capture
//
// Step machine for one puppy. Each step auto-saves the puppies row so
// losing signal mid-capture leaves the data on the server.
//
// Steps:
//   1. name         — edit/confirm the auto-suggested name
//   2. face         — face photo (primary)
//   3. back         — back/profile photo
//   4. top          — top-down photo
//   5. paw          — paw photo (optional but encouraged)
//   6. notes        — optional notes / description
//   7. done         — confirm + return to wizard
//
// Photo uploads round-trip through breeder-upload-photo via
// PhotoCaptureSlot, which returns { path, publicUrl }. We push the
// publicUrl onto puppies.photos and set primary_photo on the face shot.
//
// The first successful photo upload flips is_publicly_visible=true so
// the public site picks the puppy up; a puppy with no photos stays
// hidden so it doesn't show up as a placeholder.

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoCaptureSlot } from "@/components/breeder/PhotoCaptureSlot";
import { VideoCaptureSlot } from "@/components/breeder/VideoCaptureSlot";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import {
  listLitterPuppies,
  updatePuppy,
  type BreederPuppyRow,
} from "@/lib/breeder/api";
import { getSuggestedPuppyName } from "@/lib/puppy-name-generator";

const PUPPIES_QK = (litterId: string) => ["breeder", "litterPuppies", litterId] as const;
const PUPPY_QK = (id: string) => ["breeder", "puppy", id] as const;
const HOME_QK = ["breeder", "home"] as const;

type Step = "name" | "face" | "back" | "top" | "paw" | "video" | "price" | "notes" | "done";
const STEPS: Step[] = ["name", "face", "back", "top", "paw", "video", "price", "notes", "done"];
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
  done: "Done",
};

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

  // The wizard query is the source of truth for the row. We piggyback on
  // it so navigating wizard ↔ capture is instant.
  const { data: puppies = [], isLoading } = useQuery({
    queryKey: litterId ? PUPPIES_QK(litterId) : ["breeder", "litterPuppies", "none"],
    enabled: !!session && !!litterId,
    queryFn: async () => {
      if (!session || !litterId) return [];
      const res = await listLitterPuppies(session.token, litterId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const puppy = useMemo(
    () => puppies.find((p) => p.id === puppyId),
    [puppies, puppyId],
  );

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
      otherNames={puppies.filter((p) => p.id !== puppyId).map((p) => p.name)}
      litterId={litterId}
      onPersist={() => {
        if (litterId) queryClient.invalidateQueries({ queryKey: PUPPIES_QK(litterId) });
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

  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState(puppy.name);
  const [notes, setNotes] = useState(puppy.description ?? "");
  // Empty string = inherit from litter (don't override). Otherwise a manual price.
  const [priceText, setPriceText] = useState<string>(
    puppy.base_price != null ? String(puppy.base_price) : "",
  );

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
        if (notes === (puppy.description ?? "")) return;
        await patchMut.mutateAsync({ description: notes });
        return;
      }
      case "price": {
        const trim = priceText.trim();
        const initial = puppy.base_price != null ? String(puppy.base_price) : "";
        if (trim === initial) return;
        if (trim === "") {
          await patchMut.mutateAsync({ base_price: null });
        } else {
          const n = Number(trim);
          if (!Number.isFinite(n) || n < 0 || n > 100000) {
            throw new Error("Price must be a non-negative number up to 100000");
          }
          await patchMut.mutateAsync({ base_price: n });
        }
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
      // First photo flips visibility on. Subsequent uploads don't touch it.
      const wasEmpty =
        !puppy.primary_photo &&
        (!Array.isArray(puppy.photos) || puppy.photos.length === 0);
      if (wasEmpty) patch.is_publicly_visible = true;
      patchMut.mutate(patch);
      return next;
    });
  }

  async function handleNext() {
    await persistCurrent();
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
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
    <div className="mx-auto max-w-screen-sm space-y-5 px-4 py-6">
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
          </>
        )}

        {step === "notes" && (
          <>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sweetest girl in the litter, loves squeaky toys."
              rows={5}
            />
          </>
        )}

        {step === "done" && (
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold">All set</h2>
            <p className="text-sm text-muted-foreground">
              {name} is saved. Head back to capture the next puppy.
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
  );
}
