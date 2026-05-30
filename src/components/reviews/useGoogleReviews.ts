import { useQuery } from '@tanstack/react-query';
import { fetchGoogleReviews } from '@/lib/google-reviews-api';

/**
 * Shared query for the live Google reviews. Both the home-page rating badge and
 * the reviews section consume this; TanStack Query dedupes to a single network
 * call. Data is cached server-side (edge function), so the client cache can be
 * generous.
 */
export function useGoogleReviews() {
  return useQuery({
    queryKey: ['google-reviews'],
    queryFn: fetchGoogleReviews,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
}
