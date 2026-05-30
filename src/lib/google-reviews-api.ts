import { supabase } from './supabase-client';

export type GoogleReview = {
  authorName: string;
  authorPhotoUri: string | null;
  authorUri: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string | null;
};

export type GoogleReviewsData = {
  rating: number | null;
  userRatingsTotal: number | null;
  googleMapsUri: string | null;
  reviews: GoogleReview[];
  fetchedAt: string | null;
};

/**
 * Fetches the live Google rating + review count + up to 5 reviews via the
 * `fetch-google-reviews` edge function (which holds the API key server-side and
 * caches the result). Returns null when the data is unavailable (e.g. the API
 * key has not been configured yet) so callers can hide the UI gracefully.
 */
export async function fetchGoogleReviews(): Promise<GoogleReviewsData | null> {
  const { data, error } = await supabase.functions.invoke('fetch-google-reviews');

  if (error) {
    return null;
  }

  const payload = data as Partial<GoogleReviewsData> | null;
  if (!payload || typeof payload.rating !== 'number') {
    return null;
  }

  return {
    rating: payload.rating ?? null,
    userRatingsTotal: payload.userRatingsTotal ?? null,
    googleMapsUri: payload.googleMapsUri ?? null,
    reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
    fetchedAt: payload.fetchedAt ?? null,
  };
}
