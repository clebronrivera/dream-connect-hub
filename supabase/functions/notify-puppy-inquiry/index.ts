// Supabase Edge Function: send email when a new row is inserted into puppy_inquiries.
// Triggered by a Database Webhook (INSERT on public.puppy_inquiries).
// Requires: RESEND_API_KEY, NOTIFY_EMAIL. Optional: RESEND_FROM.

import { getAdminRecipients, sendEmail } from "../_shared/email/send.ts";
import { row } from "../_shared/email/components.ts";
import { adminNewPuppyInquiry } from "../_shared/email/templates.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function readBoolean(value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function buildRowsHtml(record: Record<string, unknown>): string {
  const preferences = isRecord(record.preferences) ? record.preferences : {};
  const breedPreferenceList = readStringArray(preferences.breedPreference);
  const breedPreference = breedPreferenceList.length
    ? breedPreferenceList.join(", ")
    : "—";
  const consentCommunicationsRaw = preferences.consentCommunications;
  const consentCommunications =
    consentCommunicationsRaw === true
      ? "Yes (all communications)"
      : consentCommunicationsRaw === false
        ? "Inquiry updates only"
        : "—";
  const createdAt = record.created_at
    ? new Date(String(record.created_at)).toLocaleString()
    : "—";

  return (
    row("Name", readString(record.name)) +
    row(
      "First / Last",
      `${readString(preferences.firstName)} / ${readString(preferences.lastName)}`
    ) +
    row("Email", readString(record.email)) +
    row("Phone", readString(record.phone)) +
    row(
      "City / State",
      `${readString(record.city)} / ${readString(record.state)}`
    ) +
    row("Interested in specific puppy", readBoolean(record.interested_specific)) +
    row("Puppy ID", readString(record.puppy_id)) +
    row("Puppy", readString(record.puppy_name)) +
    row("Puppy at submit", readString(record.puppy_name_at_submit)) +
    row("Puppy status at submit", readString(record.puppy_status_at_submit)) +
    row("Size preference", readString(preferences.sizePreference)) +
    row("Breed preference", breedPreference) +
    row("Gender preference", readString(preferences.genderPreference)) +
    row("Timeline", readString(record.timeline)) +
    row("Experience", readString(record.experience)) +
    row("How heard about us", readString(preferences.howHeard)) +
    row("How heard details", readString(preferences.howHeardOther)) +
    row("Viewing preference", readString(preferences.viewingPreference)) +
    row(
      "Interested in AI training",
      readBoolean(preferences.wantsAiTraining)
    ) +
    row("Communication consent", consentCommunications) +
    row("Household description", readString(record.household_description)) +
    row("Additional comments", readString(record.additional_comments)) +
    row("Needs follow-up", readBoolean(record.needs_followup)) +
    row("Submitted", createdAt)
  );
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
    payload.table !== "puppy_inquiries"
  ) {
    return new Response(
      JSON.stringify({ message: "Ignored (not a puppy_inquiries INSERT)" }),
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

  const admins = getAdminRecipients();
  if (admins.length === 0) {
    return new Response(
      JSON.stringify({
        error: "Notification not configured (missing NOTIFY_EMAIL)",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const tpl = adminNewPuppyInquiry({
    customerName: readString(record.name, "Someone"),
    rowsHtml: buildRowsHtml(record),
  });

  const r = await sendEmail({
    to: admins,
    subject: tpl.subject,
    html: tpl.html,
  });

  if (!r.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to send notification", details: r.error }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true, id: r.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

Deno.serve(handler);
