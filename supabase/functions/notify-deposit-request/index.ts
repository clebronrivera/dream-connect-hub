// Supabase Edge Function: send emails when a new row is inserted into deposit_requests.
// Triggered by a Database Webhook (INSERT on public.deposit_requests).
// Sends TWO emails: admin notification + customer acknowledgment (O1).

import { getAdminRecipients, sendEmail } from "../_shared/email/send.ts";
import { row } from "../_shared/email/components.ts";
import {
  adminNewDepositRequest,
  depositRequestReceived,
} from "../_shared/email/templates.ts";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://puppyheavenllc.com";

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
    payload.table !== "deposit_requests"
  ) {
    return new Response(
      JSON.stringify({ message: "Ignored (not a deposit_requests INSERT)" }),
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

  const customerName = readString(record.customer_name, "Someone");
  const customerEmail = readString(record.customer_email, "");
  const litterLabel = readString(record.upcoming_litter_label, "your litter");
  const createdAt = record.created_at
    ? new Date(String(record.created_at)).toLocaleString()
    : "—";

  // --- Admin notification ---
  const admins = getAdminRecipients();
  let adminId: string | undefined;
  if (admins.length > 0) {
    const rowsHtml =
      row("Name", customerName) +
      row("Email", customerEmail || "—") +
      row("Phone", readString(record.customer_phone)) +
      row(
        "City / State",
        `${readString(record.city)} / ${readString(record.state)}`
      ) +
      row("Litter", litterLabel) +
      row(
        "Puppy slot",
        readString(record.upcoming_puppy_placeholder_summary)
      ) +
      row("Submitted", createdAt) +
      row("Request ID", readString(record.id));

    const tpl = adminNewDepositRequest({
      customerName,
      rowsHtml,
      reviewLink: `${SITE_URL}/admin/deposit-requests`,
    });
    const r = await sendEmail({
      to: admins,
      subject: tpl.subject,
      html: tpl.html,
    });
    if (!r.ok) console.error("Admin notification failed:", r.error);
    adminId = r.id;
  } else {
    console.warn("NOTIFY_EMAIL not set — skipping admin notification");
  }

  // --- Customer acknowledgment (O1) ---
  if (customerEmail && customerEmail !== "—") {
    const tpl = depositRequestReceived({
      customerName,
      litterLabel,
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
