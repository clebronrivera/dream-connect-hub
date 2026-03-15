// Supabase Edge Function: send email when a new row is inserted into contact_messages.
// Triggered by a Database Webhook (INSERT on public.contact_messages).
// Uses same secrets as notify-puppy-inquiry: RESEND_API_KEY, NOTIFY_EMAIL, RESEND_FROM.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAILS = (Deno.env.get("NOTIFY_EMAIL") ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const RESEND_FROM =
  Deno.env.get("RESEND_FROM") ?? "Dream Connect <onboarding@resend.dev>";
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

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function extractFromEmail(fromValue: string): string {
  const match = fromValue.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim();
  const trimmed = fromValue.trim();
  return trimmed.includes("@") ? trimmed : DEFAULT_FROM_EMAIL;
}

function buildFromHeader(inquirySubject: string): string {
  const fromEmail = extractFromEmail(RESEND_FROM);
  const subjectPart = inquirySubject.trim() || "Inquiry";
  return `Dream Puppies - ${subjectPart} <${fromEmail}>`;
}

function buildEmailBody(record: Record<string, unknown>): string {
  const name = readString(record.name);
  const email = readString(record.email);
  const phone = readString(record.phone);
  const city = readString(record.city);
  const state = readString(record.state);
  const subject = readString(record.subject);
  const message = escapeHtml(readString(record.message)).replace(/\n/g, "<br>");
  const upcomingLitterLabel = readString(record.upcoming_litter_label);
  const upcomingLitterId = readString(record.upcoming_litter_id);
  const interestOptions = readStringArray(record.interest_options);
  const createdAt = record.created_at
    ? new Date(String(record.created_at)).toLocaleString()
    : "—";
  const interestOptionsHtml = interestOptions.length
    ? `<ul style="margin: 0; padding-left: 18px;">${interestOptions
        .map((option) => `<li>${escapeHtml(option)}</li>`)
        .join("")}</ul>`
    : "—";

  return `
<h2>New Contact Us message</h2>
<table style="border-collapse: collapse; max-width: 480px;">
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Name</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(name)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Email</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Phone</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(phone)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>City / State</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(city)} / ${escapeHtml(state)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Subject</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(subject)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Upcoming litter</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(upcomingLitterLabel)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Upcoming litter ID</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(upcomingLitterId)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Interest option(s)</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${interestOptionsHtml}</td></tr>
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

  const inquirySubject = readString(record.subject, "Inquiry");
  const subject = `Contact Us: ${inquirySubject} from ${String(record.name ?? "Someone")}`;
  const html = buildEmailBody(record);
  const resendFrom = buildFromHeader(inquirySubject);

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
