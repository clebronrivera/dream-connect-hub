// Supabase Edge Function: notify-agreement-submitted
//
// Wave D D4. Fires on INSERT into public.deposit_agreements via a Database
// Webhook. Sends the buyer an email containing their permanent payment-
// dashboard link (/payment/<id>/<token>) so they can return to the dashboard
// after closing the submit-then-redirect tab. The redirect alone (Wave D
// D2) leaves the buyer with the URL only in the address bar; this email
// is the recovery path.
//
// Buyer-only. Admins are notified at later stages by depositReceipt
// (payment confirmed) and adminBuyerMarkedPaymentSent (buyer self-reports
// payment via the dashboard).
//
// Webhook configuration (dashboard-managed, not migration-managed):
//   Table:  public.deposit_agreements
//   Events: INSERT
//   Type:   HTTP Request
//   Method: POST
//   URL:    {SUPABASE_URL}/functions/v1/notify-agreement-submitted
//   HTTP headers: none required (verify_jwt=false at gateway)
//
// Idempotency: webhooks may retry on transient failures. The function
// reads the row, sends the email, and returns 200 either way; duplicate
// deliveries cause duplicate emails — acceptable for this surface.

import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email/send.ts";
import { agreementSubmittedBuyer } from "../_shared/email/templates.ts";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://puppyheavenllc.com";

interface WebhookRecord {
  id: string;
  buyer_name: string;
  buyer_email: string;
  agreement_number: string;
  puppy_name: string;
  deposit_amount: number | string;
  deposit_payment_method: string;
  payment_memo: string | null;
  buyer_access_token: string;
}

interface WebhookPayload {
  type?: string;
  table?: string;
  schema?: string;
  record?: WebhookRecord;
  old_record?: unknown;
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

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  // Defensive shape check. If the webhook fires for a different table or
  // event by misconfiguration, skip silently with a 200 so Supabase doesn't
  // back off.
  if (
    payload.type !== "INSERT" ||
    payload.schema !== "public" ||
    payload.table !== "deposit_agreements"
  ) {
    return jsonResponse(200, { skipped: true, reason: "non-matching event" });
  }
  const record = payload.record;
  if (!record || !record.id || !record.buyer_email || !record.buyer_access_token) {
    return jsonResponse(200, { skipped: true, reason: "missing required fields" });
  }

  const paymentLink = `${SITE_URL}/payment/${record.id}/${record.buyer_access_token}`;

  const tpl = agreementSubmittedBuyer({
    buyerName: record.buyer_name,
    agreementNumber: record.agreement_number,
    puppyName: record.puppy_name,
    depositAmount: Number(record.deposit_amount),
    paymentMethod: record.deposit_payment_method,
    paymentMemo: record.payment_memo ?? "",
    paymentLink,
  });

  const result = await sendEmail({
    to: record.buyer_email,
    subject: tpl.subject,
    html: tpl.html,
  });

  if (!result.ok) {
    // Don't fail the webhook — log and 200 so Supabase doesn't retry
    // indefinitely. (Email delivery is best-effort here; the redirect
    // already gave the buyer the URL during the in-session flow.)
    console.error("notify-agreement-submitted: email failed:", result.error);
    return jsonResponse(200, { sent: false, error: result.error });
  }

  return jsonResponse(200, { sent: true, agreement_id: record.id });
});
