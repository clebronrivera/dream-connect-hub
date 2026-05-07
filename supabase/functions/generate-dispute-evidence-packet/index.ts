// supabase/functions/generate-dispute-evidence-packet/index.ts
// Wave H phase 3 (H8) v2.
// Builds a dispute-evidence ZIP and uploads it to the dispute-evidence bucket.
// Returns zip_path + generated_at only — caller mints signed URLs on demand
// via getDisputePacketUrl (client-side service helper).
//
// ZIP structure:
//   README.txt            cover sheet: header, completeness checklist, upload instructions
//   manifest.json         embedded vs. omitted files + content-types + reasons
//   audit_trail.json      single merged self-contained record (no DB connection needed)
//   payment_evidence/     H1 handle screenshot + H2 confirmation screenshot (bytes)
//   pickup_evidence/      buyer-with-puppy, buyer-with-ID, location, buyer signature
//
// Security:
//   buyer_access_token        NEVER written to any file in the ZIP (bearer-token semantics)
//   buyer_access_token_expires_at  expiry date only — included as metadata
//   Photos                    downloaded server-side as bytes; no signed URLs in ZIP
//   File extensions           derived from blob content-type, not from the storage path
//
// Bucket: dispute-evidence (migration 20260506000012).
// verify_jwt: true — admin session JWT required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const SUPABASE_URL           = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const jsonResp = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// ── Content-type → extension ──────────────────────────────────────────────
// Read blob.type from the actual storage download — never parse the path.
// Attorneys open these ZIPs months later; wrong extension breaks the file.
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif":  "gif",
  "image/tiff": "tiff",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

function extFromMime(mime: string, fallbackPath?: string | null): string {
  const clean = mime.toLowerCase().split(";")[0].trim();
  if (MIME_TO_EXT[clean]) return MIME_TO_EXT[clean];
  // Fallback: parse the storage path (may be wrong for HEIC stored as .jpg)
  if (fallbackPath) {
    const m = fallbackPath.match(/\.([a-z0-9]{2,5})$/i);
    if (m) return m[1].toLowerCase();
  }
  return "bin"; // explicitly unknown rather than silently wrong
}

// ── Location formatting ───────────────────────────────────────────────────
function fmtLocation(
  city:  string | null | undefined,
  state: string | null | undefined,
  zip:   string | null | undefined
): string {
  const cityState = [city, state].filter(Boolean).join(", ");
  const full      = [cityState, zip].filter(Boolean).join(" ");
  return full || "—";
}

// ── Upload instructions branched by payment method ────────────────────────
//
// ORDER MATTERS: "cash app" contains the substring "cash", so the P2P block
// (Zelle / Venmo / Cash App / Apple Pay) MUST be evaluated BEFORE the
// cash/check block. Do not reorder these if-blocks without reading both.
//
function uploadInstructions(paymentMethod: string | null | undefined): string[] {
  const m = (paymentMethod ?? "").toLowerCase().trim();

  if (m === "square" || m.includes("square")) {
    return [
      "UPLOAD INSTRUCTIONS (Square Disputes Portal)",
      "--------------------------------------------",
      "1. Log in to Square Dashboard > Payments > Disputes.",
      "2. Locate the dispute for the Square charge.",
      "3. Click 'Add evidence' and upload files from this packet.",
      "4. Key files:",
      "     audit_trail.json     — signed agreement, timestamped acks, buyer identity",
      "     payment_evidence/    — proof buyer sent from their own account",
      "     audit_trail.json §communications — documented contact attempts",
      "5. Submit before the dispute deadline shown in Square Dashboard.",
    ];
  }

  // ORDER MATTERS — this block must precede the cash/check block (see note above)
  if (
    m.includes("zelle") ||
    m.includes("venmo") ||
    m.includes("cash app") ||
    m.includes("cashapp") ||
    m.includes("apple pay") ||
    m.includes("applepay")
  ) {
    return [
      `DISPUTE INSTRUCTIONS (${paymentMethod ?? "Payment Platform"})`,
      "-".repeat(46),
      "Submit to your bank's dispute portal or the platform's dispute form.",
      "See docs/ops/payment-handle-hygiene.md for per-method guidance.",
      "",
      "Key files to include:",
      "  audit_trail.json    — proof of signed agreement + buyer identity",
      "  payment_evidence/   — screenshots proving buyer initiated the transfer",
    ];
  }

  if (m === "cash" || m === "check" || m.includes("cash") || m.includes("check")) {
    return [
      "DISPUTE INSTRUCTIONS (Cash / Check Payment)",
      "--------------------------------------------",
      "No chargeback path exists for cash or check payments.",
      "This packet supports small claims court filing if needed.",
      "",
      "Key documents:",
      "  audit_trail.json     — signed agreement + pickup timestamps",
      "  pickup_evidence/     — photos proving delivery of the puppy",
    ];
  }

  return [
    "DISPUTE INSTRUCTIONS",
    "--------------------",
    "Contact your payment platform's dispute resolution process.",
    "See docs/ops/payment-handle-hygiene.md for guidance.",
    "Include audit_trail.json and payment_evidence/ in your submission.",
  ];
}

// ── Manifest entry (discriminated union) ──────────────────────────────────
type ManifestEntry =
  | { status: "embedded";  original_path: string;       filename: string; content_type: string }
  | { status: "omitted";   original_path: string | null; reason: string };

// ─────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  // ── Admin auth ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResp({ error: "Missing authorization" }, 401);
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return jsonResp({ error: "Empty bearer token" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData?.user)
    return jsonResp({ error: "Invalid session", details: userErr?.message }, 401);

  const { data: profile } = await supabase
    .from("profiles").select("role")
    .eq("user_id", userData.user.id).single();
  if (profile?.role !== "admin")
    return jsonResp({ error: "Admin access required" }, 403);

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: { agreement_id?: string };
  try { body = await req.json(); }
  catch { return jsonResp({ error: "Invalid JSON" }, 400); }
  const { agreement_id } = body;
  if (!agreement_id) return jsonResp({ error: "agreement_id required" }, 400);

  // ── Fetch all data in parallel ──────────────────────────────────────────
  const [agreementRes, attestationRes, commsRes, handoverRes] = await Promise.all([
    supabase.from("deposit_agreements").select("*").eq("id", agreement_id).single(),
    supabase.from("payment_attestations").select("*")
      .eq("agreement_id", agreement_id).maybeSingle(),
    supabase.from("agreement_communications").select("*")
      .eq("agreement_id", agreement_id).order("occurred_at", { ascending: true }),
    supabase.from("pickup_handovers").select("*")
      .eq("agreement_id", agreement_id).maybeSingle(),
  ]);

  if (agreementRes.error || !agreementRes.data)
    return jsonResp({ error: "Agreement not found", details: agreementRes.error?.message }, 404);

  const agreement   = agreementRes.data;
  const attestation = attestationRes.data ?? null;
  const comms       = commsRes.data ?? [];
  const handover    = handoverRes.data ?? null;

  // ── Completeness flags ──────────────────────────────────────────────────
  const hasAgreementSigned = !!agreement.buyer_signed_at;
  const hasH1   = attestation?.attestation_status === "signed";
  const hasH2   = !!(attestation?.confirmation_screenshot_path &&
                     attestation?.transaction_reference_id);
  const hasH3   = !!agreement.operator_verified_sender_handle;
  const hasMismatch = !!agreement.operator_handle_mismatch_flagged;
  const hasPickup   = handover?.handover_status === "in_person_verified";
  const hasSignedPdf = !!agreement.signed_pdf_storage_path;

  // ── Build ZIP ───────────────────────────────────────────────────────────
  const zip = new JSZip();
  const now     = new Date();
  const isoDate = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const agreementNumber = agreement.agreement_number ?? agreement.id;

  const manifest: {
    payment_evidence: Record<string, ManifestEntry>;
    pickup_evidence:  Record<string, ManifestEntry>;
  } = { payment_evidence: {}, pickup_evidence: {} };

  // Download helper — reads blob.type for extension, embeds bytes, records manifest
  async function downloadAndAdd(
    bucket:        string,
    storagePath:   string | null | undefined,
    folder:        JSZip,
    baseName:      string,
    manifestGroup: Record<string, ManifestEntry>,
    key:           string,
    absentReason = "not yet uploaded"
  ): Promise<void> {
    if (!storagePath) {
      manifestGroup[key] = { status: "omitted", original_path: null, reason: absentReason };
      return;
    }
    try {
      const { data, error } = await supabase.storage.from(bucket).download(storagePath);
      if (error || !data) {
        manifestGroup[key] = {
          status: "omitted", original_path: storagePath,
          reason: error?.message ?? "download returned no data",
        };
        return;
      }
      const ext      = extFromMime(data.type, storagePath);
      const filename = `${baseName}.${ext}`;
      folder.file(filename, new Uint8Array(await data.arrayBuffer()));
      manifestGroup[key] = {
        status: "embedded", original_path: storagePath,
        filename, content_type: data.type,
      };
    } catch (e) {
      manifestGroup[key] = {
        status: "omitted", original_path: storagePath, reason: String(e),
      };
    }
  }

  const paymentFolder = zip.folder("payment_evidence")!;
  const pickupFolder  = zip.folder("pickup_evidence")!;
  const noAttestation = "no attestation record";
  const noHandover    = "pickup handover not started";

  await Promise.all([
    downloadAndAdd("payment-evidence",
      attestation?.buyer_payment_handle_screenshot_path,
      paymentFolder, "handle_screenshot",
      manifest.payment_evidence, "handle_screenshot",
      attestation ? "not yet uploaded" : noAttestation),

    downloadAndAdd("payment-evidence",
      attestation?.confirmation_screenshot_path,
      paymentFolder, "confirmation_screenshot",
      manifest.payment_evidence, "confirmation_screenshot",
      attestation ? "not yet uploaded" : noAttestation),

    downloadAndAdd("pickup-evidence",
      handover?.photo_buyer_with_puppy_path,
      pickupFolder, "buyer_with_puppy",
      manifest.pickup_evidence, "buyer_with_puppy",
      handover ? "not yet uploaded" : noHandover),

    downloadAndAdd("pickup-evidence",
      handover?.photo_buyer_with_id_path,
      pickupFolder, "buyer_with_id",
      manifest.pickup_evidence, "buyer_with_id",
      handover ? "not yet uploaded" : noHandover),

    downloadAndAdd("pickup-evidence",
      handover?.photo_pickup_location_path,
      pickupFolder, "pickup_location",
      manifest.pickup_evidence, "pickup_location",
      handover ? "not uploaded (optional)" : noHandover),
  ]);

  // Buyer signature canvas → PNG bytes (extension hardcoded: always PNG)
  if (handover?.buyer_signature_canvas) {
    try {
      const b64   = String(handover.buyer_signature_canvas)
        .replace(/^data:image\/png;base64,/, "");
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      pickupFolder.file("buyer_signature.png", bytes);
      manifest.pickup_evidence["buyer_signature"] = {
        status: "embedded", original_path: "canvas",
        filename: "buyer_signature.png", content_type: "image/png",
      };
    } catch {
      manifest.pickup_evidence["buyer_signature"] = {
        status: "omitted", original_path: "canvas", reason: "malformed canvas data",
      };
    }
  } else {
    manifest.pickup_evidence["buyer_signature"] = {
      status: "omitted", original_path: null,
      reason: handover ? "signature not yet captured" : noHandover,
    };
  }

  // ── README.txt ──────────────────────────────────────────────────────────
  function ck(v: boolean) { return v ? "✓" : "✗"; }
  function fmtTs(iso?: string | null) {
    if (!iso) return "";
    try { return " (" + new Date(iso).toUTCString() + ")"; } catch { return ""; }
  }

  zip.file("README.txt", [
    "DISPUTE EVIDENCE PACKET",
    "========================",
    `Agreement:  ${agreementNumber}`,
    `Buyer:      ${agreement.buyer_name ?? "—"}`,
    `Email:      ${agreement.buyer_email ?? "—"}`,
    `Phone:      ${agreement.buyer_phone ?? "—"}`,
    `Location:   ${fmtLocation(agreement.buyer_city, agreement.buyer_state, agreement.buyer_zip)}`,
    `Method:     ${agreement.payment_method ?? "—"}`,
    `Deposit:    $${agreement.deposit_amount ?? "—"}`,
    `Generated:  ${now.toUTCString()}`,
    "",
    "PACKET COMPLETENESS",
    "===================",
    `${ck(hasAgreementSigned)} Buyer agreement signed${fmtTs(agreement.buyer_signed_at)}`,
    `${ck(hasH1)} Payment attestation captured (H1)${
      hasH1 ? "" : " — buyer did not complete attestation step"}`,
    `${ck(hasH2)} Transfer confirmation uploaded (H2)${
      hasH2 ? "" : " — screenshot or transaction ID missing"}`,
    `${ck(hasH3)} Operator payment verification (H3)${
      hasH3
        ? hasMismatch
          ? " — ⚠ HANDLE MISMATCH FLAGGED — review before submitting"
          : " — handle matches, no mismatch"
        : " — operator did not record sender handle"}`,
    `${ck(hasPickup)} Pickup handover completed (H4)${fmtTs(handover?.pickup_date)}`,
    `${ck(hasSignedPdf)} Signed agreement PDF (Wave F)${
      hasSignedPdf ? "" : " — Wave F pending; attach PDF manually if available"}`,
    "",
    "CONTENTS",
    "--------",
    "audit_trail.json    Self-contained record — timeline, acks, attestation, comms, handover.",
    "manifest.json       Which files are embedded vs. omitted, with content-types and reasons.",
    "payment_evidence/   H1 handle screenshot + H2 confirmation screenshot (bytes, not URLs).",
    "pickup_evidence/    Buyer-with-puppy, buyer-with-ID, location photo, buyer signature.",
    "",
    ...uploadInstructions(agreement.payment_method),
    "",
    "Contact: Dream Puppies / DREAMPUPPIES 321-697-8864",
  ].join("\n"));

  // ── manifest.json ───────────────────────────────────────────────────────
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // ── audit_trail.json — single merged self-contained record ───────────────
  zip.file("audit_trail.json", JSON.stringify({
    _note: "Self-contained dispute record. No database connection required to read.",
    _generated_at:          now.toISOString(),
    _generated_by_admin_id: userData.user.id,

    agreement_id:     agreement.id,
    agreement_number: agreement.agreement_number,
    agreement_status: agreement.agreement_status,
    deposit_status:   agreement.deposit_status,

    buyer_identity: {
      name:    agreement.buyer_name,
      email:   agreement.buyer_email,
      phone:   agreement.buyer_phone,
      address: agreement.buyer_address,
      city:    agreement.buyer_city,
      state:   agreement.buyer_state,
      zip:     agreement.buyer_zip,
    },

    transaction: {
      payment_method: agreement.payment_method,
      deposit_amount: agreement.deposit_amount,
      purchase_price: agreement.purchase_price,
      puppy_name:     agreement.puppy_name,
    },

    timeline: {
      agreement_created_at:         agreement.created_at,
      buyer_signed_at:              agreement.buyer_signed_at,
      buyer_marked_payment_sent_at: agreement.buyer_marked_payment_sent_at,
      admin_signed_at:              agreement.admin_signed_at,
      admin_approved_at:            agreement.admin_approved_at,
      pickup_completed_at:          hasPickup ? handover!.updated_at : null,
    },

    acknowledgments: {
      ack_full_agreement_at:         agreement.ack_full_agreement_at,
      ack_statutory_rights_at:       agreement.ack_statutory_rights_at,
      ack_esign_valid_at:            agreement.ack_esign_valid_at,
      ack_genetic_disclaimer_at:     agreement.ack_genetic_disclaimer_at,
      ack_arbitration_at:            agreement.ack_arbitration_at,
      ack_age_accuracy_at:           agreement.ack_age_accuracy_at,
      ack_welfare_responsibility_at: agreement.ack_welfare_responsibility_at,
    },

    payment_attestation: attestation ? {
      attestation_status:                   attestation.attestation_status,
      payment_method_handle_to_use:         attestation.payment_method_handle_to_use,
      buyer_payment_handle:                 attestation.buyer_payment_handle,
      buyer_phone_at_payment:               attestation.buyer_phone_at_payment,
      payment_attestation_text:             attestation.payment_attestation_text,
      payment_attestation_signed_at:        attestation.payment_attestation_signed_at,
      payment_attestation_ip:               attestation.payment_attestation_ip,
      payment_attestation_user_agent:       attestation.payment_attestation_user_agent,
      payment_attestation_geolocation:      attestation.payment_attestation_geolocation,
      transaction_reference_id:             attestation.transaction_reference_id,
      payment_memo_used:                    attestation.payment_memo_used,
      confirmation_captured_at:             attestation.confirmation_captured_at,
      buyer_payment_handle_screenshot_path: attestation.buyer_payment_handle_screenshot_path,
      confirmation_screenshot_path:         attestation.confirmation_screenshot_path,
      created_at:                           attestation.created_at,
    } : null,

    operator_payment_verification: {
      operator_verified_sender_handle:    agreement.operator_verified_sender_handle,
      operator_verified_sender_handle_at: agreement.operator_verified_sender_handle_at,
      operator_handle_mismatch_flagged:   agreement.operator_handle_mismatch_flagged,
    },

    pickup_handover: handover ? {
      handover_status:                 handover.handover_status,
      pickup_date:                     handover.pickup_date,
      pickup_lat:                      handover.pickup_lat,
      pickup_lng:                      handover.pickup_lng,
      buyer_id_type:                   handover.buyer_id_type,
      buyer_id_last_four:              handover.buyer_id_last_four,
      buyer_id_state_or_country:       handover.buyer_id_state_or_country,
      buyer_id_expiration_verified:    handover.buyer_id_expiration_verified,
      buyer_signature_at:              handover.buyer_signature_at,
      staff_member_initials:           handover.staff_member_initials,
      staff_signature_at:              handover.staff_signature_at,
      health_acknowledgment_signed_at: handover.health_acknowledgment_signed_at,
      vet_certificate_handed_over:     handover.vet_certificate_handed_over,
      vet_certificate_acknowledged_at: handover.vet_certificate_acknowledged_at,
      photo_buyer_with_puppy_path:     handover.photo_buyer_with_puppy_path,
      photo_buyer_with_id_path:        handover.photo_buyer_with_id_path,
      photo_pickup_location_path:      handover.photo_pickup_location_path,
      created_at:                      handover.created_at,
      updated_at:                      handover.updated_at,
    } : null,

    communications: {
      total:   comms.length,
      entries: comms,
    },

    // Wave F — null until PDF generation ships
    signed_pdf_storage_path: agreement.signed_pdf_storage_path ?? null,
    // buyer_access_token intentionally omitted — bearer-token semantics
    buyer_access_token_expires_at: agreement.buyer_access_token_expires_at,
  }, null, 2));

  // ── Generate ZIP bytes ──────────────────────────────────────────────────
  let zipBytes: Uint8Array;
  try {
    zipBytes = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
  } catch (e) {
    return jsonResp({ error: "ZIP generation failed", details: String(e) }, 500);
  }

  // ── Upload (upsert — same-second re-runs overwrite) ─────────────────────
  const zipPath = `${agreement_id}/evidence-${isoDate}.zip`;
  const { error: uploadErr } = await supabase.storage
    .from("dispute-evidence")
    .upload(zipPath, new Blob([zipBytes], { type: "application/zip" }), {
      contentType: "application/zip",
      upsert: true,
    });
  if (uploadErr)
    return jsonResp({ error: "ZIP upload failed", details: uploadErr.message }, 500);

  // Caller mints signed URLs on demand via getDisputePacketUrl
  return jsonResp({ ok: true, zip_path: zipPath, generated_at: now.toISOString() });
});
