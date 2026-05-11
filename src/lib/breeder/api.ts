// Thin client-side wrappers around the breeder edge functions.

import { supabase } from "@/lib/supabase";
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
