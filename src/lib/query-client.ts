import { QueryClient } from "@tanstack/react-query";
import { isTransientSupabaseReadError } from "@/lib/supabase-query-retry";

/** Query client used by the app (shared by main entry and SEO postbuild). */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute - reduces refetch on tab focus for admin/dashboard
        // Extra attempts when Supabase/fetch returns transient AbortError or network blips.
        retry: (failureCount, error) => {
          if (isTransientSupabaseReadError(error)) return failureCount < 4;
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(800 * 2 ** attemptIndex, 8000),
      },
    },
  });
}
