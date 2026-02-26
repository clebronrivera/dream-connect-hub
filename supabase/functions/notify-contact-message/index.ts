// Supabase Edge Function: send email when a new row is inserted into contact_messages.
// Triggered by a Database Webhook (INSERT on public.contact_messages).
// Uses same secrets as notify-puppy-inquiry: RESEND_API_KEY, NOTIFY_EMAIL, RESEND_FROM.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAILS = (Deno.env.get("NOTIFY_EMAIL") ?? "Dreampuppies22@gmail.com")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const TO_EMAILS = NOTIFY_EMAILS.length > 0 ? NOTIFY_EMAILS : ["Dreampuppies22@gmail.com"];
const RESEND_FROM =
  Deno.env.get("RESEND_FROM") ?? "Dream Connect <onboarding@resend.dev>";

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

function buildEmailBody(record: Record<string, unknown>): string {
  const name = String(record.name ?? "—");
  const email = String(record.email ?? "—");
  const phone = String(record.phone ?? "—");
  const subject = String(record.subject ?? "—");
  const message = String(record.message ?? "—").replace(/\n/g, "<br>");
  const createdAt = record.created_at
    ? new Date(String(record.created_at)).toLocaleString()
    : "—";

  return `
<h2>New Contact Us message</h2>
<table style="border-collapse: collapse; max-width: 480px;">
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Name</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(name)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Email</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Phone</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(phone)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Subject</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(subject)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Submitted</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(createdAt)}</td></tr>
</table>
<div style="margin-top: 16px;"><strong>Message:</strong></div>
<div style="margin-top: 8px; padding: 12px; background: #f5f5f5; border-radius: 6px;">${message}</div>
<p style="margin-top: 16px; color: #666;">View in admin: Inquiries → Contact Messages</p>
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

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (payload.type !== "INSERT" || payload.schema !== "public" || payload.table !== "contact_messages") {
    return new Response(
      JSON.stringify({ message: "Ignored (not a contact_messages INSERT)" }),
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

  const subject = `Contact Us: ${String(record.subject ?? "New message")} from ${String(record.name ?? "Someone")}`;
  const html = buildEmailBody(record);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: TO_EMAILS,
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
