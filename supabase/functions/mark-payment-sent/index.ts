// Supabase Edge Function: mark-payment-sent
//
// Wave D D3. Buyer-invoked from the payment dashboard's "I have sent payment"
// button. Public function (verify_jwt=false at gateway); auth is via the
// (agreement_id, buyer_access_token) pair in the request body, validated by
// the shared verifyBuyerToken helper.
//
// Behavior:
//   1) Validate the buyer token. 400/403/404/500 on failure.
//   2) Idempotency: if buyer_marked_payment_sent_at is already set, return
//      200 success with already_marked=true (no email).
//   3) Lifecycle gate: only mark if agreement_status='sent' and
//      deposit_status='pending'. Past the initial state → 409.
//   4) (Wave H1 deferred) attestation precondition stub.
//   5) UPDATE deposit_agreements SET buyer_marked_payment_sent_at = now()
//      WHERE id = ... AND buyer_marked_payment_sent_at IS NULL  (race-safe).
//   6) Email admins via the adminBuyerMarkedPaymentSent template. Email
//      failures are logged but do not roll back the DB write.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyBuyerToken } from "../_shared/auth/verifyBuyerToken.ts";
import { sendEmail, getAdminRecipients } from "../_shared/email/send.ts";
import { adminBuyerMarkedPaymentSent } from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  agreement_id: string;
  buyer_access_token: string;
  /** Optional path of an already-uploaded payment screenshot (PR 4). Stored
   *  for dispute-evidence purposes; does NOT gate this call. */
  payment_screenshot_path?: string;
}

/**
 * Extracted handler — accepts an optional pre-built client so tests can
 * inject a mock without touching the real Supabase service role key.
 * Production: client is always undefined → createClient() is called internally.
 */
export async function handler(
  req: Request,
  adminOverride?: ReturnType<typeof createClient>
): Promise<Response> {
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

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const admin = adminOverride ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) Verify the buyer token (also fetches the row).
  const verification = await verifyBuyerToken(
    admin,
    body.agreement_id,
    body.buyer_access_token
  );
  if (!verification.ok) {
    return jsonResponse(verification.status, verification.body);
  }
  const agreement = verification.agreement;

  // 2) Idempotency.
  if (agreement.buyer_marked_payment_sent_at) {
    return jsonResponse(200, {
      success: true,
      already_marked: true,
      marked_at: agreement.buyer_marked_payment_sent_at,
    });
  }

  // 3) Lifecycle gate.
  if (agreement.agreement_status !== "sent" || agreement.deposit_status !== "pending") {
    return jsonResponse(409, {
      error: "Agreement is past the initial state",
      agreement_status: agreement.agreement_status,
      deposit_status: agreement.deposit_status,
    });
  }

  // 4) Race-safe UPDATE: only sets buyer_marked_payment_sent_at if it's
  //    still NULL. If two clicks arrive simultaneously, only the first
  //    write succeeds; the second sees zero rows updated and we treat it
  //    as already-marked.
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = { buyer_marked_payment_sent_at: now };
  // Optional screenshot path stored for dispute evidence (PR 4+). No gate.
  if (body.payment_screenshot_path) {
    updatePayload.deposit_screenshot_path = body.payment_screenshot_path;
  }

  const { data: updated, error: updateErr } = await admin
    .from("deposit_agreements")
    .update(updatePayload)
    .eq("id", body.agreement_id)
    .is("buyer_marked_payment_sent_at", null)
    .select("id")
    .maybeSingle();

  if (updateErr) {
    return jsonResponse(500, {
      error: "Failed to update agreement",
      details: updateErr.message,
    });
  }
  if (!updated) {
    // Lost the race — another caller already marked. Treat as success.
    return jsonResponse(200, { success: true, already_marked: true });
  }

  // 5) Notify admins. Email failure is logged but doesn't roll back.
  const recipients = getAdminRecipients();
  if (recipients.length > 0) {
    const tpl = adminBuyerMarkedPaymentSent({
      agreementNumber: agreement.agreement_number,
      buyerName: agreement.buyer_name,
      buyerEmail: agreement.buyer_email,
      buyerPhone: agreement.buyer_phone ?? null,
      puppyName: agreement.puppy_name,
      depositAmount: Number(agreement.deposit_amount),
      paymentMethod: agreement.deposit_payment_method,
      paymentMemo: agreement.payment_memo ?? "",
    });
    const emailResult = await sendEmail({
      to: recipients,
      subject: tpl.subject,
      html: tpl.html,
      agreementId: body.agreement_id,
      summary: `Admin notified — buyer marked payment sent (${agreement.deposit_payment_method})`,
    });
    if (!emailResult.ok) {
      console.error("mark-payment-sent: admin email failed:", emailResult.error);
    }
  }

  return jsonResponse(200, { success: true, marked_at: now });
}

// Wrap in arrow to discard the connInfo arg Deno.serve passes positionally;
// otherwise handler's optional `adminOverride` would capture it and `.from(...)`
// would throw `TypeError: supabase.from is not a function` in production.
Deno.serve((req) => handler(req));
