// One row in the breeder Puppies hub.
//
// Shows a primary-photo thumbnail, name, parents/breed context, and the
// status badges that influence what the public site shows. Tapping the
// row routes to the capture flow so the breeder can edit photos, status,
// price, or notes.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Trash2, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { resolvePuppyPhotosPublicUrl } from "@/lib/puppy-photos";
import { deletePuppy, updatePuppy } from "@/lib/breeder/api";
import type { BreederPuppyWithLitter } from "@/lib/breeder/api";
import { PUPPY_COLORS } from "@/lib/breed-utils";

function formatShortDob(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface PuppyHubRowProps {
  puppy: BreederPuppyWithLitter;
  onDeleted?: () => void;
  onPublished?: () => void;
}

export function PuppyHubRow({ puppy, onDeleted, onPublished }: PuppyHubRowProps) {
  const navigate = useNavigate();
  const { session } = useBreederAuth();
  const heroUrl = resolvePuppyPhotosPublicUrl(
    puppy.primary_photo ?? puppy.photos?.[0] ?? null,
  );
  const parents = [puppy.dam_name, puppy.sire_name]
    .filter(Boolean)
    .join(" × ");
  const totalPhotos =
    (puppy.primary_photo ? 1 : 0) + (puppy.photos?.length ?? 0);
  const dobLabel = formatShortDob(puppy.date_of_birth);

  // Inline edit state. Inputs are uncontrolled-ish: we mirror DB values into
  // local state and save on blur (price) / change (color). On save error we
  // revert to the prior DB value so the UI never lies.
  const [priceText, setPriceText] = useState<string>(
    puppy.base_price != null ? String(puppy.base_price) : "",
  );
  const [colorValue, setColorValue] = useState<string>(puppy.color ?? "");

  const updateMut = useMutation({
    mutationFn: async (fields: Parameters<typeof updatePuppy>[2]) => {
      if (!session) throw new Error("No breeder session");
      const res = await updatePuppy(session.token, puppy.id, fields);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => onPublished?.(),
    onError: (err: Error) => {
      toast.error(err.message);
      // Revert local state so it matches what's actually persisted.
      setPriceText(puppy.base_price != null ? String(puppy.base_price) : "");
      setColorValue(puppy.color ?? "");
    },
  });

  function savePrice() {
    const trimmed = priceText.trim();
    const initial = puppy.base_price != null ? String(puppy.base_price) : "";
    if (trimmed === initial) return;
    if (trimmed === "") {
      updateMut.mutate({ base_price: null });
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 100000) {
      toast.error("Price must be 0–100000");
      setPriceText(initial);
      return;
    }
    updateMut.mutate({ base_price: n });
  }

  function saveColor(next: string) {
    setColorValue(next);
    updateMut.mutate({ color: next || null });
  }
  // Puppies that aren't tied to an active upcoming_litter still open in the
  // capture flow; the ?from= param just controls where the wizard's back
  // button lands. Fall back to /breeder when missing.
  const captureHref = puppy.upcoming_litter_id
    ? `/breeder/puppies/${puppy.id}/capture?from=${puppy.upcoming_litter_id}`
    : `/breeder/puppies/${puppy.id}/capture`;

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await deletePuppy(session.token, puppy.id);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success(`${puppy.name} deleted`);
      onDeleted?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await updatePuppy(session.token, puppy.id, {
        is_publicly_visible: true,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success(`${puppy.name} is now on the public site`);
      onPublished?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // A puppy is ready to publish from the hub when it has at least one photo,
  // is set to Available, and isn't already visible. Anything else needs a trip
  // through the wizard (no photos yet, wrong status, etc.).
  const canPublishFromHub =
    puppy.is_publicly_visible === false &&
    (puppy.status ?? "Available") === "Available" &&
    totalPhotos > 0;

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => navigate(captureHref)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(captureHref);
        }
      }}
      className="flex cursor-pointer items-center gap-3 p-3 transition hover:bg-muted/40"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
        {heroUrl ? (
          <img
            src={heroUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{puppy.name}</span>
          <Badge variant="outline" className="text-[10px]">
            {puppy.gender === "Male" ? "Boy" : "Girl"}
          </Badge>
          {puppy.status && puppy.status !== "Available" && (
            <Badge variant="secondary" className="text-[10px]">
              {puppy.status}
            </Badge>
          )}
          {puppy.is_publicly_visible === false && (
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground"
            >
              Hidden
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {parents || puppy.breed}
          {parents && puppy.breed && ` · ${puppy.breed}`}
          {totalPhotos > 0
            ? ` · ${totalPhotos} photo${totalPhotos === 1 ? "" : "s"}`
            : " · No photos yet"}
          {dobLabel && ` · DOB ${dobLabel}`}
        </p>
        {/* Inline quick edits — stopPropagation so interacting with these
            controls doesn't trigger the row navigate. */}
        <div
          className="mt-1.5 flex flex-wrap items-center gap-2 text-xs"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">$</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="50"
              value={priceText}
              placeholder="Price"
              onChange={(e) => setPriceText(e.target.value)}
              onBlur={savePrice}
              disabled={updateMut.isPending}
              className="h-7 w-24 px-2 text-xs"
              aria-label={`Set price for ${puppy.name}`}
            />
          </label>
          <Select value={colorValue || undefined} onValueChange={saveColor}>
            <SelectTrigger
              className="h-7 w-32 px-2 text-xs"
              aria-label={`Set color for ${puppy.name}`}
              disabled={updateMut.isPending}
            >
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              {PUPPY_COLORS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {updateMut.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
      {canPublishFromHub && (
        <Button
          size="sm"
          variant="default"
          className="h-8 shrink-0 gap-1.5"
          disabled={publishMut.isPending}
          onClick={(e) => {
            e.stopPropagation();
            publishMut.mutate();
          }}
          aria-label={`Publish ${puppy.name} to the public site`}
        >
          {publishMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden />
          )}
          Publish
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={deleteMut.isPending}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Delete ${puppy.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete {puppy.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the puppy record entirely, along with any attached
              photos, video, and expense entries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                deleteMut.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {puppy.name}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </li>
  );
}
