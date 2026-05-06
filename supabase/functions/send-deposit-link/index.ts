// Supabase Edge Function: send-deposit-link
// Admin-invoked. Sends the deposit agreement link to a customer via email.
// Verifies caller is admin INSIDE the function (verify_jwt disabled at gateway).
// Supports initial send (from status 'accepted') and resend (from 'deposit_link_sent').

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email/send.ts";
import { depositLinkSent } from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://puppyheavenllc.com";

interface RequestBody {
  deposit_request_id: string;
  custom_message?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);

  function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
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
  if (!request.upcoming_litter_id && !request.puppy_id) {
    return jsonResponse(400, {
      error: "Request must reference either an upcoming litter or an available puppy",
    });
  }

  // --- Build canonical deposit link (Wave B / OPD-11: requestId only) ---
  const depositLink = `${SITE_URL}/deposit?requestId=${request.id}`;

  // --- Resolve deposit amount: per-puppy override, else flat $300 default ---
  let depositAmount = 300;
  if (request.puppy_id) {
    const { data: puppy } = await admin
      .from("puppies")
      .select("deposit_amount")
      .eq("id", request.puppy_id)
      .single();
    if (puppy?.deposit_amount && Number(puppy.deposit_amount) > 0) {
      depositAmount = Number(puppy.deposit_amount);
    }
  }

  // --- Send email ---
  const reservationLabel =
    request.puppy_name ?? request.upcoming_litter_label ?? "your puppy";
  const tpl = depositLinkSent({
    customerName: request.customer_name,
    litterLabel: reservationLabel,
    depositAmount,
    depositLink,
    customMessage: body.custom_message,
  });
  // H5 auto-log intentionally omitted: this email fires before any
  // deposit_agreements row exists (only deposit_request_id is in scope).
  // The agreement_communications table is keyed on agreement_id NOT NULL,
  // so the email cannot be associated with an agreement at this point.
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
