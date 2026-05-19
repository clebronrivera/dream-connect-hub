// Admin edge function calls for the deposit_requests table.
// The reservation redesign (May 2026) retired the public intake form and the
// /admin/deposit-requests triage page. Admins now create reservations directly
// from the puppy detail page via AdminInitiateDepositDialog; the helpers below
// support that single entry point.

import { supabase } from "@/lib/supabase-client";
import type { DepositRequest } from "@/types/deposit-request";

export interface SendDepositLinkResponse {
  success: boolean;
  channel?: string;
  error?: string;
  details?: string;
}

/** Invoke send-deposit-link edge function (email-only). */
export async function sendDepositLink(
  requestId: string,
  customMessage?: string
): Promise<SendDepositLinkResponse> {
  // Explicitly pass the access token so the edge function can verify admin role.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Not signed in. Please log in again.");
  }

  const { data, error } = await supabase.functions.invoke<SendDepositLinkResponse>(
    "send-deposit-link",
    {
      body: {
        deposit_request_id: requestId,
        custom_message: customMessage,
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // supabase.functions.invoke() returns FunctionsHttpError when the response is non-2xx.
  // The actual server JSON body is in error.context (a Response). Read it for the real message.
  if (error) {
    let detail = error.message || "Failed to send deposit link";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) detail = body.details ? `${body.error}: ${body.details}` : body.error;
      }
    } catch {
      /* ignore parse errors, keep original message */
    }
    throw new Error(detail);
  }
  return data!;
}

export interface AdminInitiatedRequestInput {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  city?: string;
  state?: string;
  upcoming_litter_id: string;
  upcoming_litter_label: string;
  upcoming_puppy_placeholder_id?: string | null;
  upcoming_puppy_placeholder_summary?: string | null;
}

/**
 * Admin creates a request on behalf of a customer. Admin inserts bypass the
 * public-insert RLS (admin policy is permissive), so we can set origin and
 * status directly here.
 */
export async function createAdminInitiatedRequest(
  input: AdminInitiatedRequestInput
): Promise<DepositRequest> {
  const { data, error } = await supabase
    .from("deposit_requests")
    .insert([
      {
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        customer_phone: input.customer_phone,
        city: input.city ?? null,
        state: input.state ?? null,
        upcoming_litter_id: input.upcoming_litter_id,
        upcoming_litter_label: input.upcoming_litter_label,
        upcoming_puppy_placeholder_id: input.upcoming_puppy_placeholder_id ?? null,
        upcoming_puppy_placeholder_summary:
          input.upcoming_puppy_placeholder_summary ?? null,
        origin: "admin_initiated",
        request_status: "accepted",
        admin_reviewed_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as DepositRequest;
}
