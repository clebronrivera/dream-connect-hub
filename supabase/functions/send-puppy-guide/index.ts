// Supabase Edge Function: send-puppy-guide
// Admin-invoked. Sends a new owner care guide to the buyer after finalization.
// Agreement must have agreement_status = 'admin_approved'.
// POST body: { agreement_id: string }
// Auth: Bearer JWT, admin role required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email/send.ts";
import { puppyGuideDelivery } from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  agreement_id: string;
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
  if (!body.agreement_id) {
    return jsonResponse(400, { error: "agreement_id is required" });
  }

  // --- Load agreement ---
  const { data: agreement, error: loadErr } = await admin
    .from("deposit_agreements")
    .select(
      "buyer_name, buyer_email, puppy_name, breed, confirmed_pickup_date, proposed_pickup_date, agreement_status"
    )
    .eq("id", body.agreement_id)
    .single();
  if (loadErr || !agreement)
    return jsonResponse(404, { error: "Agreement not found" });

  if (agreement.agreement_status !== "admin_approved") {
    return jsonResponse(400, {
      error:
        "Puppy guide can only be sent for finalized (admin_approved) agreements.",
    });
  }
  if (!agreement.buyer_email) {
    return jsonResponse(400, { error: "Agreement has no buyer_email" });
  }

  // --- Send guide ---
  const tpl = puppyGuideDelivery({
    buyerName: agreement.buyer_name,
    puppyName: agreement.puppy_name,
    breed: agreement.breed ?? null,
    pickupDate:
      agreement.confirmed_pickup_date ?? agreement.proposed_pickup_date ?? null,
  });

  const r = await sendEmail({
    to: agreement.buyer_email,
    subject: tpl.subject,
    html: tpl.html,
    agreementId: body.agreement_id,
    summary: `Buyer emailed new owner care guide — ${agreement.puppy_name}`,
  });

  if (!r.ok) {
    return jsonResponse(502, {
      error: "Failed to send puppy guide",
      details: r.error,
    });
  }

  return jsonResponse(200, { success: true, email_id: r.id });
});
