import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DashboardInventory {
  availableProductCount: number;
  kitCount: number;
}

export function useDashboardInventory() {
  return useQuery({
    queryKey: ['dashboard-inventory'],
    queryFn: async (): Promise<DashboardInventory> => {
      const [productsRes, kitsRes] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'available'),
        supabase.from('kits').select('*', { count: 'exact', head: true }),
      ]);

      return {
        availableProductCount: productsRes.error ? 0 : (productsRes.count ?? 0),
        kitCount: kitsRes.error ? 0 : (kitsRes.count ?? 0),
      };
    },
  });
}
