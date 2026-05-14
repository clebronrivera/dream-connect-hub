// Non-interactive multi-photo grid for the public puppy card.
//
// Mirrors PuppyMediaCollage's 1 / 2 / 3 / 4-tile layout so the card
// preview and the modal stay visually consistent. Renders <div> tiles
// instead of <button>s — the card's own onClick opens the detail modal,
// where PuppyMediaCollage takes over with the lightbox + video playback.
// A "+N" overlay appears on the last tile when there are more items than
// can fit. The video tile shows a play-icon overlay (purely visual here;
// the modal is where the video actually plays).

import { PlayCircle, Dog } from "lucide-react";
import {
  puppyMediaLayoutClass,
  puppyMediaTileClass,
} from "./puppyMediaLayout";

interface PuppyMediaThumbsProps {
  photos: string[];          // resolved public URLs, deduped, no nulls
  videoUrl: string | null;
  alt: string;
}

interface MediaItem {
  kind: "photo" | "video";
  url: string;
}

export function PuppyMediaThumbs({ photos, videoUrl, alt }: PuppyMediaThumbsProps) {
  const items: MediaItem[] = [
    ...photos.map((url) => ({ kind: "photo" as const, url })),
    ...(videoUrl ? [{ kind: "video" as const, url: videoUrl }] : []),
  ];

  if (items.length === 0) {
    return (
      <div className="aspect-square flex items-center justify-center bg-muted">
        <Dog className="h-16 w-16 text-muted-foreground/50" aria-hidden />
      </div>
    );
  }

  const total = items.length;
  const visibleCount = total <= 4 ? total : 4;
  const visible = items.slice(0, visibleCount);
  const overflow = total - visibleCount;

  return (
    <div className={puppyMediaLayoutClass(visibleCount)}>
      {visible.map((item, i) => {
        const isLast = i === visibleCount - 1;
        const showOverflow = isLast && overflow > 0;
        return (
          <div
            key={`${item.kind}-${item.url}-${i}`}
            className={`group relative overflow-hidden rounded-lg bg-muted ${
              puppyMediaTileClass(visibleCount, i)
            }`}
          >
            {item.kind === "photo" ? (
              <>
                {/* Same blurred-bg-fill treatment as the modal: keeps tiles
                    visually full while object-contain shows the whole photo. */}
                <div
                  className="absolute inset-0 scale-110 bg-cover bg-center blur-xl opacity-60"
                  style={{ backgroundImage: `url(${item.url})` }}
                  aria-hidden
                />
                <img
                  src={item.url}
                  alt={`${alt} photo ${i + 1}`}
                  className="relative h-full w-full object-contain"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </>
            ) : (
              <ThumbVideo url={item.url} />
            )}
            {item.kind === "video" && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                <PlayCircle
                  className="h-10 w-10 text-white drop-shadow-lg"
                  aria-hidden
                />
              </span>
            )}
            {showOverflow && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-xl font-semibold text-white">
                +{overflow}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ThumbVideo({ url }: { url: string }) {
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
