import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appEnv } from '@/lib/env';

const supabaseUrl = appEnv.supabaseUrl;
const supabaseAnonKey = appEnv.supabaseAnonKey;
const isBrowser = typeof window !== 'undefined';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (see .env.example).'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
});
