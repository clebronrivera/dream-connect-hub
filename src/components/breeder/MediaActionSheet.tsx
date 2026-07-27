// Bottom sheet of actions for one photo/video in the media manager.
//
// Presentational + intent-reporting only: every action calls back into
// PuppyMediaManagerCard, which owns the mutations and the query cache. That
// keeps optimistic updates and error rollback in one place instead of
// scattered across leaf components.
//
// "Replace" is the one action that needs a file, so the hidden input lives
// here; the chosen File is handed up untouched (compression + upload happen
// in the card alongside every other upload).

import { useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { PuppyMediaKind, PuppyMediaRow } from "@/lib/breeder/api";

/** Structured angles the carousel generator looks for, plus the catch-all.
 *  Videos don't get kind chips — their kind is fixed by a DB constraint. */
const PHOTO_KINDS: { value: Exclude<PuppyMediaKind, "video">; label: string }[] = [
  { value: "face", label: "Face" },
  { value: "back", label: "Back" },
  { value: "top", label: "Top-down" },
  { value: "paw", label: "Paw" },
  { value: "candid", label: "Candid" },
];

export interface MediaActionSheetProps {
  media: PuppyMediaRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether this item can move within the public lane. The main photo is
   *  pinned first by the projection, so it never moves and nothing can move
   *  above it — the card works those rules out and passes the result here. */
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  busy?: boolean;
  onSetPublic: (media: PuppyMediaRow, isPublic: boolean) => void;
  onSetPrimary: (media: PuppyMediaRow) => void;
  onSetKind: (media: PuppyMediaRow, kind: PuppyMediaKind) => void;
  onMove: (media: PuppyMediaRow, direction: -1 | 1) => void;
  onReplace: (media: PuppyMediaRow, file: File) => void;
  onDelete: (media: PuppyMediaRow) => void;
  /** Opens the crop/enhance/background-removal sheet. Omitted (or the item
   *  being a video) hides the button — editing tools are photo-only. */
  onEdit?: (media: PuppyMediaRow) => void;
}

export function MediaActionSheet({
  media,
  open,
  onOpenChange,
  canMoveEarlier,
  canMoveLater,
  busy,
  onSetPublic,
  onSetPrimary,
  onSetKind,
  onMove,
  onReplace,
  onDelete,
  onEdit,
}: MediaActionSheetProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  if (!media) return null;

  const isVideo = media.media_type === "video";
  const accept = isVideo
    ? "video/mp4,video/webm,video/quicktime"
    : "image/jpeg,image/png,image/webp";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{isVideo ? "Video" : "Photo"} options</SheetTitle>
          <SheetDescription>
            {media.is_public
              ? "Showing on the public site."
              : "In staging — not on the public site yet."}
            {media.derived_from_media_id ? " Edited from another photo." : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* ── Visibility ── */}
          <Button
            variant={media.is_public ? "outline" : "default"}
            className="h-12 w-full justify-start gap-3"
            disabled={busy}
            onClick={() => onSetPublic(media, !media.is_public)}
          >
            {media.is_public ? (
              <>
                <EyeOff className="h-4 w-4" aria-hidden />
                Move to staging
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" aria-hidden />
                Publish to the site
              </>
            )}
          </Button>

          {/* Only a public photo can be the main image — the DB enforces it,
              so publishing is folded into the action rather than blocking it. */}
          {!isVideo && !media.is_primary && (
            <Button
              variant="outline"
              className="h-12 w-full justify-start gap-3"
              disabled={busy}
              onClick={() => onSetPrimary(media)}
            >
              <Star className="h-4 w-4" aria-hidden />
              Make this the main photo
            </Button>
          )}

          {/* ── Ordering ── */}
          {media.is_public && (canMoveEarlier || canMoveLater) && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-12 flex-1 gap-2"
                disabled={busy || !canMoveEarlier}
                onClick={() => onMove(media, -1)}
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
                Earlier
              </Button>
              <Button
                variant="outline"
                className="h-12 flex-1 gap-2"
                disabled={busy || !canMoveLater}
                onClick={() => onMove(media, 1)}
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
                Later
              </Button>
            </div>
          )}

          {/* ── Kind ── */}
          {!isVideo && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                What kind of shot is this?
              </p>
              <div className="flex flex-wrap gap-2">
                {PHOTO_KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    disabled={busy}
                    aria-pressed={media.kind === k.value}
                    onClick={() => onSetKind(media, k.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                      media.kind === k.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background hover:bg-muted"
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Labels feed the post generator — it uses the face shot for the
                lead slide and the back/top/paw shots for the angles slide.
              </p>
            </div>
          )}

          {/* ── Edit ── */}
          {!isVideo && onEdit && (
            <Button
              variant="outline"
              className="h-12 w-full gap-2"
              disabled={busy}
              onClick={() => onEdit(media)}
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Crop, enhance, or remove background
            </Button>
          )}

          {/* ── Replace / delete ── */}
          <div className="flex gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="h-12 flex-1 gap-2"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Replace
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 gap-2 text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => onDelete(media)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </Button>
          </div>
        </div>

        {/* No `capture` attribute: the operator is picking shots they already
            took, so the phone should offer the full library action sheet. */}
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onReplace(media, file);
            e.target.value = "";
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
