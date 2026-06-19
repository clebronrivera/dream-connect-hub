// Public puppy detail media collage.
//
// Renders a smart grid of photos (1 / 2 / 3 / 4+) plus an optional video
// tile. Clicking any tile opens a lightbox dialog with the full media.
// The grid auto-sizes — no blank boxes for missing photos. If a video
// exists, it appears as a tile with a play-icon overlay so the buyer
// knows it's playable.

import { useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PlayCircle, Dog, ChevronLeft, ChevronRight } from "lucide-react";
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

  // Lightbox navigation. Cycles through ALL media (wraps around), so the
  // photos hidden behind the "+N" overlay are reachable too. Used by the
  // prev/next arrows, the keyboard arrows, and mobile swipe.
  const showNav = items.length > 1;
  const goPrev = () =>
    setActiveIdx((idx) =>
      idx == null ? idx : (idx - 1 + items.length) % items.length,
    );
  const goNext = () =>
    setActiveIdx((idx) =>
      idx == null ? idx : (idx + 1) % items.length,
    );
  const touchStartX = useRef<number | null>(null);

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
        <DialogContent
          className="max-w-3xl p-0"
          onKeyDown={(e) => {
            if (!showNav) return;
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              goPrev();
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              goNext();
            }
          }}
        >
          {/* Arrow + swipe navigable viewer. */}
          <div
            className="relative"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current == null) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(dx) < 40) return; // ignore taps / tiny drags
              if (dx > 0) goPrev();
              else goNext();
            }}
          >
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

            {showNav && active && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </button>
                <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-sm font-medium text-white">
                  {(activeIdx ?? 0) + 1} / {items.length}
                </span>
              </>
            )}
          </div>
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

