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
    case "updateLitterDates":
      return await updateLitterDates(supabase, body.payload, json);
    case "listLitterPuppies":
      return await listLitterPuppies(supabase, body.payload, json);
    case "createPuppy":
      return await createPuppy(supabase, body.payload, json);
    case "updatePuppy":
      return await updatePuppy(supabase, body.payload, json);
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

interface UpdateLitterDatesPayload {
  litterId?: string;
  dateOfBirth?: string;
  readyDate?: string;
}

async function updateLitterDates(
  supabase: SupabaseClient,
  payload: unknown,
  json: JsonResponder,
): Promise<Response> {
  const p = (payload ?? {}) as UpdateLitterDatesPayload;
  if (!isUuid(p.litterId))
    return json(400, { ok: false, error: "litterId must be a UUID" });

  const patch: Record<string, unknown> = {};
  if (p.dateOfBirth !== undefined) {
    if (!isIsoDate(p.dateOfBirth))
      return json(400, { ok: false, error: "dateOfBirth must be YYYY-MM-DD" });
    patch.date_of_birth = p.dateOfBirth;
  }
  if (p.readyDate !== undefined) {
    if (!isIsoDate(p.readyDate))
      return json(400, { ok: false, error: "readyDate must be YYYY-MM-DD" });
    patch.ready_date = p.readyDate;
  }
  if (Object.keys(patch).length === 0)
    return json(400, { ok: false, error: "Provide dateOfBirth and/or readyDate" });

  // Look up the litter; if no row yet (common for legacy admin-created
  // upcoming_litters that have never been touched by the breeder tool),
  // we'll need to UPSERT with breed inherited from upcoming_litters,
  // since breed is NOT NULL on litters.
  patch.updated_at = new Date().toISOString();

  const { data: existing } = await supabase
    .from("litters")
    .select("breed")
    .eq("id", p.litterId)
    .maybeSingle();

  if (existing) {
    // Plain UPDATE — the propagate_litter_ready_date trigger handles
    // fanning a ready_date change out to puppies that haven't been
    // manually overridden.
    const { error } = await supabase.from("litters").update(patch).eq("id", p.litterId);
    if (error)
      return json(500, { ok: false, error: "Failed to update litter dates", details: error.message });
  } else {
    // No litters row yet — create one. Inherit breed from upcoming_litters
    // so we satisfy the NOT NULL constraint and the row remains discoverable
    // via the breeder_litter_summary view's shared-UUID JOIN.
    const { data: upcoming } = await supabase
      .from("upcoming_litters")
      .select("breed")
      .eq("id", p.litterId)
      .maybeSingle();
    if (!upcoming?.breed)
      return json(404, {
        ok: false,
        error: "No upcoming_litters row found for this id — confirm the litter is born first",
      });
    const insertable: Record<string, unknown> = {
      id: p.litterId,
      breed: upcoming.breed,
      ...patch,
    };
    const { error: insErr } = await supabase.from("litters").insert(insertable);
    if (insErr)
      return json(500, { ok: false, error: "Failed to create litters row", details: insErr.message });
  }

  // Mirror date_of_birth back to upcoming_litters so home cards stay accurate.
  if (patch.date_of_birth !== undefined) {
    await supabase
      .from("upcoming_litters")
      .update({ date_of_birth: patch.date_of_birth })
      .eq("id", p.litterId);
  }

  return json(200, { ok: true, data: { litterId: p.litterId } });
}

interface ListLitterPuppiesPayload {
  upcomingLitterId?: string;
}

async function listLitterPuppies(
  supabase: SupabaseClient,
  payload: unknown,
  json: JsonResponder,
): Promise<Response> {
  const p = (payload ?? {}) as ListLitterPuppiesPayload;
  if (!isUuid(p.upcomingLitterId))
    return json(400, { ok: false, error: "upcomingLitterId must be a UUID" });

  const { data, error } = await supabase
    .from("puppies")
    .select(
      "id, name, gender, breed, photos, primary_photo, description, ready_date, status, created_at, updated_at",
    )
    .eq("upcoming_litter_id", p.upcomingLitterId)
    .order("created_at", { ascending: true });
  if (error)
    return json(500, { ok: false, error: "Failed to list puppies", details: error.message });
  return json(200, { ok: true, data: data ?? [] });
}

interface CreatePuppyPayload {
  upcomingLitterId?: string;
  litterId?: string | null;
  name?: string;
  gender?: "Male" | "Female";
}

async function createPuppy(
  supabase: SupabaseClient,
  payload: unknown,
  json: JsonResponder,
): Promise<Response> {
  const p = (payload ?? {}) as CreatePuppyPayload;
  if (!isUuid(p.upcomingLitterId))
    return json(400, { ok: false, error: "upcomingLitterId must be a UUID" });
  if (!p.name || typeof p.name !== "string" || p.name.trim().length === 0)
    return json(400, { ok: false, error: "name is required" });
  if (p.gender !== "Male" && p.gender !== "Female")
    return json(400, { ok: false, error: "gender must be 'Male' or 'Female'" });

  // Pull the litter row to inherit breed + ready_date (the trigger keeps puppies
  // in sync if the litter's ready_date later changes).
  const { data: litter } = await supabase
    .from("litters")
    .select("breed, ready_date")
    .eq("id", p.upcomingLitterId)
    .maybeSingle();

  const { data: upcoming } = await supabase
    .from("upcoming_litters")
    .select("breed")
    .eq("id", p.upcomingLitterId)
    .maybeSingle();

  const breed = litter?.breed ?? upcoming?.breed ?? "";
  if (!breed)
    return json(500, { ok: false, error: "Litter has no breed; confirm setup first" });

  const insertable: Record<string, unknown> = {
    name: p.name.trim(),
    gender: p.gender,
    breed,
    upcoming_litter_id: p.upcomingLitterId,
    litter_id: litter ? p.upcomingLitterId : null,
    status: "Available",
    is_publicly_visible: false,        // hidden until first photo
    photos: [],
  };
  if (litter?.ready_date) insertable.ready_date = litter.ready_date;

  const { data, error } = await supabase
    .from("puppies")
    .insert(insertable)
    .select("id, name, gender, breed, ready_date")
    .single();
  if (error || !data)
    return json(500, { ok: false, error: "Failed to create puppy", details: error?.message });
  return json(200, { ok: true, data });
}

const UPDATE_PUPPY_ALLOWED = new Set([
  "name",
  "gender",
  "photos",
  "primary_photo",
  "description",
  "ready_date",
  "status",
  "is_publicly_visible",
]);

interface UpdatePuppyPayload {
  puppyId?: string;
  fields?: Record<string, unknown>;
}

async function updatePuppy(
  supabase: SupabaseClient,
  payload: unknown,
  json: JsonResponder,
): Promise<Response> {
  const p = (payload ?? {}) as UpdatePuppyPayload;
  if (!isUuid(p.puppyId))
    return json(400, { ok: false, error: "puppyId must be a UUID" });
  if (!p.fields || typeof p.fields !== "object")
    return json(400, { ok: false, error: "fields object is required" });

  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(p.fields)) {
    if (!UPDATE_PUPPY_ALLOWED.has(key))
      return json(400, { ok: false, error: `Disallowed field: ${key}` });
    patch[key] = (p.fields as Record<string, unknown>)[key];
  }
  if (Object.keys(patch).length === 0)
    return json(400, { ok: false, error: "fields must contain at least one allowed key" });

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("puppies")
    .update(patch)
    .eq("id", p.puppyId)
    .select("id, name, gender, breed, photos, primary_photo, description, ready_date, status, is_publicly_visible")
    .single();
  if (error || !data)
    return json(500, { ok: false, error: "Failed to update puppy", details: error?.message });
  return json(200, { ok: true, data });
}

// Wrap to keep connInfo out of the test-only adminOverride positional param.
Deno.serve((req) => handler(req));
