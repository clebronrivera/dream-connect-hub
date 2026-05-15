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
    case "listAllPuppies":
      return await listAllPuppies(supabase, json);
    case "createPuppy":
      return await createPuppy(supabase, body.payload, json);
    case "updatePuppy":
      return await updatePuppy(supabase, body.payload, json);
    case "deletePuppy":
      return await deletePuppy(supabase, body.payload, json);
    case "listParents":
      return await listParents(supabase, json);
    case "createParent":
      return await createParent(supabase, body.payload, json);
    case "updateParent":
      return await updateParent(supabase, body.payload, json);
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
  basePrice?: number | null; // litter-wide default price; inherited by puppies
}

function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
}

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizePrice(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100000) return "invalid";
  // Round to 2dp to match NUMERIC storage.
  return Math.round(n * 100) / 100;
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

  const price = normalizePrice(p.basePrice);
  if (price === "invalid")
    return json(400, { ok: false, error: "basePrice must be a non-negative number up to 100000" });

  // 1) Insert (or update) the litters row sharing the upcoming_litters UUID.
  //    Upsert lets the operator re-run setup harmlessly.
  const littersRow: Record<string, unknown> = {
    id: p.upcomingLitterId,
    breed: p.breed.trim(),
    date_of_birth: p.dateOfBirth,
    ready_date: p.readyDate,
    updated_at: new Date().toISOString(),
  };
  if (price !== null) littersRow.base_price = price;

  const { error: littersErr } = await supabase.from("litters").upsert(littersRow);
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
  basePrice?: number | null;
}

// (Note: this also carries the PR 8 upsert fix — when no litters row exists
//  yet for an upcoming_litter, we INSERT one with breed inherited from
//  upcoming_litters. On rebase after PR 8 merges, keep this version.)
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
  if (p.basePrice !== undefined) {
    const price = normalizePrice(p.basePrice);
    if (price === "invalid")
      return json(400, { ok: false, error: "basePrice must be a non-negative number up to 100000" });
    patch.base_price = price;
  }
  if (Object.keys(patch).length === 0)
    return json(400, { ok: false, error: "Provide dateOfBirth, readyDate, or basePrice" });

  patch.updated_at = new Date().toISOString();

  // PR 8 fix carried forward: upsert when no row exists yet.
  const { data: existing } = await supabase
    .from("litters")
    .select("breed")
    .eq("id", p.litterId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("litters").update(patch).eq("id", p.litterId);
    if (error)
      return json(500, { ok: false, error: "Failed to update litter", details: error.message });
  } else {
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
      "id, name, gender, breed, color, date_of_birth, photos, primary_photo, video_path, description, ready_date, base_price, status, is_publicly_visible, vaccinated_at, created_at, updated_at",
    )
    .eq("upcoming_litter_id", p.upcomingLitterId)
    .order("created_at", { ascending: true });
  if (error)
    return json(500, { ok: false, error: "Failed to list puppies", details: error.message });
  return json(200, { ok: true, data: data ?? [] });
}

async function listAllPuppies(
  supabase: SupabaseClient,
  json: JsonResponder,
): Promise<Response> {
  // Roster across every litter — drives the /breeder Puppies tab so the
  // breeder can edit any puppy even when its parent litter is no longer
  // surfaced on the Home view (e.g. older "previous" upcoming_litters).
  // Service-role bypass means RLS doesn't need to know about the breeder
  // client.
  const { data, error } = await supabase
    .from("puppies")
    .select(
      `id, name, gender, breed, color, date_of_birth, photos, primary_photo,
       video_path, description, ready_date, base_price, status,
       is_publicly_visible, vaccinated_at, created_at, updated_at,
       upcoming_litter_id, litter_id,
       upcoming_litters:upcoming_litter_id (
         breed,
         dam:dam_id ( name ),
         sire:sire_id ( name )
       )`,
    )
    .order("created_at", { ascending: false });
  if (error)
    return json(500, {
      ok: false,
      error: "Failed to list all puppies",
      details: error.message,
    });
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

  // Pull the litter row to inherit breed + ready_date + base_price (the triggers keep puppies
  // in sync if the litter's ready_date later changes).
  const { data: litter } = await supabase
    .from("litters")
    .select("breed, ready_date, base_price")
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
  if (litter?.base_price != null) insertable.base_price = litter.base_price;

  const { data, error } = await supabase
    .from("puppies")
    .insert(insertable)
    .select("id, name, gender, breed, ready_date, base_price")
    .single();
  if (error || !data)
    return json(500, { ok: false, error: "Failed to create puppy", details: error?.message });

  // Sync upcoming_litters counts with reality after this insert. If the
  // operator just added a surprise puppy beyond the count entered at
  // setup, bump the appropriate counter so the wizard's progress UI
  // matches what's actually in the DB.
  await syncLitterCounts(supabase, p.upcomingLitterId);

  return json(200, { ok: true, data });
}

async function syncLitterCounts(
  supabase: SupabaseClient,
  upcomingLitterId: string,
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("puppies")
    .select("gender")
    .eq("upcoming_litter_id", upcomingLitterId);
  if (error || !rows) return;
  const males = rows.filter((r) => r.gender === "Male").length;
  const females = rows.filter((r) => r.gender === "Female").length;

  const { data: current } = await supabase
    .from("upcoming_litters")
    .select("male_puppy_count, female_puppy_count, total_puppy_count")
    .eq("id", upcomingLitterId)
    .maybeSingle();

  // Only ever increase the counts — never shrink, since admin may have
  // intentionally set a target the breeder hasn't filled yet.
  const nextMale = Math.max(males, current?.male_puppy_count ?? 0);
  const nextFemale = Math.max(females, current?.female_puppy_count ?? 0);
  const nextTotal = Math.max(males + females, current?.total_puppy_count ?? 0);

  await supabase
    .from("upcoming_litters")
    .update({
      male_puppy_count: nextMale,
      female_puppy_count: nextFemale,
      total_puppy_count: nextTotal,
    })
    .eq("id", upcomingLitterId);
}

const UPDATE_PUPPY_ALLOWED = new Set([
  "name",
  "gender",
  "color",
  "date_of_birth",
  "photos",
  "primary_photo",
  "video_path",
  "description",
  "ready_date",
  "base_price",
  "status",
  "is_publicly_visible",
  "vaccinated_at",
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
    const value = (p.fields as Record<string, unknown>)[key];
    if (key === "base_price") {
      const normalized = normalizePrice(value);
      if (normalized === "invalid")
        return json(400, { ok: false, error: "base_price must be a non-negative number up to 100000" });
      patch.base_price = normalized;
    } else {
      patch[key] = value;
    }
  }
  if (Object.keys(patch).length === 0)
    return json(400, { ok: false, error: "fields must contain at least one allowed key" });

  // If gender is being changed, capture the prior value + litter so we can
  // shift the litter's male/female counters after the update. syncLitterCounts
  // never shrinks (admin-set targets are preserved on insert), so a flip needs
  // explicit 1-for-1 swap handling.
  let priorGender: string | null = null;
  let priorUpcomingLitterId: string | null = null;
  if ("gender" in patch) {
    const { data: prior } = await supabase
      .from("puppies")
      .select("gender, upcoming_litter_id")
      .eq("id", p.puppyId)
      .maybeSingle();
    priorGender = prior?.gender ?? null;
    priorUpcomingLitterId = prior?.upcoming_litter_id ?? null;
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("puppies")
    .update(patch)
    .eq("id", p.puppyId)
    .select("id, name, gender, breed, color, date_of_birth, photos, primary_photo, video_path, description, ready_date, base_price, status, is_publicly_visible, vaccinated_at")
    .single();
  if (error || !data)
    return json(500, { ok: false, error: "Failed to update puppy", details: error?.message });

  if (
    priorGender &&
    priorUpcomingLitterId &&
    typeof patch.gender === "string" &&
    patch.gender !== priorGender
  ) {
    await shiftLitterCountForGenderChange(
      supabase,
      priorUpcomingLitterId,
      priorGender as "Male" | "Female",
      patch.gender as "Male" | "Female",
    );
  }

  return json(200, { ok: true, data });
}

interface DeletePuppyPayload {
  puppyId?: string;
}

async function deletePuppy(
  supabase: SupabaseClient,
  payload: unknown,
  json: JsonResponder,
): Promise<Response> {
  const p = (payload ?? {}) as DeletePuppyPayload;
  if (!isUuid(p.puppyId))
    return json(400, { ok: false, error: "puppyId must be a UUID" });

  // Capture the parent litter before delete so we can refresh counts after.
  // FK posture on puppies.id (verified): deposit_agreements + deposit_requests
  // both SET NULL, puppy_expenses CASCADEs. Hard delete is safe — agreement
  // history is preserved with a null puppy_id, expenses go away with the row.
  const { data: prior } = await supabase
    .from("puppies")
    .select("upcoming_litter_id")
    .eq("id", p.puppyId)
    .maybeSingle();
  if (!prior)
    return json(404, { ok: false, error: "Puppy not found" });

  const { error } = await supabase.from("puppies").delete().eq("id", p.puppyId);
  if (error)
    return json(500, {
      ok: false,
      error: "Failed to delete puppy",
      details: error.message,
    });

  if (prior.upcoming_litter_id) {
    await recomputeLitterCountsExactly(supabase, prior.upcoming_litter_id);
  }

  return json(200, { ok: true, data: { id: p.puppyId } });
}

async function recomputeLitterCountsExactly(
  supabase: SupabaseClient,
  upcomingLitterId: string,
): Promise<void> {
  // Unlike syncLitterCounts (which only grows to preserve admin targets), a
  // delete is the breeder explicitly correcting reality — set the counts to
  // what's actually there, even if that means decrementing below the prior
  // target.
  const { data: rows } = await supabase
    .from("puppies")
    .select("gender")
    .eq("upcoming_litter_id", upcomingLitterId);
  const males = (rows ?? []).filter((r) => r.gender === "Male").length;
  const females = (rows ?? []).filter((r) => r.gender === "Female").length;
  await supabase
    .from("upcoming_litters")
    .update({
      male_puppy_count: males,
      female_puppy_count: females,
      total_puppy_count: males + females,
    })
    .eq("id", upcomingLitterId);
}

async function shiftLitterCountForGenderChange(
  supabase: SupabaseClient,
  upcomingLitterId: string,
  fromGender: "Male" | "Female",
  toGender: "Male" | "Female",
): Promise<void> {
  if (fromGender === toGender) return;
  const { data: cur } = await supabase
    .from("upcoming_litters")
    .select("male_puppy_count, female_puppy_count")
    .eq("id", upcomingLitterId)
    .maybeSingle();
  if (!cur) return;
  const males = cur.male_puppy_count ?? 0;
  const females = cur.female_puppy_count ?? 0;
  const nextMale =
    fromGender === "Male" ? Math.max(0, males - 1) : males + 1;
  const nextFemale =
    fromGender === "Female" ? Math.max(0, females - 1) : females + 1;
  await supabase
    .from("upcoming_litters")
    .update({
      male_puppy_count: nextMale,
      female_puppy_count: nextFemale,
    })
    .eq("id", upcomingLitterId);
}

// ---------- Parent dogs ----------

async function listParents(supabase: SupabaseClient, json: JsonResponder): Promise<Response> {
  const { data, error } = await supabase
    .from("breeding_dogs")
    .select("id, name, role, breed, composition, color, photo_path, photos, created_at, updated_at")
    .order("role", { ascending: true })
    .order("name", { ascending: true });
  if (error)
    return json(500, { ok: false, error: "Failed to list parents", details: error.message });
  return json(200, { ok: true, data: data ?? [] });
}

interface ParentInputPayload {
  name?: string;
  role?: "Sire" | "Dam";
  breed?: string;
  composition?: string;
  color?: string;
  photos?: string[];
  photo_path?: string | null;
}

function validateParentFields(p: ParentInputPayload): string | null {
  if (!p.name || typeof p.name !== "string" || p.name.trim().length === 0) return "name is required";
  if (p.role !== "Sire" && p.role !== "Dam") return "role must be 'Sire' or 'Dam'";
  if (!p.breed || typeof p.breed !== "string" || p.breed.trim().length === 0) return "breed is required";
  if (!p.composition || typeof p.composition !== "string" || p.composition.trim().length === 0)
    return "composition is required";
  if (!p.color || typeof p.color !== "string" || p.color.trim().length === 0) return "color is required";
  if (p.photos && !Array.isArray(p.photos)) return "photos must be an array";
  return null;
}

async function createParent(
  supabase: SupabaseClient,
  payload: unknown,
  json: JsonResponder,
): Promise<Response> {
  const p = (payload ?? {}) as ParentInputPayload;
  const err = validateParentFields(p);
  if (err) return json(400, { ok: false, error: err });

  const insertable: Record<string, unknown> = {
    name: p.name!.trim(),
    role: p.role,
    breed: p.breed!.trim(),
    composition: p.composition!.trim(),
    color: p.color!.trim(),
    photos: p.photos ?? [],
  };
  if (p.photo_path) insertable.photo_path = p.photo_path;
  else if (p.photos && p.photos.length > 0) insertable.photo_path = p.photos[0];

  const { data, error } = await supabase
    .from("breeding_dogs")
    .insert(insertable)
    .select("id, name, role, breed, composition, color, photo_path, photos")
    .single();
  if (error || !data)
    return json(500, { ok: false, error: "Failed to create parent", details: error?.message });
  return json(200, { ok: true, data });
}

const UPDATE_PARENT_ALLOWED = new Set([
  "name",
  "role",
  "breed",
  "composition",
  "color",
  "photos",
  "photo_path",
]);

interface UpdateParentPayload {
  dogId?: string;
  fields?: Record<string, unknown>;
}

async function updateParent(
  supabase: SupabaseClient,
  payload: unknown,
  json: JsonResponder,
): Promise<Response> {
  const p = (payload ?? {}) as UpdateParentPayload;
  if (!isUuid(p.dogId)) return json(400, { ok: false, error: "dogId must be a UUID" });
  if (!p.fields || typeof p.fields !== "object")
    return json(400, { ok: false, error: "fields object is required" });

  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(p.fields)) {
    if (!UPDATE_PARENT_ALLOWED.has(key))
      return json(400, { ok: false, error: `Disallowed field: ${key}` });
    patch[key] = (p.fields as Record<string, unknown>)[key];
  }
  if (Object.keys(patch).length === 0)
    return json(400, { ok: false, error: "fields must contain at least one allowed key" });
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("breeding_dogs")
    .update(patch)
    .eq("id", p.dogId)
    .select("id, name, role, breed, composition, color, photo_path, photos")
    .single();
  if (error || !data)
    return json(500, { ok: false, error: "Failed to update parent", details: error?.message });
  return json(200, { ok: true, data });
}

// Wrap to keep connInfo out of the test-only adminOverride positional param.
Deno.serve((req) => handler(req));
