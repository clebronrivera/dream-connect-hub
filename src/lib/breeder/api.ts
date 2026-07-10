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
  const { data, error } = await supabase.functions.invoke<
    { ok: true; data: T } | { ok: false; error: string }
  >("breeder-write", {
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

/**
 * Atomically swap one photo on a puppy. The breeder-write `replacePuppyPhoto`
 * op updates the photos array + primary_photo and retires the old storage
 * object (unless it's still referenced elsewhere). Pass `oldUrl: null` to add
 * a new photo without replacing one.
 */
export function replacePuppyPhoto(
  token: string,
  args: { puppyId: string; oldUrl: string | null; newUrl: string },
): Promise<BreederWriteResult<BreederPuppyRow>> {
  return callBreederWrite<BreederPuppyRow>(token, "replacePuppyPhoto", args);
}

export interface UploadVideoResult {
  path: string;
  publicUrl: string;
}

export async function uploadBreederVideo(args: {
  token: string;
  file: File;
  subjectId: string;
}): Promise<
  | { ok: true; data: UploadVideoResult }
  | { ok: false; error: string; status?: number }
> {
  const form = new FormData();
  form.append("file", args.file);
  form.append("subjectId", args.subjectId);

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

  let body: { ok: boolean; path?: string; publicUrl?: string; error?: string };
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
  return { ok: true, data: { path: body.path, publicUrl: body.publicUrl } };
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
}

export async function uploadBreederPhoto(args: {
  token: string;
  file: File;
  kind: "puppy" | "parent";
  subjectId: string;
}): Promise<
  | { ok: true; data: UploadPhotoResult }
  | { ok: false; error: string; status?: number }
> {
  const form = new FormData();
  form.append("file", args.file);
  form.append("kind", args.kind);
  form.append("subjectId", args.subjectId);

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

  let body: { ok: boolean; path?: string; publicUrl?: string; error?: string };
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
  return { ok: true, data: { path: body.path, publicUrl: body.publicUrl } };
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
