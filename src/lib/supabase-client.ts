import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appEnv } from '@/lib/env';

const isBrowser = typeof window !== 'undefined';

let client: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = appEnv.supabaseUrl;
  const supabaseAnonKey = appEnv.supabaseAnonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (see .env.example).'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
    },
  });
}

function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient();
  }
  return client;
}

/**
 * Lazy Supabase client.
 *
 * Why a Proxy instead of an eager `createClient(...)` at module scope:
 * `scripts/postbuild-seo.tsx` imports `AppProviders`/`AppRoutes` to prerender
 * SEO tags into the static HTML. That transitively imports this module. When
 * the build environment has not (yet) injected `VITE_SUPABASE_*`, an eager
 * `createClient` call would throw at import time and prevent SEO prerender —
 * even though postbuild-seo.tsx already detects missing env and skips
 * gracefully (see its line ~37).
 *
 * Runtime contract preserved:
 * - Module load: never throws (lets postbuild script load the route tree).
 * - First property access (e.g. `supabase.from(...)`): throws the original
 *   `Missing Supabase config` error if env is absent. ErrorBoundary catches
 *   render-time throws; event-handler throws still surface via toast/UI.
 *
 * Verified by sanity test: module load with missing env succeeds; first
 * access throws with the same message; with env set, real client returned.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const real = getSupabaseClient();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
});
