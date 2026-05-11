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
    case "confirmLitterBorn":
      return await confirmLitterBorn(supabase, body.payload, json);
    default:
      return json(400, { ok: false, error: `Unknown op: ${body.op ?? "(none)"}` });
  }
}

type JsonResponder = (status: number, body: unknown) => Response;

interface ConfirmLitterBornPayload {
  upcomingLitterId?: string;
  breed?: string;
  dateOfBirth?: string;      // YYYY-MM-DD
  readyDate?: string;        // YYYY-MM-DD
  maleCount?: number;
  femaleCount?: number;
}

function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
}

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function confirmLitterBorn(
  supabase: SupabaseClient,
  payload: unknown,
  json: JsonResponder,
): Promise<Response> {
  const p = (payload ?? {}) as ConfirmLitterBornPayload;

  if (!isUuid(p.upcomingLitterId))
    return json(400, { ok: false, error: "upcomingLitterId must be a UUID" });
  if (!p.breed || typeof p.breed !== "string" || p.breed.trim().length === 0)
    return json(400, { ok: false, error: "breed is required" });
  if (!isIsoDate(p.dateOfBirth))
    return json(400, { ok: false, error: "dateOfBirth must be YYYY-MM-DD" });
  if (!isIsoDate(p.readyDate))
    return json(400, { ok: false, error: "readyDate must be YYYY-MM-DD" });
  const male = Number(p.maleCount ?? 0);
  const female = Number(p.femaleCount ?? 0);
  if (!Number.isInteger(male) || male < 0 || male > 20)
    return json(400, { ok: false, error: "maleCount must be 0-20" });
  if (!Number.isInteger(female) || female < 0 || female > 20)
    return json(400, { ok: false, error: "femaleCount must be 0-20" });
  if (male + female === 0)
    return json(400, { ok: false, error: "Litter must have at least one puppy" });

  const total = male + female;

  // 1) Insert (or update) the litters row sharing the upcoming_litters UUID.
  //    Upsert lets the operator re-run setup harmlessly.
  const { error: littersErr } = await supabase
    .from("litters")
    .upsert({
      id: p.upcomingLitterId,
      breed: p.breed.trim(),
      date_of_birth: p.dateOfBirth,
      ready_date: p.readyDate,
      updated_at: new Date().toISOString(),
    });
  if (littersErr)
    return json(500, { ok: false, error: "Failed to write litters row", details: littersErr.message });

  // 2) Flip the upcoming_litters lifecycle + capture counts.
  const { error: upcomingErr } = await supabase
    .from("upcoming_litters")
    .update({
      lifecycle_status: "post_birth",
      date_of_birth: p.dateOfBirth,
      male_puppy_count: male,
      female_puppy_count: female,
      total_puppy_count: total,
    })
    .eq("id", p.upcomingLitterId);
  if (upcomingErr)
    return json(500, { ok: false, error: "Failed to update upcoming_litters", details: upcomingErr.message });

  return json(200, {
    ok: true,
    data: {
      litterId: p.upcomingLitterId,
      maleCount: male,
      femaleCount: female,
      totalCount: total,
    },
  });
}

// Wrap to keep connInfo out of the test-only adminOverride positional param.
Deno.serve((req) => handler(req));
