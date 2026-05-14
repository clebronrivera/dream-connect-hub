import { useQuery } from '@tanstack/react-query';
import { fetchKpiSummary } from '@/lib/admin/insights-service';

export function useAdminKpiSummary() {
  return useQuery({
    queryKey: ['admin-kpi-summary'],
    queryFn: fetchKpiSummary,
    staleTime: 60_000,
  });
}
