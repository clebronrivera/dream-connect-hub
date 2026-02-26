// Supabase Edge Function: send email when a new row is inserted into puppy_inquiries.
// Triggered by a Database Webhook (INSERT on public.puppy_inquiries).
// Requires: RESEND_API_KEY secret. Optional: NOTIFY_EMAIL (default below), RESEND_FROM.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Comma-separated emails; e.g. "a@b.com, c@d.com" or just "a@b.com"
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

function buildEmailBody(record: Record<string, unknown>): string {
  const name = [record.name].flat().join(" ");
  const email = String(record.email ?? "");
  const phone = String(record.phone ?? "—");
  const city = String(record.city ?? "—");
  const state = String(record.state ?? "—");
  const puppyName = String(record.puppy_name ?? "—");
  const timeline = String(record.timeline ?? "—");
  const experience = String(record.experience ?? "—");
  const needsFollowup = record.needs_followup === true ? "Yes" : "No";
  const createdAt = record.created_at
    ? new Date(String(record.created_at)).toLocaleString()
    : "—";

  return `
<h2>New puppy inquiry</h2>
<table style="border-collapse: collapse; max-width: 480px;">
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Name</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(name)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Email</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Phone</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(phone)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>City / State</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(city)} / ${escapeHtml(state)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Puppy</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(puppyName)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Timeline</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(timeline)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Experience</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(experience)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Needs follow-up</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${needsFollowup}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Submitted</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(createdAt)}</td></tr>
</table>
<p style="margin-top: 16px; color: #666;">View in admin: Inquiries → Puppy Inquiries</p>
`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

  if (payload.type !== "INSERT" || payload.schema !== "public" || payload.table !== "puppy_inquiries") {
    return new Response(
      JSON.stringify({ message: "Ignored (not a puppy_inquiries INSERT)" }),
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

  const subject = `New puppy inquiry from ${[record.name].flat().join(" ")}`;
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
