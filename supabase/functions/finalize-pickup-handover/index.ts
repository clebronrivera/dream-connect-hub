// Supabase Edge Function: finalize-pickup-handover
//
// Wave H phase 2 (H4). Admin-only (verified inline via JWT + profile.role).
// Called from /admin/pickup once the operator has filled the in-person
// handover form (ID type/last-4/state/expiration, two photos, buyer
// signature canvas, staff initials, vet certificate ack).
//
// Behavior:
//   1) Verify caller is admin.
//   2) Load the pickup_handovers row by agreement_id (must already exist —
//      the admin page UPSERTed it with all required fields populated).
//   3) Verify all required fields are present (defense in depth — the UI
//      gates submit, but enforce server-side too):
//        - photo_buyer_with_puppy_path
//        - photo_buyer_with_id_path
//        - buyer_id_type, buyer_id_last_four, buyer_id_state_or_country,
//          buyer_id_expiration_verified=true
//        - buyer_signature_canvas + buyer_signature_at
//        - staff_member_initials + staff_signature_at
//        - vet_certificate_handed_over=true + vet_certificate_acknowledged_at
//        - health_acknowledgment_signed_at
//   4) Idempotency: if handover_status is already 'in_person_verified',
//      return 200 with already_verified=true.
//   5) UPDATE pickup_handovers SET handover_status='in_person_verified'
//      WHERE agreement_id=? AND handover_status='scheduled'  (race-safe).
//   6) Transition the linked puppy from Reserved → Sold (if a puppy_id is
//      present on the agreement). Idempotent on Sold.
//   7) Send the welcome-home email to the buyer + admin notification.
//      Email failures are logged but do not roll back.
//
// PDF generation is intentionally NOT done here — Wave F (PDF) is parked
// until the operator finishes the OPD-03/04/14/16 template edits. The
// generated row + photos + signatures are sufficient evidence in the
// meantime; PDF rendering can be added later as a separate post-step.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAdminRecipients, sendEmail } from "../_shared/email/send.ts";
import {
  pickupCompleteBuyer,
  adminPickupCompleted,
} from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  agreement_id: string;
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

  // --- Auth: verify admin via JWT (inlined; matches finalize-agreement). ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse(401, { error: "Missing authorization" });
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return jsonResponse(401, { error: "Empty bearer token" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return jsonResponse(401, {
      error: "Invalid session",
      details: userErr?.message ?? "no user resolved from JWT",
    });
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();
  if (profileErr || profile?.role !== "admin") {
    return jsonResponse(403, { error: "Admin access required" });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }
  if (!body.agreement_id) {
    return jsonResponse(400, { error: "Missing agreement_id" });
  }

  // --- Load the agreement (need buyer email + puppy_id + agreement_number). ---
  const { data: agreement, error: agreementErr } = await admin
    .from("deposit_agreements")
    .select(
      "id, agreement_number, buyer_name, buyer_email, puppy_name, puppy_id"
    )
    .eq("id", body.agreement_id)
    .maybeSingle();
  if (agreementErr) {
    return jsonResponse(500, {
      error: "Failed to load agreement",
      details: agreementErr.message,
    });
  }
  if (!agreement) {
    return jsonResponse(404, { error: "Agreement not found" });
  }

  // --- Load the handover row (UPSERTed by the admin UI before submit). ---
  const { data: handover, error: handoverErr } = await admin
    .from("pickup_handovers")
    .select("*")
    .eq("agreement_id", body.agreement_id)
    .maybeSingle();
  if (handoverErr) {
    return jsonResponse(500, {
      error: "Failed to load pickup handover",
      details: handoverErr.message,
    });
  }
  if (!handover) {
    return jsonResponse(422, {
      error: "Pickup handover row missing",
      missing_precondition: "pickup_handover_row",
    });
  }

  // --- Idempotency: already verified? Return success without re-emailing. ---
  if (handover.handover_status === "in_person_verified") {
    return jsonResponse(200, { success: true, already_verified: true });
  }

  // --- Defense-in-depth field check. UI also gates on these. ---
  const missing: string[] = [];
  if (!handover.photo_buyer_with_puppy_path) missing.push("photo_buyer_with_puppy_path");
  if (!handover.photo_buyer_with_id_path) missing.push("photo_buyer_with_id_path");
  if (!handover.buyer_id_type) missing.push("buyer_id_type");
  if (!handover.buyer_id_last_four) missing.push("buyer_id_last_four");
  if (!handover.buyer_id_state_or_country) missing.push("buyer_id_state_or_country");
  if (handover.buyer_id_expiration_verified !== true) missing.push("buyer_id_expiration_verified");
  if (!handover.buyer_signature_canvas) missing.push("buyer_signature_canvas");
  if (!handover.buyer_signature_at) missing.push("buyer_signature_at");
  if (!handover.staff_member_initials) missing.push("staff_member_initials");
  if (!handover.staff_signature_at) missing.push("staff_signature_at");
  if (handover.vet_certificate_handed_over !== true) missing.push("vet_certificate_handed_over");
  if (!handover.vet_certificate_acknowledged_at) missing.push("vet_certificate_acknowledged_at");
  if (!handover.health_acknowledgment_signed_at) missing.push("health_acknowledgment_signed_at");
  if (missing.length > 0) {
    return jsonResponse(422, {
      error: "Pickup handover is missing required fields",
      missing,
    });
  }

  // --- Race-safe transition: only flip if currently 'scheduled'. ---
  const { data: updated, error: updateErr } = await admin
    .from("pickup_handovers")
    .update({ handover_status: "in_person_verified" })
    .eq("agreement_id", body.agreement_id)
    .eq("handover_status", "scheduled")
    .select("id")
    .maybeSingle();
  if (updateErr) {
    return jsonResponse(500, {
      error: "Failed to mark handover verified",
      details: updateErr.message,
    });
  }
  if (!updated) {
    // Lost the race — another caller already verified. Treat as success.
    return jsonResponse(200, { success: true, already_verified: true });
  }

  // --- Transition puppy Reserved → Sold (if puppy_id present). ---
  // Idempotent: a puppy already 'Sold' stays 'Sold'.
  if (agreement.puppy_id) {
    const { error: puppyErr } = await admin
      .from("puppies")
      .update({ status: "Sold" })
      .eq("id", agreement.puppy_id)
      .neq("status", "Sold");
    if (puppyErr) {
      console.error("finalize-pickup-handover: puppy status update failed:", puppyErr);
      // Do not roll back — the handover is recorded; admin can fix puppy status manually.
    }
  }

  // --- Send buyer welcome-home email. ---
  if (agreement.buyer_email) {
    const tpl = pickupCompleteBuyer({
      buyerName: agreement.buyer_name,
      puppyName: agreement.puppy_name,
      agreementNumber: agreement.agreement_number,
      pickupDate: handover.pickup_date,
      // Unset until Carlos claims the Google Business Profile — the review
      // CTA lights up automatically once GOOGLE_PLACE_ID is set as a secret.
      googlePlaceId: Deno.env.get("GOOGLE_PLACE_ID") || null,
    });
    const r = await sendEmail({
      to: agreement.buyer_email,
      subject: tpl.subject,
      html: tpl.html,
      agreementId: body.agreement_id,
      summary: `Buyer emailed welcome-home — ${agreement.puppy_name} pickup complete`,
    });
    if (!r.ok) console.error("finalize-pickup-handover: buyer email failed:", r.error);
  }

  // --- Admin notification. ---
  const admins = getAdminRecipients();
  if (admins.length > 0) {
    const tpl = adminPickupCompleted({
      agreementNumber: agreement.agreement_number,
      buyerName: agreement.buyer_name,
      puppyName: agreement.puppy_name,
      pickupDate: handover.pickup_date,
      staffInitials: handover.staff_member_initials,
    });
    const r = await sendEmail({
      to: admins,
      subject: tpl.subject,
      html: tpl.html,
      agreementId: body.agreement_id,
      summary: `Admin notified — pickup handover complete (${agreement.agreement_number})`,
    });
    if (!r.ok) console.error("finalize-pickup-handover: admin email failed:", r.error);
  }

  return jsonResponse(200, {
    success: true,
    handover_id: handover.id,
    puppy_marked_sold: !!agreement.puppy_id,
  });
});
