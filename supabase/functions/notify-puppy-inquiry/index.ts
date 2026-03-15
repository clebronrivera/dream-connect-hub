// Supabase Edge Function: send email when a new row is inserted into puppy_inquiries.
// Triggered by a Database Webhook (INSERT on public.puppy_inquiries).
// Requires: RESEND_API_KEY, NOTIFY_EMAIL. Optional: RESEND_FROM.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Comma-separated emails; e.g. "a@b.com, c@d.com" or just "a@b.com"
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
  const interestedSpecific = readBoolean(record.interested_specific);
  const puppyId = readString(record.puppy_id);
  const puppyName = readString(record.puppy_name);
  const puppyNameAtSubmit = readString(record.puppy_name_at_submit);
  const puppyStatusAtSubmit = readString(record.puppy_status_at_submit);
  const timeline = readString(record.timeline);
  const experience = readString(record.experience);
  const needsFollowup = readBoolean(record.needs_followup);
  const householdDescription = readString(record.household_description);
  const additionalComments = readString(record.additional_comments);
  const preferences = isRecord(record.preferences) ? record.preferences : {};
  const firstName = readString(preferences.firstName);
  const lastName = readString(preferences.lastName);
  const sizePreference = readString(preferences.sizePreference);
  const breedPreferenceList = readStringArray(preferences.breedPreference);
  const breedPreference = breedPreferenceList.length ? breedPreferenceList.join(", ") : "—";
  const genderPreference = readString(preferences.genderPreference);
  const howHeard = readString(preferences.howHeard);
  const howHeardOther = readString(preferences.howHeardOther);
  const viewingPreference = readString(preferences.viewingPreference);
  const wantsAiTraining = readBoolean(preferences.wantsAiTraining);
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

  return `
<h2>New puppy inquiry</h2>
<table style="border-collapse: collapse; max-width: 480px;">
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Name</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(name)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>First / Last</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(firstName)} / ${escapeHtml(lastName)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Email</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Phone</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(phone)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>City / State</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(city)} / ${escapeHtml(state)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Interested in specific puppy</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${interestedSpecific}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Puppy ID</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(puppyId)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Puppy</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(puppyName)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Puppy at submit</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(puppyNameAtSubmit)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Puppy status at submit</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(puppyStatusAtSubmit)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Size preference</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(sizePreference)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Breed preference</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(breedPreference)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Gender preference</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(genderPreference)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Timeline</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(timeline)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Experience</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(experience)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>How heard about us</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(howHeard)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>How heard details</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(howHeardOther)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Viewing preference</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(viewingPreference)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Interested in AI training</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${wantsAiTraining}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Communication consent</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(consentCommunications)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Household description</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(householdDescription)}</td></tr>
  <tr><td style="padding: 6px 12px; border: 1px solid #eee;"><strong>Additional comments</strong></td><td style="padding: 6px 12px; border: 1px solid #eee;">${escapeHtml(additionalComments)}</td></tr>
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

  const inquirySubject = "Puppy Inquiry";
  const subject = `New puppy inquiry from ${[record.name].flat().join(" ")}`;
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
