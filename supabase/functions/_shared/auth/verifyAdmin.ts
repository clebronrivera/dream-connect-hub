// supabase/functions/_shared/auth/verifyAdmin.ts — Wave F3
//
// Shared admin-auth helper. Validates the Bearer JWT from the Authorization
// header and confirms the caller's profile row has role = 'admin'.
//
// Consumed by:
//   - finalize-agreement (refactored Wave F3)
//   - generate-agreement-pdf (Wave F4)
//   - finalize-pickup-handover (Wave H4)
//   - generate-dispute-evidence-packet (Wave H8)
//
// Usage:
//   const supabase = createClient(URL, SERVICE_ROLE_KEY);
//   const auth = await verifyAdmin(req, supabase);
//   if (!auth.ok) return new Response(JSON.stringify(auth.body), { status: auth.status, ... });
//   // auth.userId is the authenticated admin's user_id

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type VerifyAdminResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; body: { error: string; details?: string } };

export async function verifyAdmin(
  req: Request,
  supabase: SupabaseClient
): Promise<VerifyAdminResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, status: 401, body: { error: "Missing authorization" } };
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return { ok: false, status: 401, body: { error: "Empty bearer token" } };
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return {
      ok: false,
      status: 401,
      body: {
        error: "Invalid session",
        details: userErr?.message ?? "no user resolved from JWT",
      },
    };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (profileErr || profile?.role !== "admin") {
    return { ok: false, status: 403, body: { error: "Admin access required" } };
  }

  return { ok: true, userId: userData.user.id };
}
