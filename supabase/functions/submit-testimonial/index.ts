// Supabase Edge Function: gated insert into public.testimonials.
//
// Replaces the direct anon `from('testimonials').insert(...)` write with a
// captcha-checked, service-role-authored insert. Photo upload remains a direct
// client write to the `testimonial-photos` storage bucket; this function only
// handles the row insert and is given the resulting `photo_path` (if any).
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

interface SubmitTestimonialRequest {
  customer_name?: string;
  puppy_name?: string | null;
  breed?: string | null;
  message?: string;
  city?: string | null;
  state?: string | null;
  photo_path?: string | null;
  turnstile_token?: string;
}

const MAX_NAME_LEN = 120;
const MAX_BREED_LEN = 80;
const MAX_LOC_LEN = 80;
const MAX_MESSAGE_LEN = 2000;
const MAX_PHOTO_PATH_LEN = 256;

function trimToLen(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
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

  let body: SubmitTestimonialRequest;
  try {
    body = (await req.json()) as SubmitTestimonialRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const customerName = trimToLen(body.customer_name, MAX_NAME_LEN);
  const message = trimToLen(body.message, MAX_MESSAGE_LEN);
  if (!customerName || !message) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: customer_name, message",
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
    .from("testimonials")
    .insert({
      customer_name: customerName,
      puppy_name: trimToLen(body.puppy_name, MAX_NAME_LEN),
      breed: trimToLen(body.breed, MAX_BREED_LEN),
      message,
      city: trimToLen(body.city, MAX_LOC_LEN),
      state: trimToLen(body.state, MAX_LOC_LEN),
      photo_path: trimToLen(body.photo_path, MAX_PHOTO_PATH_LEN),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert testimonial:", error);
    return new Response(
      JSON.stringify({ error: "Failed to save testimonial" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true, id: data?.id }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
