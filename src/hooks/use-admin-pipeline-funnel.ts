import { useQuery } from '@tanstack/react-query';
import { fetchPipelineFunnel } from '@/lib/admin/insights-service';

export function useAdminPipelineFunnel() {
  return useQuery({
    queryKey: ['admin-pipeline-funnel'],
    queryFn: fetchPipelineFunnel,
    refetchInterval: 30_000,
  });
}
