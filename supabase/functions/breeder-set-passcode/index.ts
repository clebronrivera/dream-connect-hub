// Supabase Edge Function: breeder-set-passcode
//
// Admin-gated (verifyAdmin). Accepts POST { pin } where pin is a 4-digit
// string, bcrypt-hashes it, and upserts the single-row breeder_config
// table. Carlos calls this from /admin/settings/breeder-passcode.
//
// Existing breeder sessions are NOT revoked when the pin rotates — they
// expire naturally at the 30-day mark. This matches the plan acceptance
// criterion #11: "rotate the pin; Yolanda's existing session keeps working
// until natural expiry; next login uses the new pin."

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAdmin } from "../_shared/auth/verifyAdmin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BCRYPT_COST = 10;

interface RequestBody {
  pin?: string;
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

  const hash = await bcrypt.hash(body.pin, BCRYPT_COST);

  const { error } = await supabase
    .from("breeder_config")
    .upsert({ id: 1, passcode_hash: hash, updated_at: new Date().toISOString() });

  if (error) {
    return json(500, {
      ok: false,
      error: "Failed to save passcode",
      details: error.message,
    });
  }

  return json(200, { ok: true });
}

Deno.serve(handler);
