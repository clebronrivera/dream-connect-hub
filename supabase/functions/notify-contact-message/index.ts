// Supabase Edge Function: send emails when a new row is inserted into contact_messages.
// Triggered by a Database Webhook (INSERT on public.contact_messages).
// Sends TWO emails: admin notification + customer acknowledgment (O2).

import { getAdminRecipients, sendEmail } from "../_shared/email/send.ts";
import { row } from "../_shared/email/components.ts";
import {
  adminNewContactMessage,
  contactReceived,
} from "../_shared/email/templates.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
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

  if (
    payload.type !== "INSERT" ||
    payload.schema !== "public" ||
    payload.table !== "contact_messages"
  ) {
    return new Response(
      JSON.stringify({ message: "Ignored (not a contact_messages INSERT)" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const record = payload.record;
  if (!record || typeof record !== "object") {
    return new Response(
      JSON.stringify({ error: "Missing record in payload" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const customerName = readString(record.name, "Someone");
  const customerEmail = readString(record.email, "");
  const inquirySubject = readString(record.subject, "Inquiry");
  const message = readString(record.message, "");
  const createdAt = record.created_at
    ? new Date(String(record.created_at)).toLocaleString()
    : "—";
  const interestOptions = readStringArray(record.interest_options);

  // --- Admin notification ---
  const admins = getAdminRecipients();
  let adminId: string | undefined;
  if (admins.length > 0) {
    const rowsHtml =
      row("Name", customerName) +
      row("Email", customerEmail || "—") +
      row("Phone", readString(record.phone)) +
      row(
        "City / State",
        `${readString(record.city)} / ${readString(record.state)}`
      ) +
      row("Subject", inquirySubject) +
      row("Upcoming litter", readString(record.upcoming_litter_label)) +
      row(
        "Interest option(s)",
        interestOptions.length ? interestOptions.join(", ") : "—"
      ) +
      row("Submitted", createdAt);

    const tpl = adminNewContactMessage({
      customerName,
      subject: inquirySubject,
      message,
      rowsHtml,
    });
    const r = await sendEmail({
      to: admins,
      subject: tpl.subject,
      html: tpl.html,
      replyTo: customerEmail || undefined,
    });
    if (!r.ok) console.error("Admin notification failed:", r.error);
    adminId = r.id;
  } else {
    console.warn("NOTIFY_EMAIL not set — skipping admin notification");
  }

  // --- Customer acknowledgment (O2) ---
  if (customerEmail && customerEmail !== "—") {
    const tpl = contactReceived({
      customerName,
      subject: inquirySubject,
    });
    const r = await sendEmail({
      to: customerEmail,
      subject: tpl.subject,
      html: tpl.html,
    });
    if (!r.ok) console.error("Customer ack failed:", r.error);
  }

  return new Response(JSON.stringify({ ok: true, id: adminId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

Deno.serve(handler);
