import { useQuery } from '@tanstack/react-query';
import { fetchRevenueMonthly } from '@/lib/admin/insights-service';

export function useAdminRevenueMonthly() {
  return useQuery({
    queryKey: ['admin-revenue-monthly'],
    queryFn: fetchRevenueMonthly,
    staleTime: 60_000,
  });
}
