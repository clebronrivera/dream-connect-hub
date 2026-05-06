// Supabase Edge Function: submit-payment-attestation
//
// Wave H phase 1b. Buyer-invoked from the payment dashboard's H1 (sign
// attestation) and H2 (upload confirmation) forms. Public function
// (verify_jwt=false at gateway); auth is via the (agreement_id,
// buyer_access_token) pair in the request body, validated by
// verifyBuyerToken.
//
// Two steps in one function (single network endpoint, predictable
// surface):
//   step='h1_sign'    — buyer signs the attestation, uploads screenshot
//                       of their payment-app handle. UPSERTs the
//                       payment_attestations row with attestation_status
//                       = 'signed'. Captures IP / user-agent / geolocation.
//   step='h2_confirm' — buyer uploads confirmation screenshot, types
//                       transaction_reference_id, confirms the memo
//                       string they used. UPDATEs the existing row.
//                       Requires attestation_status='signed' first.
//
// Storage: writes to the payment-evidence bucket as
// `<agreement_id>/<kind>-<ts>.<ext>` using the service role.
// payment-evidence is private; admin reads directly via RLS, buyer reads
// via signed URL minted by a future edge function (Wave F6 reuses the
// pattern).

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyBuyerToken } from "../_shared/auth/verifyBuyerToken.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "payment-evidence";

interface Geolocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface BodyH1 {
  step: "h1_sign";
  agreement_id: string;
  buyer_access_token: string;
  payment_method_handle_to_use: string;
  buyer_payment_handle: string;
  buyer_phone_at_payment?: string;
  payment_attestation_text: string;
  payment_attestation_geolocation?: Geolocation | null;
  handle_screenshot_base64: string;
  handle_screenshot_mime?: string;
}

interface BodyH2 {
  step: "h2_confirm";
  agreement_id: string;
  buyer_access_token: string;
  transaction_reference_id: string;
  payment_memo_used?: string;
  confirmation_screenshot_base64: string;
  confirmation_screenshot_mime?: string;
}

type Body = BodyH1 | BodyH2;

function base64ToBytes(b64: string): Uint8Array {
  // Accept both "data:image/png;base64,xxx" and the bare base64 string.
  const cleaned = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function extFromMime(mime: string | undefined): string {
  const m = (mime ?? "image/png").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  if (m.includes("heic")) return "heic";
  return "bin";
}

interface UploadResult {
  ok: true;
  path: string;
}
interface UploadError {
  ok: false;
  status: number;
  body: { error: string; details?: string };
}

async function uploadScreenshot(
  admin: SupabaseClient,
  agreementId: string,
  kind: "handle" | "confirmation",
  base64: string,
  mime: string | undefined,
): Promise<UploadResult | UploadError> {
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(base64);
  } catch (e) {
    return {
      ok: false,
      status: 400,
      body: {
        error: `Invalid ${kind} screenshot data`,
        details: (e as Error).message,
      },
    };
  }
  const ext = extFromMime(mime);
  const path = `${agreementId}/${kind}-${Date.now()}.${ext}`;
  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(
    path,
    bytes,
    {
      contentType: mime ?? "image/png",
      upsert: true,
    },
  );
  if (uploadErr) {
    return {
      ok: false,
      status: 500,
      body: {
        error: `${kind} screenshot upload failed`,
        details: uploadErr.message,
      },
    };
  }
  return { ok: true, path };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);

  function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST")
    return jsonResponse(405, { error: "Method not allowed" });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  if (!body.agreement_id || !body.buyer_access_token) {
    return jsonResponse(400, {
      error: "Missing agreement_id or buyer_access_token",
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Verify the buyer token (also fetches the parent agreement row).
  const verification = await verifyBuyerToken(
    admin,
    body.agreement_id,
    body.buyer_access_token,
  );
  if (!verification.ok) return jsonResponse(verification.status, verification.body);

  // 2. Capture audit-trail metadata from request headers.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  // ── H1: sign the attestation ──────────────────────────────────────
  if (body.step === "h1_sign") {
    if (
      !body.payment_method_handle_to_use ||
      !body.buyer_payment_handle ||
      !body.payment_attestation_text ||
      !body.handle_screenshot_base64
    ) {
      return jsonResponse(400, {
        error:
          "Missing required H1 fields (payment_method_handle_to_use, buyer_payment_handle, payment_attestation_text, handle_screenshot_base64)",
      });
    }

    const upload = await uploadScreenshot(
      admin,
      body.agreement_id,
      "handle",
      body.handle_screenshot_base64,
      body.handle_screenshot_mime,
    );
    if (!upload.ok) return jsonResponse(upload.status, upload.body);
    const screenshotPath = upload.path;

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("payment_attestations")
      .upsert(
        {
          agreement_id: body.agreement_id,
          attestation_status: "signed",
          payment_method_handle_to_use: body.payment_method_handle_to_use,
          buyer_payment_handle: body.buyer_payment_handle,
          buyer_phone_at_payment: body.buyer_phone_at_payment ?? null,
          buyer_payment_handle_screenshot_path: screenshotPath,
          payment_attestation_text: body.payment_attestation_text,
          payment_attestation_signed_at: now,
          payment_attestation_ip: ip,
          payment_attestation_user_agent: ua,
          payment_attestation_geolocation:
            body.payment_attestation_geolocation ?? null,
        },
        { onConflict: "agreement_id" },
      )
      .select("id")
      .single();

    if (error) {
      return jsonResponse(500, {
        error: "Failed to save attestation",
        details: error.message,
      });
    }

    return jsonResponse(200, {
      ok: true,
      attestation_id: data.id,
      status: "signed",
      screenshot_path: screenshotPath,
    });
  }

  // ── H2: post-payment confirmation ─────────────────────────────────
  if (body.step === "h2_confirm") {
    const { data: existing, error: lookupErr } = await admin
      .from("payment_attestations")
      .select("id, attestation_status")
      .eq("agreement_id", body.agreement_id)
      .maybeSingle();
    if (lookupErr) {
      return jsonResponse(500, {
        error: "Lookup failed",
        details: lookupErr.message,
      });
    }
    if (!existing || existing.attestation_status !== "signed") {
      return jsonResponse(409, {
        error: "H1 attestation must be signed before H2 confirmation",
      });
    }

    if (!body.transaction_reference_id || !body.confirmation_screenshot_base64) {
      return jsonResponse(400, {
        error:
          "Missing required H2 fields (transaction_reference_id, confirmation_screenshot_base64)",
      });
    }

    const upload = await uploadScreenshot(
      admin,
      body.agreement_id,
      "confirmation",
      body.confirmation_screenshot_base64,
      body.confirmation_screenshot_mime,
    );
    if (!upload.ok) return jsonResponse(upload.status, upload.body);
    const confirmationPath = upload.path;

    const { error: updateErr } = await admin
      .from("payment_attestations")
      .update({
        confirmation_screenshot_path: confirmationPath,
        transaction_reference_id: body.transaction_reference_id,
        payment_memo_used: body.payment_memo_used ?? null,
        confirmation_captured_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateErr) {
      return jsonResponse(500, {
        error: "Failed to update attestation",
        details: updateErr.message,
      });
    }

    return jsonResponse(200, {
      ok: true,
      attestation_id: existing.id,
      status: "signed",
      screenshot_path: confirmationPath,
    });
  }

  return jsonResponse(400, { error: "Unknown step" });
});
