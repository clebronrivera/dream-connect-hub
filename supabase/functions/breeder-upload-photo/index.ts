// Supabase Edge Function: breeder-upload-photo
//
// Breeder Tool — PR 1 stub. Real implementation lands in PR 5.
//
// Gated by `x-breeder-token` header (validated by verifyBreederToken).
// Accepts multipart POST: file, kind ('puppy'|'parent'), subjectId.
// Writes the compressed image to the public `puppy-photos` bucket via
// service role at path breeder/{kind}/{subjectId}/{uuid}.jpg and returns
// { path, publicUrl }. The client patches the subject row through
// breeder-write.

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
