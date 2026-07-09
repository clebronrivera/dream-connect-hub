// Supabase Edge Function: validate a deposit-request link without exposing PII.
//
// The public /deposit?requestId= gate previously read deposit_requests directly
// with the anon client. But deposit_requests has no anon SELECT policy (it holds
// buyer name/email/phone), so that read fails closed under RLS, and "fixing" it
// with a broad anon SELECT would leak buyer PII. This function looks the row up
// with the service role and returns ONLY {valid, reason?, puppyId?, litterId?} —
// never any buyer PII. The requestId UUID is the capability; it is issued only
// to the buyer by email after operator approval.
//
// Required secrets (Supabase Edge Function secrets):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//
// CORS allowlist comes from _shared/cors.ts. Public (verify_jwt=false).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ValidationResult =
  | { valid: false; reason: string }
  | { valid: true; puppyId: string | null; litterId: string | null };

export interface RequestRow {
  request_status: string;
  puppy_id: string | null;
  upcoming_litter_id: string | null;
  deposit_agreement_id: string | null;
}

/**
 * Pure decision logic (unit-tested). Mirrors the rules previously enforced
 * client-side in validateDepositRequest: the request must exist, not be
 * converted, and be in 'deposit_link_sent' status.
 */
export function evaluate(row: RequestRow | null): ValidationResult {
  if (!row) return { valid: false, reason: "Request not found" };
  if (row.request_status === "converted" || row.deposit_agreement_id) {
    return { valid: false, reason: "Request already converted" };
  }
  if (row.request_status !== "deposit_link_sent") {
    return { valid: false, reason: `Request status is ${row.request_status}` };
  }
  return {
    valid: true,
    puppyId: row.puppy_id,
    litterId: row.upcoming_litter_id,
  };
}

function json(
  payload: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export async function handler(
  req: Request,
  supabaseOverride?: SupabaseClient,
): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, cors);
  }

  let body: { requestId?: unknown };
  try {
    body = (await req.json()) as { requestId?: unknown };
  } catch {
    return json({ error: "Invalid JSON body" }, 400, cors);
  }

  const requestId =
    typeof body.requestId === "string" ? body.requestId.trim() : "";
  // Reject non-UUID input without a DB round-trip; respond as "not found" so the
  // gate behaves identically to a missing row (no enumeration signal).
  if (!UUID_RE.test(requestId)) {
    return json({ valid: false, reason: "Request not found" }, 200, cors);
  }

  const supabase = supabaseOverride ??
    createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("deposit_requests")
    .select(
      "request_status, puppy_id, upcoming_litter_id, deposit_agreement_id",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    console.error("validate-deposit-request lookup failed:", error);
    // Fail closed; never leak DB internals to the caller.
    return json({ valid: false, reason: "Request not found" }, 200, cors);
  }

  return json(evaluate((data as RequestRow | null) ?? null), 200, cors);
}

Deno.serve((req) => handler(req));
