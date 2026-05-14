import { useQuery } from '@tanstack/react-query';
import { fetchForwardProjection } from '@/lib/admin/insights-service';

export function useAdminForwardProjection() {
  return useQuery({
    queryKey: ['admin-forward-projection'],
    queryFn: fetchForwardProjection,
    staleTime: 60_000,
  });
}
