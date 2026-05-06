// supabase/functions/generate-dispute-evidence-packet/index.ts
// Wave H phase 3 (H8). Admin-only edge function.
//
// Assembles a ZIP of all available dispute evidence for a given
// agreement_id and uploads it to the private dispute-evidence bucket.
// Returns a 1-hour admin-minted signed URL for immediate download.
//
// ZIP contents:
//   README.txt                    — cover sheet with upload instructions for Square portal
//   audit_trail.json              — agreement row: timestamps, IPs, UAs, operator verification, acks
//   payment_attestation.json      — H1 signed attestation + H2 confirmation metadata
//   communications_log.json       — all agreement_communications rows
//   pickup_handover.json          — pickup_handovers row if present
//   payment_evidence/             — handle screenshot (H1) + confirmation screenshot (H2)
//   pickup_evidence/              — buyer-with-puppy, buyer-with-ID, optional location photo,
//                                   buyer_signature.png (from canvas)
//
// Signed PDFs (Wave F) are not yet generated; once Wave F ships,
// signed_pdf_storage_path in audit_trail.json will point to the file.
//
// Bucket: dispute-evidence (migration 20260506000012).
// verify_jwt: true — admin session JWT required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeExt(path: string | null | undefined, fallback = "jpg"): string {
  if (!path) return fallback;
  const m = path.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : fallback;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Admin auth ────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization" }, 401);
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Empty bearer token" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return json({ error: "Invalid session", details: userErr?.message }, 401);
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();
  if (profileErr || profile?.role !== "admin") {
    return json({ error: "Admin access required" }, 403);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { agreement_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const { agreement_id } = body;
  if (!agreement_id) return json({ error: "agreement_id required" }, 400);

  // ── Fetch all data in parallel ────────────────────────────────────────────
  const [agreementRes, attestationRes, commsRes, handoverRes] = await Promise.all([
    supabase.from("deposit_agreements").select("*").eq("id", agreement_id).single(),
    supabase.from("payment_attestations").select("*").eq("agreement_id", agreement_id).maybeSingle(),
    supabase.from("agreement_communications").select("*").eq("agreement_id", agreement_id).order("occurred_at", { ascending: true }),
    supabase.from("pickup_handovers").select("*").eq("agreement_id", agreement_id).maybeSingle(),
  ]);

  if (agreementRes.error || !agreementRes.data) {
    return json({ error: "Agreement not found", details: agreementRes.error?.message }, 404);
  }

  const agreement = agreementRes.data;
  const attestation = attestationRes.data ?? null;
  const communications = commsRes.data ?? [];
  const handover = handoverRes.data ?? null;

  // ── Build ZIP ─────────────────────────────────────────────────────────────
  const zip = new JSZip();
  const now = new Date();
  const isoDate = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const agreementNumber = agreement.agreement_number ?? agreement.id;

  // 1. README.txt — cover sheet for Square portal upload
  zip.file(
    "README.txt",
    [
      "DISPUTE EVIDENCE PACKET",
      "========================",
      `Agreement:  ${agreementNumber}`,
      `Buyer:      ${agreement.buyer_name ?? "—"}`,
      `Email:      ${agreement.buyer_email ?? "—"}`,
      `Phone:      ${agreement.buyer_phone ?? "—"}`,
      `Method:     ${agreement.payment_method ?? "—"}`,
      `Deposit:    $${agreement.deposit_amount ?? "—"}`,
      `Generated:  ${now.toUTCString()}`,
      "",
      "CONTENTS",
      "--------",
      "audit_trail.json          Full agreement record: timestamps, IPs, user-agents, operator",
      "                          verification, all acknowledgment timestamps.",
      "payment_attestation.json  Buyer's signed H1 attestation + H2 confirmation metadata.",
      "communications_log.json   Complete email/SMS/phone contact history.",
      "pickup_handover.json      Pickup-day verification record (if completed).",
      "payment_evidence/         Screenshots: buyer's handle (H1) + transfer confirmation (H2).",
      "pickup_evidence/          Photos: buyer with puppy, buyer with ID, location, signature.",
      "",
      "UPLOAD INSTRUCTIONS (Square Disputes Portal)",
      "--------------------------------------------",
      "1. Log in to Square Dashboard > Payments > Disputes.",
      `2. Locate the dispute for the ${agreement.payment_method ?? ""} charge.`,
      "3. Click 'Add evidence' and upload the files in this packet.",
      "4. Key files for chargeback rebuttal:",
      "     audit_trail.json     — proof of signed agreement + timestamped acks",
      "     payment_attestation.json + payment_evidence/  — buyer initiated the transfer",
      "     communications_log.json  — documented buyer contact history",
      "5. Submit before the dispute deadline shown in Square Dashboard.",
      "",
      "Contact: Dream Puppies / DREAMPUPPIES 321-697-8864",
    ].join("\n")
  );

  // 2. audit_trail.json — full verifiable record of the agreement lifecycle
  const auditTrail = {
    _note: "This is the canonical audit record for this deposit agreement.",
    agreement_id: agreement.id,
    agreement_number: agreement.agreement_number,
    agreement_status: agreement.agreement_status,
    deposit_status: agreement.deposit_status,
    // Buyer identity
    buyer_name: agreement.buyer_name,
    buyer_email: agreement.buyer_email,
    buyer_phone: agreement.buyer_phone,
    buyer_address: agreement.buyer_address,
    buyer_city: agreement.buyer_city,
    buyer_state: agreement.buyer_state,
    buyer_zip: agreement.buyer_zip,
    // Transaction
    payment_method: agreement.payment_method,
    deposit_amount: agreement.deposit_amount,
    purchase_price: agreement.purchase_price,
    puppy_name: agreement.puppy_name,
    // Lifecycle timestamps
    created_at: agreement.created_at,
    buyer_signed_at: agreement.buyer_signed_at,
    buyer_marked_payment_sent_at: agreement.buyer_marked_payment_sent_at,
    admin_signed_at: agreement.admin_signed_at,
    admin_approved_at: agreement.admin_approved_at,
    // Acknowledgment timestamps (buyer-checked boxes at time of signing)
    ack_full_agreement_at: agreement.ack_full_agreement_at,
    ack_statutory_rights_at: agreement.ack_statutory_rights_at,
    ack_esign_valid_at: agreement.ack_esign_valid_at,
    ack_genetic_disclaimer_at: agreement.ack_genetic_disclaimer_at,
    ack_arbitration_at: agreement.ack_arbitration_at,
    ack_age_accuracy_at: agreement.ack_age_accuracy_at,
    ack_welfare_responsibility_at: agreement.ack_welfare_responsibility_at,
    // H3 operator payment verification
    operator_verified_sender_handle: agreement.operator_verified_sender_handle,
    operator_verified_sender_handle_at: agreement.operator_verified_sender_handle_at,
    operator_handle_mismatch_flagged: agreement.operator_handle_mismatch_flagged,
    // Wave F (null until PDF generation ships)
    signed_pdf_storage_path: agreement.signed_pdf_storage_path ?? null,
    // Token expiry only — raw token intentionally omitted from evidence ZIP
    buyer_access_token_expires_at: agreement.buyer_access_token_expires_at,
    // Packet metadata
    _packet_generated_at: now.toISOString(),
    _packet_generated_by_admin_id: userData.user.id,
  };
  zip.file("audit_trail.json", JSON.stringify(auditTrail, null, 2));

  // 3. payment_attestation.json
  if (attestation) {
    const attestationExport = {
      id: attestation.id,
      attestation_status: attestation.attestation_status,
      // H1 fields
      payment_method_handle_to_use: attestation.payment_method_handle_to_use,
      buyer_payment_handle: attestation.buyer_payment_handle,
      buyer_phone_at_payment: attestation.buyer_phone_at_payment,
      payment_attestation_text: attestation.payment_attestation_text,
      payment_attestation_signed_at: attestation.payment_attestation_signed_at,
      payment_attestation_ip: attestation.payment_attestation_ip,
      payment_attestation_user_agent: attestation.payment_attestation_user_agent,
      payment_attestation_geolocation: attestation.payment_attestation_geolocation,
      // H2 fields
      confirmation_captured_at: attestation.confirmation_captured_at,
      transaction_reference_id: attestation.transaction_reference_id,
      payment_memo_used: attestation.payment_memo_used,
      // Storage paths (files downloaded into payment_evidence/ folder)
      buyer_payment_handle_screenshot_path: attestation.buyer_payment_handle_screenshot_path,
      confirmation_screenshot_path: attestation.confirmation_screenshot_path,
      created_at: attestation.created_at,
    };
    zip.file("payment_attestation.json", JSON.stringify(attestationExport, null, 2));
  } else {
    zip.file(
      "payment_attestation.json",
      JSON.stringify({ note: "No payment attestation recorded for this agreement." }, null, 2)
    );
  }

  // 4. communications_log.json
  zip.file(
    "communications_log.json",
    JSON.stringify(
      { agreement_id, total: communications.length, entries: communications },
      null,
      2
    )
  );

  // 5. pickup_handover.json
  if (handover) {
    const handoverExport = {
      id: handover.id,
      handover_status: handover.handover_status,
      pickup_date: handover.pickup_date,
      pickup_lat: handover.pickup_lat,
      pickup_lng: handover.pickup_lng,
      buyer_signature_at: handover.buyer_signature_at,
      buyer_id_type: handover.buyer_id_type,
      buyer_id_last_four: handover.buyer_id_last_four,
      buyer_id_state_or_country: handover.buyer_id_state_or_country,
      buyer_id_expiration_verified: handover.buyer_id_expiration_verified,
      staff_member_initials: handover.staff_member_initials,
      staff_signature_at: handover.staff_signature_at,
      health_acknowledgment_signed_at: handover.health_acknowledgment_signed_at,
      vet_certificate_handed_over: handover.vet_certificate_handed_over,
      vet_certificate_acknowledged_at: handover.vet_certificate_acknowledged_at,
      photo_buyer_with_puppy_path: handover.photo_buyer_with_puppy_path,
      photo_buyer_with_id_path: handover.photo_buyer_with_id_path,
      photo_pickup_location_path: handover.photo_pickup_location_path,
      // buyer_signature_canvas saved as pickup_evidence/buyer_signature.png
      created_at: handover.created_at,
      updated_at: handover.updated_at,
    };
    zip.file("pickup_handover.json", JSON.stringify(handoverExport, null, 2));

    // Buyer signature canvas — base64 PNG stored in the row
    if (handover.buyer_signature_canvas) {
      try {
        const b64 = String(handover.buyer_signature_canvas).replace(
          /^data:image\/png;base64,/,
          ""
        );
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        zip.folder("pickup_evidence")!.file("buyer_signature.png", bytes);
      } catch {
        // Non-fatal — malformed canvas data; skip silently.
      }
    }
  } else {
    zip.file(
      "pickup_handover.json",
      JSON.stringify({ note: "Pickup handover not yet completed." }, null, 2)
    );
  }

  // ── Download photos from storage ──────────────────────────────────────────
  const paymentFolder = zip.folder("payment_evidence")!;
  const pickupFolder = zip.folder("pickup_evidence")!;

  /** Download one storage object and add it to a ZIP folder. Non-fatal. */
  async function downloadAndAdd(
    bucket: string,
    storagePath: string | null | undefined,
    folder: JSZip,
    filename: string
  ): Promise<void> {
    if (!storagePath) return;
    try {
      const { data, error } = await supabase.storage.from(bucket).download(storagePath);
      if (error || !data) return;
      const bytes = new Uint8Array(await data.arrayBuffer());
      folder.file(filename, bytes);
    } catch {
      // Non-fatal — include the JSON metadata regardless.
    }
  }

  await Promise.all([
    downloadAndAdd(
      "payment-evidence",
      attestation?.buyer_payment_handle_screenshot_path,
      paymentFolder,
      `handle_screenshot.${safeExt(attestation?.buyer_payment_handle_screenshot_path)}`
    ),
    downloadAndAdd(
      "payment-evidence",
      attestation?.confirmation_screenshot_path,
      paymentFolder,
      `confirmation_screenshot.${safeExt(attestation?.confirmation_screenshot_path)}`
    ),
    downloadAndAdd(
      "pickup-evidence",
      handover?.photo_buyer_with_puppy_path,
      pickupFolder,
      `buyer_with_puppy.${safeExt(handover?.photo_buyer_with_puppy_path)}`
    ),
    downloadAndAdd(
      "pickup-evidence",
      handover?.photo_buyer_with_id_path,
      pickupFolder,
      `buyer_with_id.${safeExt(handover?.photo_buyer_with_id_path)}`
    ),
    downloadAndAdd(
      "pickup-evidence",
      handover?.photo_pickup_location_path,
      pickupFolder,
      `pickup_location.${safeExt(handover?.photo_pickup_location_path)}`
    ),
  ]);

  // ── Generate ZIP bytes ────────────────────────────────────────────────────
  let zipBytes: Uint8Array;
  try {
    zipBytes = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
  } catch (e) {
    return json({ error: "ZIP generation failed", details: String(e) }, 500);
  }

  // ── Upload to dispute-evidence bucket (idempotent — upsert overwrites same-day packet) ──
  const zipPath = `${agreement_id}/evidence-${isoDate}.zip`;
  const { error: uploadErr } = await supabase.storage
    .from("dispute-evidence")
    .upload(zipPath, new Blob([zipBytes], { type: "application/zip" }), {
      contentType: "application/zip",
      upsert: true,
    });
  if (uploadErr) {
    return json({ error: "ZIP upload failed", details: uploadErr.message }, 500);
  }

  // ── Mint 1-hour signed URL ────────────────────────────────────────────────
  const { data: signedData, error: signErr } = await supabase.storage
    .from("dispute-evidence")
    .createSignedUrl(zipPath, 3600);
  if (signErr || !signedData?.signedUrl) {
    return json(
      { error: "Failed to create download URL", details: signErr?.message },
      500
    );
  }

  return json({
    ok: true,
    signed_url: signedData.signedUrl,
    zip_path: zipPath,
    generated_at: now.toISOString(),
  });
});
