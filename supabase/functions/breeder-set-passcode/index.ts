// Supabase Edge Function: breeder-set-passcode
//
// Admin-gated (verifyAdmin). Accepts POST { pin, label } where pin is a
// 4-digit string and label names which breeder_pins row it belongs to
// (e.g. "Yolanda", "Carlos"). Hashes the pin and upserts by label — a
// new label creates a new pin, an existing one (case-insensitive) rotates
// it. All labeled pins grant identical breeder access; this is not a role
// system. Carlos calls this from /admin/settings/breeder-passcode.
//
// Existing breeder sessions are NOT revoked when a pin rotates — they
// expire naturally at the 30-day mark. This matches the plan acceptance
// criterion #11: "rotate the pin; Yolanda's existing session keeps working
// until natural expiry; next login uses the new pin."

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAdmin } from "../_shared/auth/verifyAdmin.ts";
import { hashPin } from "../_shared/auth/pinHash.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  pin?: string;
  label?: string;
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

  const supabase = adminOverride ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const auth = await verifyAdmin(req, supabase);
  if (!auth.ok) return json(auth.status, auth.body);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }
  if (!body.pin || typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin)) {
    return json(400, { ok: false, error: "Pin must be 4 digits" });
  }
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label || label.length > 40) {
    return json(400, { ok: false, error: "Label is required (max 40 chars)" });
  }

  const hash = await hashPin(body.pin);
  const now = new Date().toISOString();

  // Upsert by label, case-insensitively — the unique index is on
  // lower(label), which supabase-js .upsert() can't target directly, so
  // look the row up first.
  const { data: existing, error: findErr } = await supabase
    .from("breeder_pins")
    .select("id")
    .filter("label", "ilike", label.replace(/[%_]/g, (c) => `\\${c}`));

  if (findErr) {
    return json(500, {
      ok: false,
      error: "Failed to look up existing pin",
      details: findErr.message,
    });
  }

  const existingId = existing?.[0]?.id as string | undefined;
  const { error } = existingId
    ? await supabase
        .from("breeder_pins")
        .update({ label, passcode_hash: hash, updated_at: now })
        .eq("id", existingId)
    : await supabase
        .from("breeder_pins")
        .insert({ label, passcode_hash: hash, updated_at: now });

  if (error) {
    return json(500, {
      ok: false,
      error: "Failed to save passcode",
      details: error.message,
    });
  }

  return json(200, { ok: true });
}

// Deno.serve passes (req, { remoteAddr }) — wrap so connInfo doesn't
// leak into the test-only adminOverride positional param.
Deno.serve((req) => handler(req));
