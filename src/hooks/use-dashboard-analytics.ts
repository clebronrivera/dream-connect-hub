import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SUBJECT_UPCOMING_LITTER } from '@/lib/inquiry-subjects';

export interface DashboardAnalytics {
  totalInquiryCount: number;
  earliestInquiry: string | null;
  soldByBreed: Record<string, number>;
  breedCountFromInquiries: Record<string, number>;
}

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async (): Promise<DashboardAnalytics> => {
      const [
        puppyInquiriesEarliestRes,
        puppyInquiriesCountRes,
        contactEarliestRes,
        contactCountRes,
        soldPuppiesRes,
        puppyInquiriesForBreedRes,
        puppiesIdBreedRes,
        contactUpcomingForBreedRes,
        upcomingLittersIdBreedRes,
      ] = await Promise.all([
        supabase.from('puppy_inquiries').select('created_at').order('created_at', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('puppy_inquiries').select('*', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('created_at').order('created_at', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }),
        supabase.from('puppies').select('breed').eq('status', 'Sold'),
        supabase.from('puppy_inquiries').select('puppy_id').not('puppy_id', 'is', null),
        supabase.from('puppies').select('id, breed'),
        supabase.from('contact_messages').select('upcoming_litter_id').eq('subject', SUBJECT_UPCOMING_LITTER).not('upcoming_litter_id', 'is', null),
        supabase.from('upcoming_litters').select('id, breed'),
      ]);

      const puppyEarliest =
        puppyInquiriesEarliestRes.data && !puppyInquiriesEarliestRes.error
          ? (puppyInquiriesEarliestRes.data as { created_at?: string })?.created_at ?? null
          : null;
      const contactEarliest =
        contactEarliestRes.data && !contactEarliestRes.error
          ? (contactEarliestRes.data as { created_at?: string })?.created_at ?? null
          : null;
      const earliestInquiry =
        [puppyEarliest, contactEarliest].filter(Boolean).sort()[0] ?? null;

      const totalInquiryCount =
        (puppyInquiriesCountRes.error ? 0 : (puppyInquiriesCountRes.count ?? 0)) +
        (contactCountRes.error ? 0 : (contactCountRes.count ?? 0));

      const puppyIdBreedMap = new Map<string, string>();
      ((puppiesIdBreedRes.data ?? []) as { id: string; breed: string }[]).forEach((p) =>
        puppyIdBreedMap.set(p.id, p.breed)
      );
      const litterIdBreedMap = new Map<string, string>();
      ((upcomingLittersIdBreedRes.data ?? []) as { id: string; breed: string }[]).forEach((l) =>
        litterIdBreedMap.set(l.id, l.breed)
      );

      const breedCountFromInquiries: Record<string, number> = {};
      ((puppyInquiriesForBreedRes.data ?? []) as { puppy_id: string }[]).forEach((inq) => {
        const breed = puppyIdBreedMap.get(inq.puppy_id);
        if (breed) breedCountFromInquiries[breed] = (breedCountFromInquiries[breed] ?? 0) + 1;
      });
      ((contactUpcomingForBreedRes.data ?? []) as { upcoming_litter_id: string }[]).forEach((msg) => {
        const breed = litterIdBreedMap.get(msg.upcoming_litter_id);
        if (breed) breedCountFromInquiries[breed] = (breedCountFromInquiries[breed] ?? 0) + 1;
      });

      const soldPuppies = soldPuppiesRes.error ? [] : (soldPuppiesRes.data ?? []) as { breed: string }[];
      const soldByBreed: Record<string, number> = {};
      soldPuppies.forEach((p) => {
        soldByBreed[p.breed] = (soldByBreed[p.breed] ?? 0) + 1;
      });

      return { totalInquiryCount, earliestInquiry, soldByBreed, breedCountFromInquiries };
    },
  });
}
