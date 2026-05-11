// supabase/functions/_shared/auth/verifyBreederToken.ts
//
// Service-role-side validator for the breeder session token. Used by:
//   - breeder-upload-photo
//   - breeder-upload-video
//   - breeder-write
//
// Pattern: functions are deployed with verify_jwt=false. They accept the
// session token in the `x-breeder-token` request header, look up the row
// with the service-role client, check it has not been revoked or expired,
// and touch last_used_at as a fire-and-forget update.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type VerifyBreederTokenResult =
  | { ok: true; sessionId: string }
  | { ok: false; status: number; body: { error: string; details?: string } };

export async function verifyBreederToken(
  supabase: SupabaseClient,
  token: string | null | undefined
): Promise<VerifyBreederTokenResult> {
  if (!token) {
    return { ok: false, status: 401, body: { error: "Missing breeder session token" } };
  }

  const { data, error } = await supabase
    .from("breeder_sessions")
    .select("id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      body: { error: "Failed to look up breeder session", details: error.message },
    };
  }
  if (!data) {
    return { ok: false, status: 403, body: { error: "Invalid breeder session" } };
  }
  if (data.revoked_at) {
    return { ok: false, status: 403, body: { error: "Breeder session revoked" } };
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 403, body: { error: "Breeder session expired" } };
  }

  void supabase
    .from("breeder_sessions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined, () => undefined);

  return { ok: true, sessionId: data.id };
}

export function extractBreederToken(req: Request): string | null {
  return req.headers.get("x-breeder-token") ?? req.headers.get("X-Breeder-Token");
}
