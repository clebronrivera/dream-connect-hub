// Public puppy detail media collage.
//
// Renders a smart grid of photos (1 / 2 / 3 / 4+) plus an optional video
// tile. Clicking any tile opens a lightbox dialog with the full media.
// The grid auto-sizes — no blank boxes for missing photos. If a video
// exists, it appears as a tile with a play-icon overlay so the buyer
// knows it's playable.

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PlayCircle, Dog } from "lucide-react";
import {
  puppyMediaLayoutClass,
  puppyMediaTileClass,
} from "./puppyMediaLayout";

interface MediaItem {
  kind: "photo" | "video";
  url: string;
}

interface PuppyMediaCollageProps {
  photos: string[];          // resolved public URLs, already deduped, no nulls
  videoUrl: string | null;
  alt: string;               // alt text for the photos (puppy name)
}

export function PuppyMediaCollage({ photos, videoUrl, alt }: PuppyMediaCollageProps) {
  const items: MediaItem[] = [
    ...photos.map((url) => ({ kind: "photo" as const, url })),
    ...(videoUrl ? [{ kind: "video" as const, url: videoUrl }] : []),
  ];
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const active = activeIdx != null ? items[activeIdx] : null;

  if (items.length === 0) {
    return (
      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
        <Dog className="h-24 w-24 text-muted-foreground/50" aria-hidden />
      </div>
    );
  }

  // Decide the grid layout from total tile count. Visible tiles are
  // capped at 4 for the 5+ case; the 4th tile shows a "+N more" overlay.
  const total = items.length;
  const visibleCount = total <= 4 ? total : 4;
  const visible = items.slice(0, visibleCount);
  const overflow = total - visibleCount;

  return (
    <>
      <div className={puppyMediaLayoutClass(visibleCount)}>
        {visible.map((item, i) => {
          const isLast = i === visibleCount - 1;
          const showOverflow = isLast && overflow > 0;
          return (
            <button
              key={`${item.kind}-${item.url}-${i}`}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`group relative overflow-hidden rounded-lg bg-muted ${
                puppyMediaTileClass(visibleCount, i)
              }`}
              aria-label={
                item.kind === "video"
                  ? "Play video of this puppy"
                  : `View photo ${i + 1} of ${alt}`
              }
            >
              {item.kind === "photo" ? (
                <>
                  {/* Blurred copy of the photo fills any letterboxing left
                      by object-contain. Same image, large scale + heavy
                      blur — keeps the tile visually full while the main
                      image is shown in its entirety. */}
                  <div
                    className="absolute inset-0 scale-110 bg-cover bg-center blur-xl opacity-60"
                    style={{ backgroundImage: `url(${item.url})` }}
                    aria-hidden
                  />
                  <img
                    src={item.url}
                    alt={`${alt} photo ${i + 1}`}
                    className="relative h-full w-full object-contain transition group-hover:scale-[1.02]"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </>
              ) : (
                <VideoThumb url={item.url} />
              )}
              {item.kind === "video" && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
                  <PlayCircle
                    className="h-12 w-12 text-white drop-shadow-lg"
                    aria-hidden
                  />
                </span>
              )}
              {showOverflow && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">
                  +{overflow}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Dialog
        open={active != null}
        onOpenChange={(o) => {
          if (!o) setActiveIdx(null);
        }}
      >
        <DialogContent className="max-w-3xl p-0">
          {active && active.kind === "photo" && (
            <img
              src={active.url}
              alt={alt}
              className="h-auto max-h-[85vh] w-full rounded-lg object-contain"
            />
          )}
          {active && active.kind === "video" && (
            <video
              src={active.url}
              controls
              autoPlay
              playsInline
              className="h-auto max-h-[85vh] w-full rounded-lg bg-black"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function VideoThumb({ url }: { url: string }) {
  // Use the video element itself as a poster — most browsers will render
  // the first frame on metadata load. preload="metadata" keeps this cheap.
  // object-contain matches the photo tiles so the framing is consistent.
  return (
    <video
      src={url}
      preload="metadata"
      muted
      playsInline
      className="h-full w-full bg-black object-contain"
    />
  );
}

