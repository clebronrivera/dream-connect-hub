import { QueryClient } from "@tanstack/react-query";

/** Query client used by the app (shared by main entry and SEO postbuild). */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute - reduces refetch on tab focus for admin/dashboard
      },
    },
  });
}
