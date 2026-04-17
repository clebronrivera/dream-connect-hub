// Supabase Edge Function: send-request-decision
// Admin-invoked. Sends a customer email when an admin accepts or declines a
// deposit request. Accept path (O4) sets expectations for the upcoming link;
// decline path communicates closure with an optional reason.
// Does NOT change request_status — the admin service remains the source of truth
// for state transitions; this function only sends email.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email/send.ts";
import {
  depositRequestAccepted,
  depositRequestDeclined,
} from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  deposit_request_id: string;
  decision: "accepted" | "declined";
  reason?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST")
    return jsonResponse(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse(401, { error: "Missing authorization" });
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return jsonResponse(401, { error: "Empty bearer token" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return jsonResponse(401, { error: "Invalid session" });
  }
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();
  if (profileErr || profile?.role !== "admin") {
    return jsonResponse(403, { error: "Admin access required" });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }
  if (!body.deposit_request_id) {
    return jsonResponse(400, { error: "deposit_request_id is required" });
  }
  if (body.decision !== "accepted" && body.decision !== "declined") {
    return jsonResponse(400, {
      error: "decision must be 'accepted' or 'declined'",
    });
  }

  const { data: request, error: loadErr } = await admin
    .from("deposit_requests")
    .select("*")
    .eq("id", body.deposit_request_id)
    .single();
  if (loadErr || !request)
    return jsonResponse(404, { error: "Deposit request not found" });

  if (!request.customer_email) {
    return jsonResponse(400, { error: "Request has no customer_email" });
  }

  const litterLabel = request.upcoming_litter_label ?? "your litter";
  const tpl =
    body.decision === "accepted"
      ? depositRequestAccepted({
          customerName: request.customer_name,
          litterLabel,
        })
      : depositRequestDeclined({
          customerName: request.customer_name,
          litterLabel,
          reason: body.reason,
        });

  const r = await sendEmail({
    to: request.customer_email,
    subject: tpl.subject,
    html: tpl.html,
  });
  if (!r.ok) {
    return jsonResponse(502, {
      error: "Failed to send email",
      details: r.error,
    });
  }

  return jsonResponse(200, { success: true, email_id: r.id });
});
