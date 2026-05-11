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
  payload: { litterId: string; dateOfBirth?: string; readyDate?: string },
): Promise<BreederWriteResult<{ litterId: string }>> {
  return callBreederWrite(token, "updateLitterDates", payload);
}

export interface BreederPuppyRow {
  id: string;
  name: string;
  gender: "Male" | "Female";
  breed: string;
  photos: string[] | null;
  primary_photo: string | null;
  description: string | null;
  ready_date: string | null;
  status: string | null;
  is_publicly_visible?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function listLitterPuppies(
  token: string,
  upcomingLitterId: string,
): Promise<BreederWriteResult<BreederPuppyRow[]>> {
  return callBreederWrite<BreederPuppyRow[]>(token, "listLitterPuppies", { upcomingLitterId });
}

export function createPuppy(
  token: string,
  payload: { upcomingLitterId: string; name: string; gender: "Male" | "Female" },
): Promise<BreederWriteResult<{ id: string; name: string; gender: string; breed: string; ready_date: string | null }>> {
  return callBreederWrite(token, "createPuppy", payload);
}

export function updatePuppy(
  token: string,
  puppyId: string,
  fields: Partial<{
    name: string;
    gender: "Male" | "Female";
    photos: string[];
    primary_photo: string;
    description: string;
    ready_date: string;
    status: string;
    is_publicly_visible: boolean;
  }>,
): Promise<BreederWriteResult<BreederPuppyRow>> {
  return callBreederWrite<BreederPuppyRow>(token, "updatePuppy", { puppyId, fields });
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
