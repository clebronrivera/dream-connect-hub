// Shared Resend sender. All edge functions call this rather than fetch() directly
// so env var handling, error formatting, and from-address defaults live in one place.
//
// Wave H phase 3 (H5): when a caller passes `agreementId`, the function logs
// the send to public.agreement_communications using the service-role client.
// The logging path is best-effort — failures get console.error but never fail
// the email send. Service role bypasses RLS so no policy plumbing is needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND } from "./brand.ts";
import { stripHtml } from "./components.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_DEFAULT = `${BRAND.name} <onboarding@resend.dev>`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string; // auto-derived from html if omitted
  from?: string;
  replyTo?: string;
  /** Wave H H5: when present, an outbound row is auto-logged to
   * agreement_communications after a successful Resend send. */
  agreementId?: string;
  /** Wave H H5: optional override for the timeline summary. Defaults to the
   * email subject. */
  summary?: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not set" };

  const from = args.from ?? Deno.env.get("RESEND_FROM") ?? RESEND_FROM_DEFAULT;
  const to = Array.isArray(args.to) ? args.to : [args.to];
  const text = args.text ?? stripHtml(args.html);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject: args.subject,
        html: args.html,
        text,
        reply_to: args.replyTo,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${errBody}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };

    // Best-effort H5 audit log. Never fail the email send because of this.
    if (args.agreementId) {
      logOutboundEmail({
        agreementId: args.agreementId,
        summary: args.summary ?? args.subject,
        to,
      }).catch((err) =>
        console.error("send.ts H5 auto-log failed:", (err as Error).message),
      );
    }

    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function logOutboundEmail(args: {
  agreementId: string;
  summary: string;
  to: string[];
}): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("send.ts H5 auto-log skipped: SUPABASE creds missing");
    return;
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const summary = args.to.length > 0
    ? `${args.summary} → ${args.to.join(", ")}`
    : args.summary;
  const { error } = await admin.from("agreement_communications").insert({
    agreement_id: args.agreementId,
    direction: "outbound",
    channel: "email",
    summary,
    // recorded_by_user_id intentionally NULL — system auto-log, no operator.
  });
  if (error) {
    console.error("send.ts H5 auto-log insert failed:", error.message);
  }
}

// Helper: parse comma-separated NOTIFY_EMAIL env var into a clean array.
export function getAdminRecipients(): string[] {
  const raw = Deno.env.get("NOTIFY_EMAIL") ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
