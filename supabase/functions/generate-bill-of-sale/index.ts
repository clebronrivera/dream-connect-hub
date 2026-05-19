// supabase/functions/generate-bill-of-sale/index.ts — PR 6
//
// Admin-authenticated edge function that generates a one-page Bill of Sale PDF
// for a completed pickup handover.
//
// Auth: Admin JWT required (Bearer token in Authorization header).
// Method: POST
// Body:   { agreement_id: string }
// Returns: { ok: true, pdf_path: string } | { ok: false, error: string }
//
// Idempotent: returns the existing path if already generated.
// Storage: agreements/{agreement_id}/bill-of-sale.pdf

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdmin } from "../_shared/auth/verifyAdmin.ts";
import { generateBillOfSale } from "../_shared/pdf/generateBillOfSalePdf.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);

  function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const auth = await verifyAdmin(req, supabase);
  if (!auth.ok) return json(auth.status, auth.body);

  let body: { agreement_id?: string };
  try { body = await req.json(); }
  catch { return json(400, { error: "Invalid JSON" }); }
  if (!body.agreement_id) return json(400, { error: "agreement_id is required" });

  const result = await generateBillOfSale(supabase, body.agreement_id);

  if (!result.ok) return json(result.status, result.body);
  return json(200, { ok: true, pdf_path: result.pdf_path, already_generated: result.already_generated });
});
