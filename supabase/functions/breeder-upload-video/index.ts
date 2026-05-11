// Supabase Edge Function: breeder-upload-video
//
// Breeder Tool — PR 1 stub. Real implementation lands in PR 7.
//
// Gated by `x-breeder-token` header (validated by verifyBreederToken).
// Accepts multipart POST: file, subjectId. Validates MIME and size
// (20MB hard cap), writes the file to the private `puppy-videos` bucket
// via service role, and returns { path }. Read access is via Supabase
// signed URLs minted at view time.

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
