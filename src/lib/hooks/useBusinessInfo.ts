import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { BUSINESS } from '../constants/business';

export interface BusinessInfo {
  phone: string;
  phoneRaw: string;
  email: string;
  locations: Array<{ city: string; state: string; isPrimary: boolean }>;
}

/**
 * Fetch business info from site_settings table.
 * Falls back to BUSINESS constants if the DB is unreachable.
 */
export function useBusinessInfo() {
  return useQuery<BusinessInfo, Error>({
    queryKey: ['business-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('phone, phone_raw, email, locations')
        .eq('id', 1)
        .single();

      if (error) {
        console.warn('Failed to fetch business info from DB, using defaults:', error);
        return {
          phone: BUSINESS.phone,
          phoneRaw: BUSINESS.phoneRaw,
          email: BUSINESS.email,
          locations: BUSINESS.locations,
        };
      }

      return {
        phone: data.phone || BUSINESS.phone,
        phoneRaw: data.phone_raw || BUSINESS.phoneRaw,
        email: data.email || BUSINESS.email,
        locations: data.locations || BUSINESS.locations,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Get business info synchronously if available, otherwise use defaults.
 * Useful for components that need the data immediately.
 */
export function useBusinessInfoOrDefaults(): BusinessInfo {
  const query = useBusinessInfo();

  return query.data || {
    phone: BUSINESS.phone,
    phoneRaw: BUSINESS.phoneRaw,
    email: BUSINESS.email,
    locations: BUSINESS.locations,
  };
}
