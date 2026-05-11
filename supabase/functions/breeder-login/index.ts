// Supabase Edge Function: breeder-login
//
// Public function (verify_jwt=false). Accepts POST { pin, device_label? }
// and on success returns { ok, token, expiresAt }. Used by /breeder/login
// to mint a session token the client then persists in localStorage.
//
// Auth model: the only secret is a 4-digit pin (10,000 possibilities).
// Brute-force is the obvious threat. We rate-limit at 5 failed attempts
// per IP per 15-minute window via breeder_login_attempts, AND we never
// expose the bcrypt hash to the client. On success, the session token
// is what gets stored — the pin itself is never persisted browser-side.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_FAILS_PER_WINDOW = 5;
const WINDOW_MINUTES = 15;
const SESSION_DAYS = 30;

interface RequestBody {
  pin?: string;
  device_label?: string;
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

export async function handler(
  req: Request,
  adminOverride?: SupabaseClient
): Promise<Response> {
  const cors = corsHeaders(req);
  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...cors },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  if (!body.pin || typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin)) {
    return json(400, { ok: false, error: "Pin must be 4 digits" });
  }
  const deviceLabel =
    typeof body.device_label === "string" && body.device_label.length <= 80
      ? body.device_label
      : null;

  const supabase = adminOverride ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const ip = getClientIp(req);

  // Rate-limit: count failed attempts in the last 15 minutes from this IP.
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count: failCount, error: countErr } = await supabase
    .from("breeder_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("succeeded", false)
    .gte("attempted_at", since);

  if (countErr) {
    return json(500, {
      ok: false,
      error: "Failed to check rate limit",
      details: countErr.message,
    });
  }
  if ((failCount ?? 0) >= MAX_FAILS_PER_WINDOW) {
    return json(429, {
      ok: false,
      error: "Too many failed attempts. Wait 15 minutes and try again.",
    });
  }

  // Load the bcrypt hash from breeder_config.
  const { data: config, error: configErr } = await supabase
    .from("breeder_config")
    .select("passcode_hash")
    .eq("id", 1)
    .maybeSingle();

  if (configErr) {
    return json(500, {
      ok: false,
      error: "Failed to read breeder config",
      details: configErr.message,
    });
  }
  if (!config) {
    // Don't reveal whether the pin would have been right; just say the tool isn't set up.
    return json(503, {
      ok: false,
      error: "Breeder tool is not configured. Ask the operator to set the passcode.",
    });
  }

  const matches = await bcrypt.compare(body.pin, config.passcode_hash);

  if (!matches) {
    await supabase
      .from("breeder_login_attempts")
      .insert({ ip_address: ip, succeeded: false });
    return json(403, { ok: false, error: "Incorrect pin" });
  }

  // Issue a session.
  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: session, error: sessErr } = await supabase
    .from("breeder_sessions")
    .insert({
      token,
      expires_at: expiresAt,
      device_label: deviceLabel,
    })
    .select("token, expires_at")
    .single();

  if (sessErr || !session) {
    return json(500, {
      ok: false,
      error: "Failed to create session",
      details: sessErr?.message,
    });
  }

  await supabase
    .from("breeder_login_attempts")
    .insert({ ip_address: ip, succeeded: true });

  return json(200, {
    ok: true,
    token: session.token,
    expiresAt: session.expires_at,
  });
}

Deno.serve(handler);
