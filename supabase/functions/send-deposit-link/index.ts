// Supabase Edge Function: send-deposit-link
// Admin-invoked. Sends the deposit agreement link to a customer via email.
// Verifies caller is admin INSIDE the function (verify_jwt disabled at gateway).
// Supports initial send (from status 'accepted') and resend (from 'deposit_link_sent').

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email/send.ts";
import { depositLinkSent } from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://puppyheavenllc.com";

interface RequestBody {
  deposit_request_id: string;
  custom_message?: string;
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

  // --- Auth: verify admin via JWT ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse(401, { error: "Missing authorization" });

  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return jsonResponse(401, { error: "Empty bearer token" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return jsonResponse(401, {
      error: "Invalid session",
      details: userErr?.message ?? "no user resolved from JWT",
    });
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();
  if (profileErr || profile?.role !== "admin") {
    return jsonResponse(403, { error: "Admin access required" });
  }

  // --- Parse body ---
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }
  if (!body.deposit_request_id) {
    return jsonResponse(400, { error: "deposit_request_id is required" });
  }

  // --- Load + validate the request ---
  const { data: request, error: loadErr } = await admin
    .from("deposit_requests")
    .select("*")
    .eq("id", body.deposit_request_id)
    .single();
  if (loadErr || !request)
    return jsonResponse(404, { error: "Deposit request not found" });

  if (
    request.request_status !== "accepted" &&
    request.request_status !== "deposit_link_sent"
  ) {
    return jsonResponse(400, {
      error: `Request must be 'accepted' or 'deposit_link_sent'. Current: ${request.request_status}`,
    });
  }
  if (!request.upcoming_litter_id) {
    return jsonResponse(400, { error: "Request has no upcoming_litter_id" });
  }

  // --- Build deposit link ---
  const depositLink = `${SITE_URL}/deposit?litter=${request.upcoming_litter_id}&request=${request.id}`;

  // --- Load litter deposit amount ---
  let depositAmount = 300;
  const { data: litter } = await admin
    .from("upcoming_litters")
    .select("deposit_amount")
    .eq("id", request.upcoming_litter_id)
    .single();
  if (litter?.deposit_amount && litter.deposit_amount > 0) {
    depositAmount = Number(litter.deposit_amount);
  }

  // --- Send email ---
  const tpl = depositLinkSent({
    customerName: request.customer_name,
    litterLabel: request.upcoming_litter_label ?? "your litter",
    depositAmount,
    depositLink,
    customMessage: body.custom_message,
  });
  const emailResult = await sendEmail({
    to: request.customer_email,
    subject: tpl.subject,
    html: tpl.html,
  });

  if (!emailResult.ok) {
    return jsonResponse(502, {
      error: "Failed to send email",
      details: emailResult.error,
    });
  }

  // --- Update the request row ---
  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("deposit_requests")
    .update({
      request_status: "deposit_link_sent",
      deposit_link_url: depositLink,
      deposit_link_sent_at: now,
      deposit_link_sent_via: ["email"],
      email_sent_at: now,
    })
    .eq("id", body.deposit_request_id);

  if (updateErr) {
    return jsonResponse(500, {
      error: "Email sent but failed to update request record",
      details: updateErr.message,
    });
  }

  return jsonResponse(200, { success: true, channel: "email" });
});
