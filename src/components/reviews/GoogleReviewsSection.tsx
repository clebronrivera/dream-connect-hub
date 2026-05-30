import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useGoogleReviews } from './useGoogleReviews';
import { ReviewStars, GoogleGlyph } from './ReviewStars';
import { StickerButton } from '@/components/redesign/PublicDesignPrimitives';
import type { GoogleReview } from '@/lib/google-reviews-api';

const pink = '#ff3399';
const sectionContainerClass = 'mx-auto max-w-screen-2xl px-6 md:px-8';
const glassCardClass =
  'rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl';

function Avatar({ review }: { review: GoogleReview }) {
  const [failed, setFailed] = useState(false);
  const initial = review.authorName.charAt(0).toUpperCase() || 'G';

  if (review.authorPhotoUri && !failed) {
    return (
      <img
        src={review.authorPhotoUri}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ff3399]/20 font-bold text-white">
      {initial}
    </div>
  );
}

function ReviewCard({ review }: { review: GoogleReview }) {
  return (
    <figure className={`${glassCardClass} flex break-inside-avoid flex-col gap-4 p-6`}>
      <div className="flex items-center justify-between">
        <ReviewStars rating={review.rating} size={16} />
        <GoogleGlyph size={18} />
      </div>
      <blockquote className="text-[15px] leading-relaxed text-white/80">
        “{review.text}”
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-3 pt-2">
        <Avatar review={review} />
        <div className="min-w-0">
          <div className="truncate font-semibold text-white">
            {review.authorName}
          </div>
          {review.relativeTime && (
            <div className="text-xs text-white/50">{review.relativeTime}</div>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

type GoogleReviewsSectionProps = {
  /** Max reviews to show (Google returns up to 5). */
  limit?: number;
};

/**
 * Home-page section: a "4.9 ★ on Google" summary header plus review cards
 * pulled live from the Google Places API. Renders nothing until data exists,
 * so the page degrades gracefully before the API key is configured.
 */
export function GoogleReviewsSection({ limit = 5 }: GoogleReviewsSectionProps) {
  const { data } = useGoogleReviews();

  if (!data || typeof data.rating !== 'number') return null;
  const reviews = data.reviews.slice(0, limit);
  if (reviews.length === 0) return null;

  const count = data.userRatingsTotal;
  const mapsUri = data.googleMapsUri ?? undefined;

  return (
    <section className="border-t border-white/10 bg-[#0a0214] py-16 md:py-20">
      <div className={sectionContainerClass}>
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-[#ff3399]">
            Loved by families
          </div>
          <h2 className="font-display text-4xl font-black tracking-tighter text-white md:text-5xl">
            Real reviews, real puppy parents
          </h2>

          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 backdrop-blur-xl">
            <GoogleGlyph size={24} />
            <span className="font-display text-3xl font-black leading-none text-white">
              {data.rating.toFixed(1)}
            </span>
            <ReviewStars rating={data.rating} size={22} />
            {typeof count === 'number' && count > 0 && (
              <span className="text-sm font-medium text-white/70">
                {count.toLocaleString()} Google reviews
              </span>
            )}
          </div>
        </div>

        <div className="columns-1 gap-6 [column-fill:_balance] sm:columns-2 lg:columns-3 [&>*]:mb-6">
          {reviews.map((review, i) => (
            <ReviewCard key={`${review.authorName}-${i}`} review={review} />
          ))}
        </div>

        {mapsUri && (
          <div className="mt-12 flex flex-col items-center gap-4">
            <StickerButton
              size="lg"
              className="rounded-3xl bg-[#5b21b6] px-10 py-4 text-base font-bold normal-case tracking-normal text-white shadow-[0_6px_0_#7c3aed,0_14px_30px_rgba(124,58,237,0.45)] hover:bg-[#7c3aed] hover:shadow-[0_6px_0_#a78bfa,0_16px_34px_rgba(167,139,250,0.5)]"
              asChild
            >
              <a
                href={mapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-x-3"
              >
                <span>Read all reviews on Google</span>
                <ExternalLink className="size-5 shrink-0" aria-hidden style={{ color: '#fff' }} />
              </a>
            </StickerButton>
            <a
              href={mapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-white/60 underline-offset-4 hover:text-white hover:underline"
              style={{ textDecorationColor: pink }}
            >
              Leave us a review →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
