import { useGoogleReviews } from './useGoogleReviews';
import { ReviewStars, GoogleGlyph } from './ReviewStars';

type GoogleRatingBadgeProps = {
  className?: string;
};

/**
 * Compact, linkable "4.9 ★ on Google · N reviews" badge for the home page hero.
 * Renders nothing until live data is available, so the page never displays a
 * blank or stale rating.
 */
export function GoogleRatingBadge({ className }: GoogleRatingBadgeProps) {
  const { data } = useGoogleReviews();

  if (!data || typeof data.rating !== 'number') return null;

  const href = data.googleMapsUri ?? undefined;
  const count = data.userRatingsTotal;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_10px_25px_-5px_rgb(255_206_71/0.35)] ${className ?? ''}`}
    >
      <GoogleGlyph size={20} />
      <span className="font-display text-2xl font-black leading-none text-white">
        {data.rating.toFixed(1)}
      </span>
      <ReviewStars rating={data.rating} size={18} />
      {typeof count === 'number' && count > 0 && (
        <span className="hidden text-sm font-medium text-white/70 sm:inline">
          {count.toLocaleString()} Google reviews
        </span>
      )}
    </a>
  );
}
