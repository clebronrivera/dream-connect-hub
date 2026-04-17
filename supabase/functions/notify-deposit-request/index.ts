// Supabase Edge Function: send email when a new row is inserted into deposit_requests.
// Triggered by a Database Webhook (INSERT on public.deposit_requests).
// Uses same secrets as notify-contact-message: RESEND_API_KEY, NOTIFY_EMAIL, RESEND_FROM.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAILS = (Deno.env.get("NOTIFY_EMAIL") ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const RESEND_FROM =
  Deno.env.get("RESEND_FROM") ?? "Dream Puppies <onboarding@resend.dev>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://puppyheavenllc.com";
const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readString(value: unknown, fallback = "—"): string {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s.length > 0 ? s : fallback;
}

function extractFromEmail(fromValue: string): string {
  const match = fromValue.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim();
  const trimmed = fromValue.trim();
  return trimmed.includes("@") ? trimmed : DEFAULT_FROM_EMAIL;
}

function buildFromHeader(): string {
  const fromEmail = extractFromEmail(RESEND_FROM);
  return `Dream Puppies - Deposit Request <${fromEmail}>`;
}

function buildEmailBody(record: Record<string, unknown>): string {
  const name = readString(record.customer_name);
  const email = readString(record.customer_email);
  const phone = readString(record.customer_phone);
  const city = readString(record.city);
  const state = readString(record.state);
  const origin = readString(record.origin);
  const litterLabel = readString(record.upcoming_litter_label);
  const puppySummary = readString(record.upcoming_puppy_placeholder_summary);
  const requestId = readString(record.id);
  const createdAt = record.created_at
    ? new Date(String(record.created_at)).toLocaleString()
    : "—";

  const adminUrl = `${SITE_URL}/admin/deposit-requests`;

  return `
<h2>New Deposit Request</h2>
<p style="margin: 8px 0 16px;">A customer has submitted a deposit request via ${escapeHtml(origin === "admin_initiated" ? "admin-initiated workflow" : "the public site")}. Review and send the deposit agreement link within 24–48 hours.</p>
<table style="border-collapse: collapse; max-width: 520px;">
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Name</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(name)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Email</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Phone</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(phone)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>City / State</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(city)} / ${escapeHtml(state)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Litter</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(litterLabel)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Puppy slot</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(puppySummary)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Submitted</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(createdAt)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Request ID</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(requestId)}</td></tr>
</table>
<p style="margin-top: 20px;">
  <a href="${adminUrl}" style="display: inline-block; padding: 10px 20px; background: #c0392b; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Review in Admin</a>
</p>
<p style="margin-top: 16px; color: #666; font-size: 13px;">Or go to: Admin Dashboard → Deposit Requests</p>
`.trim();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "Notification not configured (missing RESEND_API_KEY)" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (NOTIFY_EMAILS.length === 0) {
    console.error("NOTIFY_EMAIL is not set");
    return new Response(
      JSON.stringify({ error: "Notification not configured (missing NOTIFY_EMAIL)" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (payload.type !== "INSERT" || payload.schema !== "public" || payload.table !== "deposit_requests") {
    return new Response(
      JSON.stringify({ message: "Ignored (not a deposit_requests INSERT)" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const record = payload.record;
  if (!record || typeof record !== "object") {
    return new Response(JSON.stringify({ error: "Missing record in payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const customerName = readString(record.customer_name, "Someone");
  const subject = `Deposit Request from ${customerName}`;
  const html = buildEmailBody(record);
  const resendFrom = buildFromHeader();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: resendFrom,
      to: NOTIFY_EMAILS,
      subject,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Resend error:", data);
    return new Response(
      JSON.stringify({ error: "Failed to send notification", details: data }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true, id: data.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

Deno.serve(handler);
