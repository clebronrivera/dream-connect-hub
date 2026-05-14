import { useQuery } from '@tanstack/react-query';
import { fetchBreedPerformance } from '@/lib/admin/insights-service';

export function useAdminBreedPerformance() {
  return useQuery({
    queryKey: ['admin-breed-performance'],
    queryFn: fetchBreedPerformance,
    staleTime: 60_000,
  });
}
