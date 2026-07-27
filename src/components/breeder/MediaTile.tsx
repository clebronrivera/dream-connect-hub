// One photo or video in the breeder media manager.
//
// The tile is presentational: it renders state and reports taps. All writes
// live in PuppyMediaManagerCard so a single mutation path owns the query cache.
//
// Two visual states matter to the operator at a glance:
//   - is_primary  → gold "Main" badge; this is the photo the public site leads with
//   - !is_public  → dashed border + muted image; staged, not on the site yet

import { Check, Loader2, Pencil, Star, Video } from "lucide-react";
import type { PuppyMediaRow } from "@/lib/breeder/api";
import { resolvePuppyPhotosPublicUrl, resolvePuppyVideoUrl } from "@/lib/puppy-photos";

const KIND_LABELS: Record<string, string> = {
  face: "Face",
  back: "Back",
  top: "Top",
  paw: "Paw",
  candid: "",
  video: "Video",
};

export interface MediaTileProps {
  media: PuppyMediaRow;
  /** Tap the tile — opens the action sheet, unless selection mode is on. */
  onOpen: (media: PuppyMediaRow) => void;
  /** Selection mode (used to bulk-publish staged photos). */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (media: PuppyMediaRow) => void;
  busy?: boolean;
}

export function MediaTile({
  media,
  onOpen,
  selectable,
  selected,
  onToggleSelect,
  busy,
}: MediaTileProps) {
  const isVideo = media.media_type === "video";
  const src = isVideo
    ? resolvePuppyVideoUrl(media.url)
    : resolvePuppyPhotosPublicUrl(media.url);
  const kindLabel = KIND_LABELS[media.kind] ?? "";

  function handleClick() {
    if (busy) return;
    if (selectable && onToggleSelect) onToggleSelect(media);
    else onOpen(media);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={selectable ? !!selected : undefined}
      aria-label={
        selectable
          ? `${selected ? "Deselect" : "Select"} ${media.kind} ${media.media_type}`
          : `Open actions for ${media.kind} ${media.media_type}`
      }
      className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 bg-muted/30 transition active:scale-[0.98] ${
        selected
          ? "border-primary ring-2 ring-primary/30"
          : media.is_public
            ? "border-transparent"
            : "border-dashed border-muted-foreground/40"
      } ${busy ? "opacity-60" : "hover:bg-muted/50"}`}
    >
      {isVideo ? (
        <video
          src={src ?? undefined}
          className={`absolute inset-0 h-full w-full object-cover ${media.is_public ? "" : "opacity-70"}`}
          preload="metadata"
          muted
          playsInline
        />
      ) : (
        <img
          src={src ?? undefined}
          alt=""
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover ${media.is_public ? "" : "opacity-70"}`}
        />
      )}

      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        </div>
      )}

      {media.is_primary && (
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-amber-600 shadow">
          <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden />
          Main
        </span>
      )}

      {isVideo && !busy && (
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-background/90 p-1 shadow">
          <Video className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}

      {kindLabel && !media.is_primary && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow">
          {kindLabel}
        </span>
      )}

      {media.derived_from_media_id && !isVideo && !busy && (
        <span
          className="absolute bottom-1.5 right-1.5 rounded-full bg-background/90 p-1 shadow"
          title="Edited from another photo"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" aria-hidden />
        </span>
      )}

      {selectable && (
        <span
          className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 shadow ${
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-white/80 bg-background/70"
          }`}
        >
          {selected && <Check className="h-3 w-3" aria-hidden />}
        </span>
      )}
    </button>
  );
}
