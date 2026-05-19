// supabase/functions/_shared/pdf/generateDepositPdf.ts — Wave F4
//
// Core PDF generation logic for the deposit agreement.
// Used by:
//   - generate-agreement-pdf edge function (direct admin call / Wave F4)
//   - finalize-agreement edge function (triggered on finalization / Wave F5)
//
// Reads the AcroForm template from ./templates/deposit_agreement_template.pdf,
// fills all fields via depositAgreementFieldMap, flattens, uploads to the
// 'agreements' storage bucket, and updates the agreement row.

import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assertAllFieldsPresent,
  fillDepositAgreement,
  type DepositAgreementRow,
  type PuppyJoinData,
} from "./depositAgreementFieldMap.ts";

export interface GeneratePdfResult {
  ok: true;
  pdf_path: string;
  agreement_number: string;
  buyer_access_token: string;
}

export interface GeneratePdfError {
  ok: false;
  status: number;
  body: { error: string; details?: string };
}

export type GeneratePdfOutcome = GeneratePdfResult | GeneratePdfError;

/**
 * Generate, upload, and record the deposit agreement PDF for a given agreement.
 *
 * Preconditions (enforced here):
 *   - agreement_status = 'admin_approved'  OR  signed_pdf_storage_path already set (idempotent)
 *   - deposit_status   = 'admin_confirmed'
 *
 * On success:
 *   - PDF uploaded to agreements/{agreement_id}/{agreement_number}.pdf
 *   - deposit_agreements.signed_pdf_storage_path updated
 *   - agreement_status stays 'admin_approved' — finalize-pickup-handover transitions to 'complete'
 */
export async function generateDepositPdf(
  supabase: SupabaseClient,
  agreementId: string
): Promise<GeneratePdfOutcome> {
  // ── 1. Fetch agreement with puppy + litter join ────────────────────────
  const { data: agreement, error: fetchErr } = await supabase
    .from("deposit_agreements")
    .select(`
      *,
      puppy:puppies(
        sex,
        litter:upcoming_litters(dam_name, sire_name)
      )
    `)
    .eq("id", agreementId)
    .single();

  if (fetchErr || !agreement) {
    return {
      ok: false,
      status: 404,
      body: { error: "Agreement not found", details: fetchErr?.message },
    };
  }

  // ── 2. Idempotency — already generated ────────────────────────────────
  if (agreement.signed_pdf_storage_path) {
    return {
      ok: true,
      pdf_path: agreement.signed_pdf_storage_path,
      agreement_number: agreement.agreement_number,
      buyer_access_token: agreement.buyer_access_token,
    };
  }

  // ── 3. Precondition check ─────────────────────────────────────────────
  // PR 4 redesign: countersign happens BEFORE payment, so deposit_status may
  // still be 'pending' when the PDF is first generated. Only check that the
  // admin has countersigned (agreement_status = 'admin_approved').
  if (agreement.agreement_status !== "admin_approved") {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Agreement must be in admin_approved status before PDF generation",
        details: `current status: ${agreement.agreement_status}`,
      },
    };
  }

  // ── 4. Load template ───────────────────────────────────────────────────
  const templatePath = new URL(
    "./templates/deposit_agreement_template.pdf",
    import.meta.url
  );
  let templateBytes: Uint8Array;
  try {
    templateBytes = await Deno.readFile(templatePath);
  } catch (err) {
    return {
      ok: false,
      status: 500,
      body: {
        error: "Failed to read PDF template",
        details: err instanceof Error ? err.message : String(err),
      },
    };
  }

  // ── 5. Load PDF and validate fields ────────────────────────────────────
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(templateBytes);
  } catch (err) {
    return {
      ok: false,
      status: 500,
      body: {
        error: "Failed to parse PDF template",
        details: err instanceof Error ? err.message : String(err),
      },
    };
  }

  const form = pdfDoc.getForm();

  try {
    assertAllFieldsPresent(form);
  } catch (err) {
    return {
      ok: false,
      status: 500,
      body: {
        error: "PDF template field drift detected",
        details: err instanceof Error ? err.message : String(err),
      },
    };
  }

  // ── 6. Fill fields ─────────────────────────────────────────────────────
  const row = agreement as DepositAgreementRow;
  const puppyData = agreement.puppy as PuppyJoinData | null;

  try {
    fillDepositAgreement(form, row, puppyData);
  } catch (err) {
    return {
      ok: false,
      status: 500,
      body: {
        error: "Failed to fill PDF fields",
        details: err instanceof Error ? err.message : String(err),
      },
    };
  }

  // ── 7. Flatten (make form non-editable) ────────────────────────────────
  form.flatten();

  // ── 8. Serialize ───────────────────────────────────────────────────────
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await pdfDoc.save();
  } catch (err) {
    return {
      ok: false,
      status: 500,
      body: {
        error: "Failed to serialize PDF",
        details: err instanceof Error ? err.message : String(err),
      },
    };
  }

  // ── 9. Upload to storage ───────────────────────────────────────────────
  const agreementNumber = agreement.agreement_number as string;
  const storagePath = `${agreementId}/${agreementNumber}.pdf`;

  const { error: uploadErr } = await supabase.storage
    .from("agreements")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true, // safe to overwrite if re-run after a partial failure
    });

  if (uploadErr) {
    return {
      ok: false,
      status: 500,
      body: {
        error: "Failed to upload PDF to storage",
        details: uploadErr.message,
      },
    };
  }

  // ── 10. Update agreement row ───────────────────────────────────────────
  // PR 4/5 redesign: agreement_status transitions are now:
  //   admin_approved (countersign) → (payment) → complete (pickup handover).
  // Do NOT set agreement_status='complete' here; that belongs to
  // finalize-pickup-handover so the status reflects actual physical delivery.
  const { error: updateErr } = await supabase
    .from("deposit_agreements")
    .update({
      signed_pdf_storage_path: storagePath,
    })
    .eq("id", agreementId);

  if (updateErr) {
    // PDF is uploaded but DB update failed — not ideal but recoverable.
    // Return the path so the caller can surface it; the admin can re-run.
    console.error("PDF uploaded but DB update failed:", updateErr.message);
    return {
      ok: false,
      status: 500,
      body: {
        error: "PDF uploaded but failed to update agreement record",
        details: updateErr.message,
      },
    };
  }

  // ── 11. G3 — Transition puppy Available → Reserved (idempotent) ───────────
  // Only fires when puppy_id is set AND the puppy is still Available.
  // Won't overwrite a puppy already Reserved or Sold (safe for re-runs).
  if (agreement.puppy_id) {
    const { error: puppyErr } = await supabase
      .from("puppies")
      .update({ status: "Reserved" })
      .eq("id", agreement.puppy_id)
      .eq("status", "Available"); // idempotent — no-op if already Reserved/Sold
    if (puppyErr) {
      // Non-fatal: log and continue. The agreement PDF is already saved.
      console.error(
        "generateDepositPdf: failed to set puppy status Reserved:",
        puppyErr.message
      );
    }
  }

  return {
    ok: true,
    pdf_path: storagePath,
    agreement_number: agreementNumber,
    buyer_access_token: agreement.buyer_access_token as string,
  };
}
