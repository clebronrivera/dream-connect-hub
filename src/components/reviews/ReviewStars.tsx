import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type ReviewStarsProps = {
  /** Rating from 0–5; supports halves visually by rounding to nearest half. */
  rating: number;
  /** Pixel size of each star. */
  size?: number;
  className?: string;
};

/**
 * Renders 5 stars with the filled portion reflecting `rating`. Uses an overlay
 * clip so fractional ratings (e.g. 4.9) render a partially-filled last star.
 */
export function ReviewStars({ rating, size = 18, className }: ReviewStarsProps) {
  const clamped = Math.max(0, Math.min(5, rating));
  const fillPct = (clamped / 5) * 100;

  return (
    <div
      className={cn('relative inline-flex', className)}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      {/* Empty track */}
      <div className="flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={`bg-${i}`}
            style={{ width: size, height: size }}
            className="text-white/20"
            aria-hidden
          />
        ))}
      </div>
      {/* Filled overlay, clipped to the rating percentage */}
      <div
        className="absolute inset-0 flex overflow-hidden"
        style={{ width: `${fillPct}%` }}
        aria-hidden
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={`fg-${i}`}
            style={{ width: size, height: size }}
            className="shrink-0 fill-[#ffce47] text-[#ffce47]"
          />
        ))}
      </div>
    </div>
  );
}

/** Small multicolor Google "G" glyph for review attribution. */
export function GoogleGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}
