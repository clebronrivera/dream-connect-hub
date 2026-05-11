// Supabase Edge Function: breeder-write
//
// Breeder Tool — PR 1 stub. Real implementation lands across PRs 6–9.
//
// Gated by `x-breeder-token` header (validated by verifyBreederToken).
// Single switchboard for all breeder mutations. Accepts POST { op, payload }
// and dispatches:
//
//   - loadHome                  → SELECT * FROM breeder_litter_summary
//   - confirmLitterBorn         → insert litters row, flip upcoming_litters
//                                 to 'post_birth'
//   - updateLitterDates         → patch litters; DB trigger fans ready_date
//                                 out to all linked puppies
//   - createPuppy / updatePuppy → write puppies (whitelisted fields only)
//   - createParent / updateParent → write breeding_dogs
//
// Every payload is validated with a zod schema imported from esm.sh in
// the matching client lib.

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
