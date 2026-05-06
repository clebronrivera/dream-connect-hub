// supabase/functions/_shared/auth/verifyBuyerToken.ts
//
// Service-role-side validator for the buyer access token. Used by:
//   - Wave D mark-payment-sent
//   - Wave F agreement-download-url
//   - Wave H payment-attestation flow
//
// Pattern: edge functions are deployed with verify_jwt=false. They accept
// (agreement_id, buyer_access_token) in the request body, look up the
// agreement with the service-role client (bypassing RLS), check that
// the token matches the row AND the row is not past its expiry window,
// and return either the agreement row or a structured failure result
// the caller can convert to an HTTP response.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AgreementRow = Record<string, any>;

export type VerifyBuyerTokenResult =
  | { ok: true; status: 200; agreement: AgreementRow }
  | { ok: false; status: number; body: { error: string; details?: string } };

export async function verifyBuyerToken(
  supabase: SupabaseClient,
  agreementId: string | null | undefined,
  buyerToken: string | null | undefined
): Promise<VerifyBuyerTokenResult> {
  if (!agreementId || !buyerToken) {
    return {
      ok: false,
      status: 400,
      body: { error: "Missing agreement_id or buyer_access_token" },
    };
  }

  const { data: agreement, error } = await supabase
    .from("deposit_agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      body: { error: "Failed to look up agreement", details: error.message },
    };
  }
  if (!agreement) {
    return { ok: false, status: 404, body: { error: "Agreement not found" } };
  }
  if (agreement.buyer_access_token !== buyerToken) {
    return {
      ok: false,
      status: 403,
      body: { error: "Invalid token for this agreement" },
    };
  }
  if (
    agreement.buyer_access_token_expires_at &&
    new Date(agreement.buyer_access_token_expires_at).getTime() < Date.now()
  ) {
    return {
      ok: false,
      status: 403,
      body: { error: "Token expired" },
    };
  }

  return { ok: true, status: 200, agreement };
}
