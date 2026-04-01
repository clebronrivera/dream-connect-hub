import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { daysSince } from '@/lib/date-utils';

export interface DashboardStats {
  activePuppyCount: number;
  avgDaysListed: number;
  unseenInquiries: number;
  unseenContact: number;
  unseenConsultations: number;
  unseenProductInquiries: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [
        activePuppiesRes,
        unseenInquiriesRes,
        unseenContactRes,
        unseenConsultationsRes,
        newProductInquiriesRes,
      ] = await Promise.all([
        supabase.from('puppies').select('listing_date, created_at').eq('status', 'Available'),
        supabase.from('puppy_inquiries').select('*', { count: 'exact', head: true }).is('admin_viewed_at', null),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }).is('admin_viewed_at', null),
        supabase.from('consultation_requests').select('*', { count: 'exact', head: true }).is('admin_viewed_at', null),
        supabase.from('product_inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      ]);

      const activePuppies = activePuppiesRes.error ? [] : (activePuppiesRes.data ?? []);
      const totalDays = activePuppies.reduce((sum, p) => {
        const listDate =
          (p as { listing_date?: string; created_at?: string }).listing_date ??
          ((p as { created_at?: string }).created_at
            ? (p as { created_at: string }).created_at.slice(0, 10)
            : null);
        return sum + Math.max(0, daysSince(listDate));
      }, 0);
      const avgDaysListed = activePuppies.length > 0 ? Math.round(totalDays / activePuppies.length) : 0;

      return {
        activePuppyCount: activePuppies.length,
        avgDaysListed,
        unseenInquiries: unseenInquiriesRes.error ? 0 : (unseenInquiriesRes.count ?? 0),
        unseenContact: unseenContactRes.error ? 0 : (unseenContactRes.count ?? 0),
        unseenConsultations: unseenConsultationsRes.error ? 0 : (unseenConsultationsRes.count ?? 0),
        unseenProductInquiries: newProductInquiriesRes.error ? 0 : (newProductInquiriesRes.count ?? 0),
      };
    },
  });
}
