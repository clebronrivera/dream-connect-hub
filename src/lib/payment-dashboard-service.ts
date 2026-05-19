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
import { supabase } from '@/lib/supabase-client';
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

export interface PaymentAttestationRow {
  id: string;
  agreement_id: string;
  attestation_status: 'draft' | 'signed';
  payment_method_handle_to_use: string | null;
  buyer_payment_handle: string | null;
  buyer_payment_handle_screenshot_path: string | null;
  buyer_phone_at_payment: string | null;
  payment_attestation_text: string | null;
  payment_attestation_signed_at: string | null;
  confirmation_screenshot_path: string | null;
  transaction_reference_id: string | null;
  payment_memo_used: string | null;
  confirmation_captured_at: string | null;
}

/**
 * Fetch the buyer's payment_attestations row (one per agreement). Uses the
 * same one-shot buyer-token-bearing client as fetchAgreementByToken; the
 * Wave H phase 1a public_select_via_buyer_token RLS policy gates access.
 *
 * Returns null when the row doesn't exist yet (buyer hasn't started the
 * H1 attestation form). Returns the row otherwise — caller branches on
 * attestation_status / confirmation_captured_at to decide which UI step
 * to render.
 */
export async function fetchPaymentAttestation(
  agreementId: string,
  buyerToken: string
): Promise<PaymentAttestationRow | null> {
  const url = appEnv.supabaseUrl;
  const anonKey = appEnv.supabaseAnonKey;
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  const c = createClient(url, anonKey, {
    global: { headers: { 'x-buyer-token': buyerToken } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await c
    .from('payment_attestations')
    .select('*')
    .eq('agreement_id', agreementId)
    .maybeSingle();
  if (error) return null;
  return (data as PaymentAttestationRow | null) ?? null;
}

export interface MarkPaymentSentResult {
  success: boolean;
  already_marked?: boolean;
  marked_at?: string;
}

/**
 * Calls the public `mark-payment-sent` edge function (Wave D D3) when the
 * buyer clicks "I have sent payment" on the dashboard. The function
 * validates the (agreement_id, buyer_access_token) pair server-side via
 * verifyBuyerToken, then idempotently sets buyer_marked_payment_sent_at
 * and emails admins.
 */
export async function markPaymentSent(
  agreementId: string,
  buyerToken: string
): Promise<MarkPaymentSentResult> {
  const { data, error } = await supabase.functions.invoke<MarkPaymentSentResult>(
    'mark-payment-sent',
    {
      body: { agreement_id: agreementId, buyer_access_token: buyerToken },
    }
  );
  if (error) {
    let detail = error.message || 'Failed to record payment notice';
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx: Response | undefined = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) detail = body.details ? `${body.error}: ${body.details}` : body.error;
      }
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }
  return data!;
}
