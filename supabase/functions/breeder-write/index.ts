// Supabase Edge Function: breeder-write
//
// Single switchboard for all breeder mutations + reads-that-need-RLS-bypass.
// Gated by `x-breeder-token` header (verifyBreederToken).
//
// PR 4 ops:
//   - loadHome → SELECT * FROM breeder_litter_summary
//
// Future PRs:
//   - confirmLitterBorn  (PR 6)
//   - updateLitterDates  (PR 8)
//   - createPuppy / updatePuppy  (PR 7-8)
//   - createParent / updateParent  (PR 9)
//
// Why route the view read through here instead of supabase.from() on the
// client: the breeder client is not a Supabase auth user — it carries only
// a localStorage breeder-session token. The underlying tables behind
// breeder_litter_summary are admin-only RLS. Service-role inside this
// function bypasses RLS; the breeder token gates the function itself.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyBreederToken, extractBreederToken } from "../_shared/auth/verifyBreederToken.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  op?: string;
  payload?: unknown;
}

export async function handler(
  req: Request,
  adminOverride?: SupabaseClient,
): Promise<Response> {
  const cors = corsHeaders(req);
  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...cors },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const supabase = adminOverride ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const tokenCheck = await verifyBreederToken(supabase, extractBreederToken(req));
  if (!tokenCheck.ok) return json(tokenCheck.status, tokenCheck.body);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  switch (body.op) {
    case "loadHome": {
      const { data, error } = await supabase
        .from("breeder_litter_summary")
        .select("*")
        .order("expected_whelping_date", { ascending: true, nullsFirst: false });
      if (error) return json(500, { ok: false, error: "Failed to load home", details: error.message });
      return json(200, { ok: true, data: data ?? [] });
    }
    default:
      return json(400, { ok: false, error: `Unknown op: ${body.op ?? "(none)"}` });
  }
}

// Wrap to keep connInfo out of the test-only adminOverride positional param.
Deno.serve((req) => handler(req));
