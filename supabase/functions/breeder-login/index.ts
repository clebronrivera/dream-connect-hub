// Supabase Edge Function: breeder-login
//
// Breeder Tool — PR 1 stub. Real implementation lands in PR 2.
//
// Public function (verify_jwt=false). Accepts POST { pin } and, on success,
// returns { token, expiresAt } for the client to persist in localStorage.
// Rate-limited by IP via breeder_login_attempts (5 fails / 15 min).
//
// Until PR 2 ships, this returns a 501 stub so deploy + CORS preflight work
// end-to-end while the client scaffolding is built.

import { corsHeaders } from "../_shared/cors.ts";

Deno.serve((req: Request): Response => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  return new Response(
    JSON.stringify({ ok: false, error: "not implemented" }),
    {
      status: 501,
      headers: { "Content-Type": "application/json", ...cors },
    },
  );
});
