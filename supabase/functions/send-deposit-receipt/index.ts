// Supabase Edge Function: send-deposit-receipt
// Admin-invoked. Sends a standalone deposit receipt to the customer as soon as
// the admin confirms payment received (deposit_status = admin_confirmed),
// BEFORE admin countersignature / finalization.
// Verifies caller is admin INSIDE the function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email/send.ts";
import { depositReceipt } from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  agreement_id: string;
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
  if (!body.agreement_id) {
    return jsonResponse(400, { error: "agreement_id is required" });
  }

  // --- Load agreement ---
  const { data: agreement, error: loadErr } = await admin
    .from("deposit_agreements")
    .select("*")
    .eq("id", body.agreement_id)
    .single();
  if (loadErr || !agreement)
    return jsonResponse(404, { error: "Agreement not found" });

  if (agreement.deposit_status !== "admin_confirmed") {
    return jsonResponse(400, {
      error: `Deposit status must be 'admin_confirmed' to send receipt. Current: ${agreement.deposit_status}`,
    });
  }
  if (!agreement.buyer_email) {
    return jsonResponse(400, { error: "Agreement has no buyer_email" });
  }

  // --- Send receipt ---
  const confirmedAt = agreement.payment_confirmed_at
    ? new Date(agreement.payment_confirmed_at).toLocaleString()
    : new Date().toLocaleString();

  const tpl = depositReceipt({
    customerName: agreement.buyer_name,
    agreementNumber: agreement.agreement_number,
    puppyName: agreement.puppy_name,
    depositAmount: Number(agreement.deposit_amount),
    paymentMethod: agreement.deposit_payment_method,
    paymentMemo: agreement.payment_memo,
    confirmedAt,
  });

  const r = await sendEmail({
    to: agreement.buyer_email,
    subject: tpl.subject,
    html: tpl.html,
  });

  if (!r.ok) {
    return jsonResponse(502, {
      error: "Failed to send receipt",
      details: r.error,
    });
  }

  return jsonResponse(200, { success: true, email_id: r.id });
});
