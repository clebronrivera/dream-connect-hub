// Shared Resend sender. All edge functions call this rather than fetch() directly
// so env var handling, error formatting, and from-address defaults live in one place.

import { BRAND } from "./brand.ts";
import { stripHtml } from "./components.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_DEFAULT = `${BRAND.name} <onboarding@resend.dev>`;

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string; // auto-derived from html if omitted
  from?: string;
  replyTo?: string;
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
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
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
