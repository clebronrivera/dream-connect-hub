import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface RawPuppyInquiry {
  id: string;
  created_at: string;
  name: string;
  puppy_name?: string;
  puppy_name_at_submit?: string;
  admin_viewed_at: string | null;
}

export interface RawContactMessage {
  id: string;
  created_at: string;
  name: string;
  subject: string;
  upcoming_litter_label?: string | null;
  admin_viewed_at: string | null;
}

export interface DashboardRecent {
  recentPuppyInquiries: RawPuppyInquiry[];
  recentContact: RawContactMessage[];
}

export function useDashboardRecent() {
  return useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: async (): Promise<DashboardRecent> => {
      const [recentPuppyInquiriesRes, recentContactRes] = await Promise.all([
        supabase
          .from('puppy_inquiries')
          .select('id, created_at, name, puppy_name, puppy_name_at_submit, admin_viewed_at')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('contact_messages')
          .select('id, created_at, name, subject, upcoming_litter_label, admin_viewed_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      return {
        recentPuppyInquiries: (recentPuppyInquiriesRes.error ? [] : (recentPuppyInquiriesRes.data ?? [])) as RawPuppyInquiry[],
        recentContact: (recentContactRes.error ? [] : (recentContactRes.data ?? [])) as RawContactMessage[],
      };
    },
  });
}
