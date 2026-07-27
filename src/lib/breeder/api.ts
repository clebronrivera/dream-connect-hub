// Thin client-side wrappers around the breeder edge functions.

import { supabase } from "@/lib/supabase";
import { appEnv } from "@/lib/env";
import type { BreederLitterSummary } from "@/types/breeder";

interface LoginSuccess {
  ok: true;
  token: string;
  expiresAt: string;
}
interface LoginFailure {
  ok: false;
  error: string;
  status?: number;
}
export type LoginResult = LoginSuccess | LoginFailure;

export async function breederLogin(
  pin: string,
  deviceLabel?: string,
): Promise<LoginResult> {
  const { data, error } = await supabase.functions.invoke<
    | { ok: true; token: string; expiresAt: string }
    | { ok: false; error: string }
  >("breeder-login", {
    body: { pin, device_label: deviceLabel },
  });

  if (error) {
    // supabase-js wraps non-2xx as FunctionsHttpError; the body is on context.response.
    const ctx = (error as unknown as { context?: { response?: Response } }).context;
    if (ctx?.response) {
      try {
        const body = (await ctx.response.json()) as { error?: string };
        return {
          ok: false,
          error: body.error ?? error.message,
          status: ctx.response.status,
        };
      } catch {
        /* fall through */
      }
    }
    return { ok: false, error: error.message };
  }
  if (!data || !data.ok) {
    return {
      ok: false,
      error: (data as { error?: string } | null)?.error ?? "Unknown error",
    };
  }
  return data;
}

type BreederWriteResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

async function callBreederWrite<T>(
  token: string,
  op: string,
  payload?: unknown,
): Promise<BreederWriteResult<T>> {
  return callBreederFn<T>("breeder-write", token, op, payload);
}

/**
 * puppy_media ops live on their own edge function rather than on the
 * breeder-write switchboard.
 *
 * breeder-write is load-bearing for every breeder screen (home, roster, puppy
 * create/update, parents). Media is a newer, self-contained concern, so it
 * gets its own deployable — a bad media deploy can't take the rest of the
 * portal down with it. Identical auth and envelope, different function name.
 */
async function callBreederMedia<T>(
  token: string,
  op: string,
  payload?: unknown,
): Promise<BreederWriteResult<T>> {
  return callBreederFn<T>("breeder-media", token, op, payload);
}

async function callBreederFn<T>(
  fnName: "breeder-write" | "breeder-media",
  token: string,
  op: string,
  payload?: unknown,
): Promise<BreederWriteResult<T>> {
  const { data, error } = await supabase.functions.invoke<
    { ok: true; data: T } | { ok: false; error: string }
  >(fnName, {
    body: { op, payload },
    headers: { "x-breeder-token": token },
  });

  if (error) {
    const ctx = (error as unknown as { context?: { response?: Response } }).context;
    if (ctx?.response) {
      try {
        const body = (await ctx.response.json()) as { error?: string };
        return {
          ok: false,
          error: body.error ?? error.message,
          status: ctx.response.status,
        };
      } catch {
        /* fall through */
      }
    }
    return { ok: false, error: error.message };
  }
  if (!data || !data.ok) {
    return {
      ok: false,
      error: (data as { error?: string } | null)?.error ?? "Unknown error",
    };
  }
  return { ok: true, data: data.data };
}

export function loadBreederHome(
  token: string,
): Promise<BreederWriteResult<BreederLitterSummary[]>> {
  return callBreederWrite<BreederLitterSummary[]>(token, "loadHome");
}

export interface ConfirmLitterBornPayload {
  upcomingLitterId: string;
  breed: string;
  dateOfBirth: string; // YYYY-MM-DD
  readyDate: string;   // YYYY-MM-DD
  maleCount: number;
  femaleCount: number;
  basePrice?: number | null;
}

export interface ConfirmLitterBornResult {
  litterId: string;
  maleCount: number;
  femaleCount: number;
  totalCount: number;
}

export function confirmLitterBorn(
  token: string,
  payload: ConfirmLitterBornPayload,
): Promise<BreederWriteResult<ConfirmLitterBornResult>> {
  return callBreederWrite<ConfirmLitterBornResult>(token, "confirmLitterBorn", payload);
}

export function updateLitterDates(
  token: string,
  payload: {
    litterId: string;
    dateOfBirth?: string;
    readyDate?: string;
    basePrice?: number | null;
  },
): Promise<BreederWriteResult<{ litterId: string }>> {
  return callBreederWrite(token, "updateLitterDates", payload);
}

export interface BreederPuppyRow {
  id: string;
  name: string;
  gender: "Male" | "Female";
  breed: string;
  /** Free-text color; PUPPY_COLORS in breed-utils lists the canonical options. */
  color: string | null;
  /** ISO date (YYYY-MM-DD). */
  date_of_birth: string | null;
  photos: string[] | null;
  primary_photo: string | null;
  video_path: string | null;
  description: string | null;
  ready_date: string | null;
  base_price: number | null;
  status: string | null;
  is_publicly_visible?: boolean;
  vaccinated_at: string | null;
  generation?: "F1" | "F1b" | "F2" | "F2b" | "multigen" | null;
  personality_blurb?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function listLitterPuppies(
  token: string,
  upcomingLitterId: string,
): Promise<BreederWriteResult<BreederPuppyRow[]>> {
  return callBreederWrite<BreederPuppyRow[]>(token, "listLitterPuppies", { upcomingLitterId });
}

export interface BreederPuppyWithLitter extends BreederPuppyRow {
  upcoming_litter_id: string | null;
  litter_id: string | null;
  dam_name: string | null;
  sire_name: string | null;
}

interface ListAllPuppiesRow extends BreederPuppyRow {
  upcoming_litter_id: string | null;
  litter_id: string | null;
  upcoming_litters: {
    breed: string | null;
    dam: { name: string | null } | null;
    sire: { name: string | null } | null;
  } | null;
}

/**
 * Roster across every litter — including older "previous" upcoming_litters
 * that may have rotated off the breeder Home view. Calls the
 * listAllPuppies op on breeder-write (v12+); the edge function joins the
 * dam/sire names so the puppies hub can show parent context per row.
 */
export async function listAllBreederPuppies(
  token: string,
): Promise<BreederWriteResult<BreederPuppyWithLitter[]>> {
  const res = await callBreederWrite<ListAllPuppiesRow[]>(token, "listAllPuppies");
  if (!res.ok) return res;
  const flattened: BreederPuppyWithLitter[] = res.data.map((row) => ({
    id: row.id,
    name: row.name,
    gender: row.gender,
    breed: row.breed,
    color: row.color ?? null,
    date_of_birth: row.date_of_birth ?? null,
    photos: row.photos,
    primary_photo: row.primary_photo,
    video_path: row.video_path,
    description: row.description,
    ready_date: row.ready_date,
    base_price: row.base_price,
    status: row.status,
    is_publicly_visible: row.is_publicly_visible,
    vaccinated_at: row.vaccinated_at,
    generation: row.generation,
    personality_blurb: row.personality_blurb,
    created_at: row.created_at,
    updated_at: row.updated_at,
    upcoming_litter_id: row.upcoming_litter_id,
    litter_id: row.litter_id,
    dam_name: row.upcoming_litters?.dam?.name ?? null,
    sire_name: row.upcoming_litters?.sire?.name ?? null,
  }));
  return { ok: true, data: flattened };
}

export function createPuppy(
  token: string,
  payload: { upcomingLitterId: string; name: string; gender: "Male" | "Female" },
): Promise<BreederWriteResult<{ id: string; name: string; gender: string; breed: string; ready_date: string | null }>> {
  return callBreederWrite(token, "createPuppy", payload);
}

export function deletePuppy(
  token: string,
  puppyId: string,
): Promise<BreederWriteResult<{ id: string }>> {
  return callBreederWrite(token, "deletePuppy", { puppyId });
}

export function updatePuppy(
  token: string,
  puppyId: string,
  fields: Partial<{
    name: string;
    gender: "Male" | "Female";
    color: string | null;
    date_of_birth: string | null;
    photos: string[];
    primary_photo: string;
    video_path: string | null;
    description: string;
    ready_date: string;
    base_price: number | null;
    status: string;
    is_publicly_visible: boolean;
    vaccinated_at: string | null;
    generation: "F1" | "F1b" | "F2" | "F2b" | "multigen" | null;
    personality_blurb: string | null;
  }>,
): Promise<BreederWriteResult<BreederPuppyRow>> {
  return callBreederWrite<BreederPuppyRow>(token, "updatePuppy", { puppyId, fields });
}

// The legacy `replacePuppyPhoto` wrapper was removed here: it wrote
// puppies.photos directly, which puppy_media now owns. Its only consumer was
// EditablePuppyPhoto, superseded by MediaTile. The breeder-write op itself is
// left deployed and untouched so any stale client bundle keeps working — the
// arrays->media trigger reconciles whatever it writes.

// ---------------------------------------------------------------------------
// puppy_media
//
// One row per photo/video. This is the source of truth; puppies.photos /
// primary_photo / video_path are a projection of the `is_public` rows,
// maintained by a DB trigger. That's why every mutating op below hands back
// BOTH the media list and the refreshed puppy row — writing media rewrites the
// puppy's arrays, and the caller usually holds both in its query cache.
// ---------------------------------------------------------------------------

export type PuppyMediaKind = "face" | "back" | "top" | "paw" | "candid" | "video";

export interface PuppyMediaRow {
  id: string;
  puppy_id: string;
  media_type: "photo" | "video";
  kind: PuppyMediaKind;
  url: string;
  storage_bucket: string | null;
  storage_path: string | null;
  /** false = staging (breeder portal only); true = live on the public site. */
  is_public: boolean;
  is_primary: boolean;
  sort_order: number;
  /** Set on AI-edited variants; points at the untouched original. */
  derived_from_media_id: string | null;
  edit_ops: unknown | null;
  width: number | null;
  height: number | null;
  captured_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Shape returned by every mutating media op. */
export interface PuppyMediaMutation {
  media: PuppyMediaRow | PuppyMediaRow[];
  puppy: BreederPuppyRow | null;
}

export function listPuppyMedia(
  token: string,
  puppyId: string,
): Promise<BreederWriteResult<{ media: PuppyMediaRow[] }>> {
  return callBreederMedia(token, "listPuppyMedia", { puppyId });
}

/** Change a photo's label, staging state, or position. To move the primary use
 *  setPuppyMediaPrimary — this op rejects `is_primary` so the partial unique
 *  index is never raced. Hiding the current primary demotes it automatically. */
export function updatePuppyMedia(
  token: string,
  mediaId: string,
  patch: Partial<{ kind: PuppyMediaKind; is_public: boolean; sort_order: number }>,
): Promise<BreederWriteResult<{ media: PuppyMediaRow; puppy: BreederPuppyRow | null }>> {
  return callBreederMedia(token, "updatePuppyMedia", { mediaId, patch });
}

/** Promote one photo to the puppy's main image. Publishes it as a side effect —
 *  the primary has to be visible for the public site to use it. */
export function setPuppyMediaPrimary(
  token: string,
  mediaId: string,
): Promise<BreederWriteResult<{ media: PuppyMediaRow[]; puppy: BreederPuppyRow | null }>> {
  return callBreederMedia(token, "setPuppyMediaPrimary", { mediaId });
}

/** Rewrite sort_order to match `orderedIds` exactly. Pass the full list. */
export function reorderPuppyMedia(
  token: string,
  puppyId: string,
  orderedIds: string[],
): Promise<BreederWriteResult<{ media: PuppyMediaRow[]; puppy: BreederPuppyRow | null }>> {
  return callBreederMedia(token, "reorderPuppyMedia", { puppyId, orderedIds });
}

/** Bulk publish/unpublish — the "publish these 3 staged photos" action. */
export function setPuppyMediaVisibility(
  token: string,
  args: { puppyId: string; mediaIds: string[]; isPublic: boolean },
): Promise<BreederWriteResult<{ media: PuppyMediaRow[]; puppy: BreederPuppyRow | null }>> {
  return callBreederMedia(token, "setPuppyMediaVisibility", args);
}

/** Point an existing media row at a freshly-uploaded file, keeping its kind,
 *  order, and flags. Retires the old storage object. */
export function replacePuppyMedia(
  token: string,
  mediaId: string,
  newUrl: string,
): Promise<BreederWriteResult<{ media: PuppyMediaRow; puppy: BreederPuppyRow | null }>> {
  return callBreederMedia(token, "replacePuppyMedia", { mediaId, newUrl });
}

export function deletePuppyMedia(
  token: string,
  mediaId: string,
): Promise<
  BreederWriteResult<{ id: string; media: PuppyMediaRow[]; puppy: BreederPuppyRow | null }>
> {
  return callBreederMedia(token, "deletePuppyMedia", { mediaId });
}

export interface UploadVideoResult {
  path: string;
  publicUrl: string;
  /** Present only when `record` was requested. */
  media?: PuppyMediaRow;
}

export async function uploadBreederVideo(args: {
  token: string;
  file: File;
  subjectId: string;
  /** Also create the puppy_media row server-side. See uploadBreederPhoto. */
  record?: boolean;
  isPublic?: boolean;
}): Promise<
  | { ok: true; data: UploadVideoResult }
  | { ok: false; error: string; status?: number }
> {
  const form = new FormData();
  form.append("file", args.file);
  form.append("subjectId", args.subjectId);
  if (args.record) {
    form.append("record", "1");
    form.append("isPublic", args.isPublic ? "true" : "false");
  }

  const url = `${appEnv.supabaseUrl}/functions/v1/breeder-upload-video`;
  const anonKey = appEnv.supabaseAnonKey ?? "";

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { apikey: anonKey, "x-breeder-token": args.token },
      body: form,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }

  let body: {
    ok: boolean;
    path?: string;
    publicUrl?: string;
    media?: PuppyMediaRow;
    error?: string;
  };
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: `Upload failed (HTTP ${res.status})`, status: res.status };
  }
  if (!res.ok || !body.ok || !body.path || !body.publicUrl) {
    return {
      ok: false,
      error: body.error ?? `Upload failed (HTTP ${res.status})`,
      status: res.status,
    };
  }
  return {
    ok: true,
    data: { path: body.path, publicUrl: body.publicUrl, media: body.media },
  };
}

export interface BreederParentRow {
  id: string;
  name: string;
  role: "Sire" | "Dam";
  breed: string;
  composition: string;
  color: string;
  photo_path: string | null;
  photos: string[];
}

export function listBreederParents(
  token: string,
): Promise<BreederWriteResult<BreederParentRow[]>> {
  return callBreederWrite<BreederParentRow[]>(token, "listParents");
}

export function createBreederParent(
  token: string,
  payload: {
    name: string;
    role: "Sire" | "Dam";
    breed: string;
    composition: string;
    color: string;
    photos?: string[];
    photo_path?: string | null;
  },
): Promise<BreederWriteResult<BreederParentRow>> {
  return callBreederWrite<BreederParentRow>(token, "createParent", payload);
}

export function updateBreederParent(
  token: string,
  dogId: string,
  fields: Partial<{
    name: string;
    role: "Sire" | "Dam";
    breed: string;
    composition: string;
    color: string;
    photos: string[];
    photo_path: string | null;
  }>,
): Promise<BreederWriteResult<BreederParentRow>> {
  return callBreederWrite<BreederParentRow>(token, "updateParent", { dogId, fields });
}

export interface CreateUpcomingLitterPayload {
  displayBreed: string;
  damId: string | null;
  sireId: string | null;
  breedingDate?: string | null;
  expectedWhelpingDate?: string | null;
  priceLabel?: string | null;
  dueLabel?: string | null;
  minExpectedPuppies?: number | null;
  maxExpectedPuppies?: number | null;
  isActive?: boolean;
}

export interface CreateUpcomingLitterResult {
  id: string;
  display_breed: string;
  dam_name: string | null;
  sire_name: string | null;
  expected_whelping_date: string | null;
  lifecycle_status: string;
}

export function createUpcomingLitter(
  token: string,
  payload: CreateUpcomingLitterPayload,
): Promise<BreederWriteResult<CreateUpcomingLitterResult>> {
  return callBreederWrite<CreateUpcomingLitterResult>(token, "createUpcomingLitter", payload);
}

export interface UploadPhotoResult {
  path: string;
  publicUrl: string;
  /** Present only when `record` was requested. */
  media?: PuppyMediaRow;
}

export async function uploadBreederPhoto(args: {
  token: string;
  file: File;
  kind: "puppy" | "parent";
  subjectId: string;
  /**
   * Also create the puppy_media row server-side, in the same request. Prefer
   * this over uploading and then patching separately: it can't half-fail into
   * a file with no row pointing at it. Puppy subjects only.
   */
  record?: boolean;
  mediaKind?: Exclude<PuppyMediaKind, "video">;
  /** Defaults to false — new photos land in staging, not on the public site. */
  isPublic?: boolean;
  /** Set when saving an AI-edited variant, to preserve lineage. */
  derivedFrom?: string;
  editOps?: unknown;
}): Promise<
  | { ok: true; data: UploadPhotoResult }
  | { ok: false; error: string; status?: number }
> {
  const form = new FormData();
  form.append("file", args.file);
  form.append("kind", args.kind);
  form.append("subjectId", args.subjectId);
  if (args.record) {
    form.append("record", "1");
    form.append("mediaKind", args.mediaKind ?? "candid");
    form.append("isPublic", args.isPublic ? "true" : "false");
    if (args.derivedFrom) form.append("derivedFrom", args.derivedFrom);
    if (args.editOps !== undefined) form.append("editOps", JSON.stringify(args.editOps));
  }

  // supabase.functions.invoke wraps the body to JSON by default and can't
  // be coerced to multipart cleanly. Build the request manually so the
  // `Content-Type: multipart/form-data; boundary=...` boundary is set by
  // the browser's FormData serializer.
  const url = `${appEnv.supabaseUrl}/functions/v1/breeder-upload-photo`;
  const anonKey = appEnv.supabaseAnonKey ?? "";

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "x-breeder-token": args.token,
      },
      body: form,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }

  let body: {
    ok: boolean;
    path?: string;
    publicUrl?: string;
    media?: PuppyMediaRow;
    error?: string;
  };
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      error: `Upload failed (HTTP ${res.status})`,
      status: res.status,
    };
  }

  if (!res.ok || !body.ok || !body.path || !body.publicUrl) {
    return {
      ok: false,
      error: body.error ?? `Upload failed (HTTP ${res.status})`,
      status: res.status,
    };
  }
  return {
    ok: true,
    data: { path: body.path, publicUrl: body.publicUrl, media: body.media },
  };
}

export async function setBreederPasscode(
  pin: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke<
    { ok: true } | { ok: false; error: string }
  >("breeder-set-passcode", {
    body: { pin },
  });

  if (error) {
    const ctx = (error as unknown as { context?: { response?: Response } }).context;
    if (ctx?.response) {
      try {
        const body = (await ctx.response.json()) as { error?: string };
        return { ok: false, error: body.error ?? error.message };
      } catch {
        /* fall through */
      }
    }
    return { ok: false, error: error.message };
  }
  if (!data || !data.ok) {
    return {
      ok: false,
      error: (data as { error?: string } | null)?.error ?? "Unknown error",
    };
  }
  return data;
}
