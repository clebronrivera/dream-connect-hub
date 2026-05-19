// Supabase Edge Function: finalize-agreement
// Called when all three finalization conditions are met.
// Verifies conditions, updates status to admin_approved, generates the
// deposit agreement PDF (Wave F5), then sends confirmation emails.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdminRecipients, sendEmail } from "../_shared/email/send.ts";
import {
  adminAgreementFinalized,
  buyerReservationConfirmed,
} from "../_shared/email/templates.ts";
import { verifyAdmin } from "../_shared/auth/verifyAdmin.ts";
import { generateDepositPdf } from "../_shared/pdf/generateDepositPdf.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_SITE_URL =
  Deno.env.get("PUBLIC_SITE_URL") ?? "https://puppyheavenllc.com";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // --- Auth: verify admin via JWT ---
  const auth = await verifyAdmin(req, supabase);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
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

  // Verify countersign conditions: buyer signed + admin signed.
  // Payment confirmation is no longer required at countersign time (PR 4
  // redesign — buyer pays AFTER the agreement is countersigned, and the
  // buyerReservationConfirmed email includes their payment instructions).
  const missing: string[] = [];
  if (!agreement.buyer_signed_at) missing.push("buyer_signed_at");
  if (!agreement.admin_signed_at) missing.push("admin_signed_at");

  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: "Finalization conditions not met", missing }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Set agreement_status = 'admin_approved' + record admin_approved_at
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

  // --- Wave F5: Generate PDF synchronously ---
  // generateDepositPdf reads the freshly set admin_approved_at, fills the
  // template, uploads to storage, and transitions agreement_status → 'complete'.
  const pdfResult = await generateDepositPdf(supabase, body.agreement_id);

  if (!pdfResult.ok) {
    // PDF generation failed — log and continue. The agreement is already
    // admin_approved in the DB; the admin can retry PDF generation via
    // the generate-agreement-pdf edge function. Do not block emails.
    console.error(
      "PDF generation failed for agreement",
      body.agreement_id,
      pdfResult.body
    );
  }

  // Build buyer download URL (only available if PDF succeeded)
  const downloadUrl =
    pdfResult.ok
      ? `${PUBLIC_SITE_URL}/agreements/${body.agreement_id}/${pdfResult.buyer_access_token}/download`
      : null;

  // --- Send countersign confirmation to buyer ---
  // Includes payment instructions so the buyer knows exactly what to do next.
  if (agreement.buyer_email) {
    const dashboardUrl =
      `${PUBLIC_SITE_URL}/payment/${body.agreement_id}/${agreement.buyer_access_token}`;
    const tpl = buyerReservationConfirmed({
      buyerName: agreement.buyer_name,
      agreementNumber: agreement.agreement_number,
      puppyName: agreement.puppy_name,
      depositAmount: Number(agreement.deposit_amount),
      balanceDue: Number(agreement.balance_due),
      paymentMethod: agreement.deposit_payment_method ?? "",
      paymentHandle: null, // TODO(Carlos): fetch from payment_methods_config
      paymentMemo: agreement.payment_memo ?? "",
      paymentDashboardUrl: dashboardUrl,
      downloadUrl: downloadUrl ?? null,
    });
    const r = await sendEmail({
      to: agreement.buyer_email,
      subject: tpl.subject,
      html: tpl.html,
      agreementId: body.agreement_id,
      summary: `Buyer notified — agreement finalized (${agreement.agreement_number})`,
    });
    if (!r.ok) console.error("Failed to send buyer email:", r.error);
  }

  // --- Send admin notification ---
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
      agreementId: body.agreement_id,
      summary: `Admin notified — agreement finalized (${agreement.agreement_number})`,
    });
    if (!r.ok) console.error("Failed to send admin email:", r.error);
  }

  return new Response(
    JSON.stringify({
      success: true,
      agreement_number: agreement.agreement_number,
      pdf_generated: pdfResult.ok,
      ...(pdfResult.ok ? { download_url: downloadUrl } : {}),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
