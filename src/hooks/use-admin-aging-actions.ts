import { useQuery } from '@tanstack/react-query';
import { fetchAgingActions } from '@/lib/admin/insights-service';

export function useAdminAgingActions() {
  return useQuery({
    queryKey: ['admin-aging-actions'],
    queryFn: fetchAgingActions,
    refetchInterval: 30_000,
  });
}
