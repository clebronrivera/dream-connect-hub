// src/lib/payment-dashboard-service.ts
// Wave D: buyer-side payment dashboard service.
//
// The dashboard at /payment/<agreement_id>/<buyer_token> reads the agreement
// via PostgREST while sending the token in an `x-buyer-token` header. The
// `public_read_via_buyer_token` RLS policy on `deposit_agreements` matches
// that header against the row's `buyer_access_token` column AND the non-
// expired `buyer_access_token_expires_at` window. PostgREST header pass-
// through was verified by the Wave D P7 PoC on 2026-05-06.
//
// Each request gets a fresh, narrowly-scoped supabase client because the
// session-shared client at @/lib/supabase-client doesn't carry the buyer
// token header.

import { createClient } from '@supabase/supabase-js';
import { appEnv } from '@/lib/env';
import type { DepositAgreement } from '@/types/deposit';

function buyerTokenClient(buyerToken: string) {
  const url = appEnv.supabaseUrl;
  const anonKey = appEnv.supabaseAnonKey;
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  return createClient(url, anonKey, {
    global: { headers: { 'x-buyer-token': buyerToken } },
    auth: {
      // Don't persist or autorefresh — this client is one-shot per page.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export type PaymentDashboardLoadResult =
  | { status: 'ok'; agreement: DepositAgreement }
  | { status: 'not_found' }
  | { status: 'expired' };

/**
 * Load an agreement on behalf of the buyer using their access token.
 *
 * Outcomes:
 *  - `ok`        — token matched, row returned
 *  - `not_found` — RLS denied (wrong token or no such agreement)
 *  - `expired`   — token matches but the 30-day window passed
 *
 * RLS denies expired tokens at the policy level, so an expired token reads
 * as `not_found` from the row fetch. To distinguish, we follow up with a
 * lightweight check: if the row didn't load, ask the agreements table —
 * via the admin/SELECT-allowed `id` lookup — using the same tokenized
 * client; PostgREST is RLS-bound so the same denial applies. Without admin
 * context we can't know "expired vs. invalid" at the SELECT level. The
 * dashboard treats both as "link not active" and points the buyer to the
 * operator phone.
 */
export async function fetchAgreementByToken(
  agreementId: string,
  buyerToken: string
): Promise<PaymentDashboardLoadResult> {
  const c = buyerTokenClient(buyerToken);
  const { data, error } = await c
    .from('deposit_agreements')
    .select('*')
    .eq('id', agreementId)
    .maybeSingle();

  if (error) {
    // Network/server error — surface as not_found so the dashboard shows the
    // friendly contact-us state. (We don't try to differentiate causes.)
    return { status: 'not_found' };
  }
  if (!data) return { status: 'not_found' };

  const agreement = data as DepositAgreement;
  // RLS already enforces non-expiry; this is a defensive client-side check
  // for clock skew / edge cases.
  if (
    agreement.buyer_access_token_expires_at &&
    new Date(agreement.buyer_access_token_expires_at).getTime() < Date.now()
  ) {
    return { status: 'expired' };
  }
  return { status: 'ok', agreement };
}
