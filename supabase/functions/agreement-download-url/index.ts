// supabase/functions/agreement-download-url/index.ts — Wave F6
//
// Public (no JWT) edge function that mints a 1-hour signed download URL
// for a finalized deposit agreement PDF. Access is gated by buyer_access_token.
//
// Method: POST
// Body: { agreement_id: string; buyer_access_token: string }
// Returns: { download_url: string; expires_in_seconds: number }
//
// Each call mints a fresh URL — the signed URL is never cached or stored.
// The buyer's access token link is valid for 30 days; each download click
// opens a 1-hour window.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyBuyerToken } from "../_shared/auth/verifyBuyerToken.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { agreement_id?: string; buyer_access_token?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify buyer token
  const tokenResult = await verifyBuyerToken(
    supabase,
    body.agreement_id,
    body.buyer_access_token
  );

  if (!tokenResult.ok) {
    return new Response(JSON.stringify(tokenResult.body), {
      status: tokenResult.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const agreement = tokenResult.agreement;

  // Confirm PDF has been generated
  if (!agreement.signed_pdf_storage_path) {
    return new Response(
      JSON.stringify({
        error: "Agreement PDF is not yet available",
        details:
          "The agreement has not been finalized. Contact Dream Puppies if you believe this is an error.",
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Mint a fresh 1-hour signed URL
  const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
    .from("agreements")
    .createSignedUrl(agreement.signed_pdf_storage_path, SIGNED_URL_TTL_SECONDS);

  if (signedUrlErr || !signedUrlData?.signedUrl) {
    return new Response(
      JSON.stringify({
        error: "Failed to generate download URL",
        details: signedUrlErr?.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      download_url: signedUrlData.signedUrl,
      expires_in_seconds: SIGNED_URL_TTL_SECONDS,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
