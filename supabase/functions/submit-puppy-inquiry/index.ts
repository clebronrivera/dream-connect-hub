// Supabase Edge Function: gated insert into public.puppy_inquiries.
//
// Replaces the direct anon `from('puppy_inquiries').insert(...)` write done
// by `PuppyInterestForm` with a captcha-checked, service-role-authored
// insert. The downstream `notify-puppy-inquiry` webhook fires on the row
// insert exactly as before — admin notification email is unaffected.
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

interface SubmitPuppyInquiryRequest {
  status?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  interested_specific?: boolean | null;
  puppy_id?: string | null;
  puppy_name?: string | null;
  timeline?: string | null;
  experience?: string | null;
  household_description?: string | null;
  preferences?: Record<string, unknown> | null;
  additional_comments?: string | null;
  needs_followup?: boolean | null;
  puppy_name_at_submit?: string | null;
  puppy_status_at_submit?: string | null;
  turnstile_token?: string;
}

const MAX_NAME_LEN = 240; // first + last
const MAX_EMAIL_LEN = 254;
const MAX_PHONE_LEN = 32;
const MAX_LOC_LEN = 80;
const MAX_PUPPY_ID_LEN = 64;
const MAX_PUPPY_NAME_LEN = 120;
const MAX_TIMELINE_LEN = 80;
const MAX_EXPERIENCE_LEN = 80;
const MAX_LONG_TEXT_LEN = 4000; // household_description, additional_comments
const MAX_STATUS_LEN = 32;
const ALLOWED_STATUSES = new Set<string>(["active", "inactive"]);

function trimToLen(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function sanitizeBoolean(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  return null;
}

// Preferences is a JSONB blob shaped by the form. We keep it opaque, only
// enforcing that it's an object and serializes to a reasonable size.
const MAX_PREFERENCES_BYTES = 16 * 1024;
function sanitizePreferences(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const json = JSON.stringify(value);
    if (json.length > MAX_PREFERENCES_BYTES) {
      console.warn(
        `Preferences blob ${json.length} bytes exceeds ${MAX_PREFERENCES_BYTES}; dropping.`
      );
      return null;
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
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

  let body: SubmitPuppyInquiryRequest;
  try {
    body = (await req.json()) as SubmitPuppyInquiryRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const name = trimToLen(body.name, MAX_NAME_LEN);
  const email = trimToLen(body.email, MAX_EMAIL_LEN);
  if (!name || !email) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: name, email",
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

  const rawStatus = trimToLen(body.status, MAX_STATUS_LEN);
  const status =
    rawStatus && ALLOWED_STATUSES.has(rawStatus) ? rawStatus : "active";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("puppy_inquiries")
    .insert({
      status,
      name,
      email,
      phone: trimToLen(body.phone, MAX_PHONE_LEN),
      city: trimToLen(body.city, MAX_LOC_LEN),
      state: trimToLen(body.state, MAX_LOC_LEN),
      interested_specific: sanitizeBoolean(body.interested_specific),
      puppy_id: trimToLen(body.puppy_id, MAX_PUPPY_ID_LEN),
      puppy_name: trimToLen(body.puppy_name, MAX_PUPPY_NAME_LEN),
      timeline: trimToLen(body.timeline, MAX_TIMELINE_LEN),
      experience: trimToLen(body.experience, MAX_EXPERIENCE_LEN),
      household_description: trimToLen(
        body.household_description,
        MAX_LONG_TEXT_LEN
      ),
      preferences: sanitizePreferences(body.preferences),
      additional_comments: trimToLen(body.additional_comments, MAX_LONG_TEXT_LEN),
      needs_followup: sanitizeBoolean(body.needs_followup) ?? false,
      puppy_name_at_submit: trimToLen(
        body.puppy_name_at_submit,
        MAX_PUPPY_NAME_LEN
      ),
      puppy_status_at_submit: trimToLen(
        body.puppy_status_at_submit,
        MAX_STATUS_LEN
      ),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert puppy_inquiry:", error);
    return new Response(
      JSON.stringify({ error: "Failed to save inquiry" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true, id: data?.id }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
