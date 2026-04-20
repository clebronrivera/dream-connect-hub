// Admin CRUD + edge function calls for deposit_requests

import { supabase } from "@/lib/supabase-client";
import type {
  DepositRequest,
  DepositRequestStatus,
  DepositRequestCounts,
} from "@/types/deposit-request";

/** List all deposit requests, newest first. Optionally filter by status. */
export async function fetchDepositRequests(
  statusFilter?: DepositRequestStatus | "all"
): Promise<DepositRequest[]> {
  let query = supabase
    .from("deposit_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("request_status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DepositRequest[];
}

/** Fetch single request. */
export async function fetchDepositRequest(id: string): Promise<DepositRequest> {
  const { data, error } = await supabase
    .from("deposit_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as DepositRequest;
}

/** Counts for each status (for action badges). */
export async function fetchDepositRequestCounts(): Promise<DepositRequestCounts> {
  const statuses: DepositRequestStatus[] = [
    "pending",
    "accepted",
    "deposit_link_sent",
    "converted",
    "declined",
  ];

  const results = await Promise.all(
    statuses.map((s) =>
      supabase
        .from("deposit_requests")
        .select("id", { count: "exact", head: true })
        .eq("request_status", s)
    )
  );

  const counts: DepositRequestCounts = {
    pending: 0,
    accepted: 0,
    deposit_link_sent: 0,
    converted: 0,
    declined: 0,
  };
  statuses.forEach((s, i) => {
    counts[s] = results[i].count ?? 0;
  });
  return counts;
}

/** Fire-and-forget customer email via send-request-decision edge function.
 * Email failure must NOT roll back the DB status change — we log and continue. */
async function notifyCustomerOfDecision(
  id: string,
  decision: "accepted" | "declined",
  reason?: string
): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;
    await supabase.functions.invoke("send-request-decision", {
      body: { deposit_request_id: id, decision, reason },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    console.error("send-request-decision failed:", err);
  }
}

/** Accept a pending request. Sends customer "link coming" email (O4). */
export async function acceptDepositRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("deposit_requests")
    .update({
      request_status: "accepted",
      admin_reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  await notifyCustomerOfDecision(id, "accepted");
}

/** Decline a request with a reason. Sends customer closure email. */
export async function declineDepositRequest(
  id: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from("deposit_requests")
    .update({
      request_status: "declined",
      decline_reason: reason,
      admin_reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  await notifyCustomerOfDecision(id, "declined", reason);
}

/** Save admin notes. */
export async function updateDepositRequestNotes(
  id: string,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from("deposit_requests")
    .update({ admin_notes: notes })
    .eq("id", id);
  if (error) throw error;
}

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
      // @ts-expect-error context is a Response on FunctionsHttpError
      const ctx: Response | undefined = error.context;
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
