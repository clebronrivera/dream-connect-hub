// Supabase Edge Function: send-deposit-link
// Admin-invoked. Sends the deposit agreement link to a customer via email.
// Verifies caller is admin INSIDE the function (verify_jwt disabled at gateway).
// Supports initial send (from status 'accepted') and resend (from 'deposit_link_sent').

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM =
  Deno.env.get("RESEND_FROM") ?? "Dream Puppies <onboarding@resend.dev>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://puppyheavenllc.com";
const BUSINESS_PHONE = "(321) 697-8864";

interface RequestBody {
  deposit_request_id: string;
  custom_message?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

async function sendEmail(
  to: string,
  customerName: string,
  litterLabel: string,
  depositAmount: number,
  depositLink: string,
  customMessage: string | undefined
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not set" };

  const customMsgHtml = customMessage
    ? `<div style="margin: 16px 0; padding: 12px; background: #fff8e1; border-left: 3px solid #f59e0b; border-radius: 4px;"><p style="margin: 0; white-space: pre-wrap;">${escapeHtml(customMessage)}</p></div>`
    : "";

  const html = `
<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
  <h2 style="color: #111;">Your deposit reservation is ready</h2>
  <p>Hi ${escapeHtml(customerName)},</p>
  <p>Great news — your deposit request for <strong>${escapeHtml(litterLabel)}</strong> has been approved. To secure your spot, please complete the deposit agreement form at the link below.</p>
  <p style="margin: 24px 0; text-align: center;">
    <a href="${depositLink}" style="display: inline-block; padding: 14px 28px; background: #c0392b; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
      Complete Deposit Agreement
    </a>
  </p>
  <p style="font-size: 14px; color: #555;">Or copy this link into your browser: <br/><a href="${depositLink}">${depositLink}</a></p>
  <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
    <tr><td style="padding: 8px 12px; border: 1px solid #eee;"><strong>Litter</strong></td><td style="padding: 8px 12px; border: 1px solid #eee;">${escapeHtml(litterLabel)}</td></tr>
    <tr><td style="padding: 8px 12px; border: 1px solid #eee;"><strong>Deposit amount</strong></td><td style="padding: 8px 12px; border: 1px solid #eee;">$${depositAmount} (non-refundable once agreement is signed)</td></tr>
  </table>
  ${customMsgHtml}
  <p style="font-size: 14px; color: #555; margin-top: 24px;">
    This link is valid for your reservation request only. Questions? Call us at <strong>${BUSINESS_PHONE}</strong>.
  </p>
  <p style="font-size: 12px; color: #888; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
    Dream Puppies — hobby breeding program
  </p>
</div>`.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject: "Your Dream Puppies Deposit Agreement Link",
        html,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${errBody}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
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
  const emailResult = await sendEmail(
    request.customer_email,
    request.customer_name,
    request.upcoming_litter_label ?? "your litter",
    depositAmount,
    depositLink,
    body.custom_message
  );

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
