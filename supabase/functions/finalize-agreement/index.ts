// Supabase Edge Function: finalize-agreement
// Called when all three finalization conditions are met.
// Verifies conditions, updates status, sends confirmation emails.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAILS = (Deno.env.get("NOTIFY_EMAIL") ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const RESEND_FROM =
  Deno.env.get("RESEND_FROM") ?? "Dream Puppies <onboarding@resend.dev>";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch agreement
  const { data: agreement, error: fetchErr } = await supabase
    .from("deposit_agreements")
    .select("*")
    .eq("id", body.agreement_id)
    .single();

  if (fetchErr || !agreement) {
    return new Response(
      JSON.stringify({ error: "Agreement not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify all three conditions (Build Rule #4)
  const missing: string[] = [];
  if (!agreement.buyer_signed_at) missing.push("buyer_signed_at");
  if (!agreement.admin_signed_at) missing.push("admin_signed_at");
  if (agreement.deposit_status !== "admin_confirmed") missing.push("deposit_status must be admin_confirmed");

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
      JSON.stringify({ error: "Failed to update agreement", details: updateErr }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Send confirmation email to buyer
  if (RESEND_API_KEY && agreement.buyer_email) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [agreement.buyer_email],
          subject: `Deposit Confirmed — Agreement ${agreement.agreement_number}`,
          html: `
            <h2>Your deposit has been confirmed!</h2>
            <p>Hi ${escapeHtml(agreement.buyer_name)},</p>
            <p>Great news! Your deposit for <strong>${escapeHtml(agreement.puppy_name)}</strong> has been fully confirmed.</p>
            <table style="border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Agreement #</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(agreement.agreement_number)}</td></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Deposit</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">$${Number(agreement.deposit_amount).toFixed(2)}</td></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Balance Due</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">$${Number(agreement.balance_due).toFixed(2)}</td></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Pickup Date</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${agreement.confirmed_pickup_date ?? agreement.proposed_pickup_date}</td></tr>
            </table>
            <p>We'll be in touch with next steps as your pickup date approaches.</p>
            <p style="color: #888; font-size: 12px;">Dream Puppies — hobby breeding program</p>
          `.trim(),
        }),
      });
    } catch (emailErr) {
      console.error("Failed to send buyer email:", emailErr);
    }
  }

  // Send admin notification
  if (RESEND_API_KEY && NOTIFY_EMAILS.length > 0) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: NOTIFY_EMAILS,
          subject: `Agreement Finalized: ${agreement.agreement_number}`,
          html: `<p>Agreement <strong>${escapeHtml(agreement.agreement_number)}</strong> for ${escapeHtml(agreement.buyer_name)} / ${escapeHtml(agreement.puppy_name)} is now finalized.</p>`,
        }),
      });
    } catch (emailErr) {
      console.error("Failed to send admin email:", emailErr);
    }
  }

  return new Response(
    JSON.stringify({ success: true, agreement_number: agreement.agreement_number }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
