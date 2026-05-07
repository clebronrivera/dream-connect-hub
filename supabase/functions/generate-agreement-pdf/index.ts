// supabase/functions/generate-agreement-pdf/index.ts — Wave F4
//
// Admin-authenticated edge function that generates, uploads, and records
// the flattened deposit agreement PDF for a given agreement.
//
// Auth: Admin JWT required (Bearer token in Authorization header).
// Method: POST
// Body: { agreement_id: string }
// Returns: { ok: true, pdf_path: string, agreement_number: string, download_url: string }
//
// Preconditions enforced by generateDepositPdf():
//   - agreement_status = 'admin_approved'
//   - deposit_status   = 'admin_confirmed'
//
// Idempotent: if signed_pdf_storage_path is already set, returns the existing
// path without regenerating.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdmin } from "../_shared/auth/verifyAdmin.ts";
import { generateDepositPdf } from "../_shared/pdf/generateDepositPdf.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_SITE_URL =
  Deno.env.get("PUBLIC_SITE_URL") ?? "https://puppyheavenllc.com";

/**
 * Extracted handler — accepts an optional pre-built Supabase client and an
 * optional generatePdf override so tests can inject mocks.
 */
export async function handler(
  req: Request,
  supabaseOverride?: ReturnType<typeof createClient>,
  generatePdfOverride?: typeof generateDepositPdf
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = supabaseOverride ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const generatePdf = generatePdfOverride ?? generateDepositPdf;

  // Auth
  const auth = await verifyAdmin(req, supabase);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: { agreement_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.agreement_id) {
    return new Response(JSON.stringify({ error: "agreement_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Generate (uses injected override in tests, real implementation in production)
  const result = await generatePdf(supabase, body.agreement_id);

  if (!result.ok) {
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build buyer download URL (Wave F6 route handles this path)
  const downloadUrl = `${PUBLIC_SITE_URL}/agreements/${body.agreement_id}/${result.buyer_access_token}/download`;

  return new Response(
    JSON.stringify({
      ok: true,
      pdf_path: result.pdf_path,
      agreement_number: result.agreement_number,
      download_url: downloadUrl,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

Deno.serve(handler);
