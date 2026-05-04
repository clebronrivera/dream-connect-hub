// Supabase Edge Function: gated insert into public.contact_messages.
//
// Replaces the direct anon `from('contact_messages').insert(...)` write with a
// captcha-checked, service-role-authored insert. The downstream
// `notify-contact-message` webhook fires on the resulting row insert exactly
// as before — so admin + customer ack emails still go out unchanged.
//
// Required secrets (Supabase Edge Function secrets):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - TURNSTILE_SECRET_KEY (read by _shared/turnstile.ts)
//
// CORS allowlist comes from _shared/cors.ts.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyTurnstileToken } from "../_shared/turnstile.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SubmitContactMessageRequest {
  name?: string;
  email?: string;
  phone?: string | null;
  subject?: string;
  message?: string;
  upcoming_litter_id?: string | null;
  upcoming_litter_label?: string | null;
  upcoming_puppy_placeholder_id?: string | null;
  upcoming_puppy_placeholder_summary?: string | null;
  city?: string | null;
  state?: string | null;
  interest_options?: string[] | null;
  turnstile_token?: string;
}

const MAX_NAME_LEN = 120;
const MAX_EMAIL_LEN = 254;
const MAX_PHONE_LEN = 32;
const MAX_SUBJECT_LEN = 200;
const MAX_MESSAGE_LEN = 4000;
const MAX_LITTER_LABEL_LEN = 200;
const MAX_PLACEHOLDER_SUMMARY_LEN = 400;
const MAX_LOC_LEN = 80;
const MAX_INTEREST_OPTION_LEN = 200;
const MAX_INTEREST_OPTIONS = 12;

function trimToLen(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function trimInterestOptions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, MAX_INTEREST_OPTIONS)
    .map((item) => item.slice(0, MAX_INTEREST_OPTION_LEN));
  return cleaned.length > 0 ? cleaned : null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: SubmitContactMessageRequest;
  try {
    body = (await req.json()) as SubmitContactMessageRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const name = trimToLen(body.name, MAX_NAME_LEN);
  const email = trimToLen(body.email, MAX_EMAIL_LEN);
  const subject = trimToLen(body.subject, MAX_SUBJECT_LEN);
  const message = trimToLen(body.message, MAX_MESSAGE_LEN);
  if (!name || !email || !subject || !message) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: name, email, subject, message",
      }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const remoteIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const turnstileResult = await verifyTurnstileToken(
    body.turnstile_token,
    remoteIp
  );
  if (!turnstileResult.ok) {
    return new Response(
      JSON.stringify({
        error: "Captcha verification failed",
        codes: turnstileResult.errorCodes ?? [],
      }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("contact_messages")
    .insert({
      name,
      email,
      phone: trimToLen(body.phone, MAX_PHONE_LEN),
      subject,
      message,
      upcoming_litter_id: trimToLen(body.upcoming_litter_id, 64),
      upcoming_litter_label: trimToLen(
        body.upcoming_litter_label,
        MAX_LITTER_LABEL_LEN
      ),
      upcoming_puppy_placeholder_id: trimToLen(
        body.upcoming_puppy_placeholder_id,
        64
      ),
      upcoming_puppy_placeholder_summary: trimToLen(
        body.upcoming_puppy_placeholder_summary,
        MAX_PLACEHOLDER_SUMMARY_LEN
      ),
      city: trimToLen(body.city, MAX_LOC_LEN),
      state: trimToLen(body.state, MAX_LOC_LEN),
      interest_options: trimInterestOptions(body.interest_options),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert contact_message:", error);
    return new Response(
      JSON.stringify({ error: "Failed to save contact message" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true, id: data?.id }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
