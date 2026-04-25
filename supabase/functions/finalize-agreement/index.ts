// Supabase Edge Function: finalize-agreement
// Called when all three finalization conditions are met.
// Verifies conditions, updates status, sends confirmation emails.
// Verifies caller is admin INSIDE the function (matches the pattern used by
// send-deposit-link, send-deposit-receipt, and send-request-decision).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdminRecipients, sendEmail } from "../_shared/email/send.ts";
import {
  adminAgreementFinalized,
  agreementFinalizedBuyer,
} from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Auth: verify admin via JWT ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Empty bearer token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return new Response(
      JSON.stringify({
        error: "Invalid session",
        details: userErr?.message ?? "no user resolved from JWT",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();
  if (profileErr || profile?.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Admin access required" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { agreement_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch agreement
  const { data: agreement, error: fetchErr } = await supabase
    .from("deposit_agreements")
    .select("*")
    .eq("id", body.agreement_id)
    .single();

  if (fetchErr || !agreement) {
    return new Response(JSON.stringify({ error: "Agreement not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify all three conditions (Build Rule #4)
  const missing: string[] = [];
  if (!agreement.buyer_signed_at) missing.push("buyer_signed_at");
  if (!agreement.admin_signed_at) missing.push("admin_signed_at");
  if (agreement.deposit_status !== "admin_confirmed")
    missing.push("deposit_status must be admin_confirmed");

  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: "Finalization conditions not met", missing }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Update agreement
  const { error: updateErr } = await supabase
    .from("deposit_agreements")
    .update({
      agreement_status: "admin_approved",
      admin_approved_at: new Date().toISOString(),
    })
    .eq("id", body.agreement_id);

  if (updateErr) {
    return new Response(
      JSON.stringify({
        error: "Failed to update agreement",
        details: updateErr,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Send confirmation email to buyer
  if (agreement.buyer_email) {
    const tpl = agreementFinalizedBuyer({
      buyerName: agreement.buyer_name,
      agreementNumber: agreement.agreement_number,
      puppyName: agreement.puppy_name,
      depositAmount: Number(agreement.deposit_amount),
      balanceDue: Number(agreement.balance_due),
      pickupDate:
        agreement.confirmed_pickup_date ?? agreement.proposed_pickup_date,
    });
    const r = await sendEmail({
      to: agreement.buyer_email,
      subject: tpl.subject,
      html: tpl.html,
    });
    if (!r.ok) console.error("Failed to send buyer email:", r.error);
  }

  // Send admin notification
  const admins = getAdminRecipients();
  if (admins.length > 0) {
    const tpl = adminAgreementFinalized({
      agreementNumber: agreement.agreement_number,
      buyerName: agreement.buyer_name,
      puppyName: agreement.puppy_name,
    });
    const r = await sendEmail({
      to: admins,
      subject: tpl.subject,
      html: tpl.html,
    });
    if (!r.ok) console.error("Failed to send admin email:", r.error);
  }

  return new Response(
    JSON.stringify({
      success: true,
      agreement_number: agreement.agreement_number,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
