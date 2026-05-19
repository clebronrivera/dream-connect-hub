// supabase/functions/_shared/pdf/generateBillOfSalePdf.ts — PR 6
//
// Core bill-of-sale PDF generation. Generates a one-page document
// programmatically with pdf-lib (no AcroForm template — see TODO(Carlos)
// if a visual/branded redesign is wanted later).
//
// Consumed by:
//   - generate-bill-of-sale edge function (standalone admin trigger)
//   - finalize-pickup-handover edge function (automatic on pickup completion)

import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const BRAND_COLOR = rgb(0.1, 0.15, 0.35);
const GRAY = rgb(0.45, 0.45, 0.45);
const BLACK = rgb(0, 0, 0);

function fmt(n: number | null | undefined): string {
  return n != null ? `$${Number(n).toFixed(2)}` : "—";
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) {
    return new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  }
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

/** Build the PDF in memory and return the raw bytes. */
export async function buildBillOfSalePdfBytes(
  agreement: AnyRow,
  handover: AnyRow | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const L = 56;
  const R = width - 56;
  let y = height - 56;

  // Header
  page.drawText("BILL OF SALE", { x: L, y, font: bold, size: 22, color: BRAND_COLOR });
  y -= 20;
  page.drawText("Dream Puppies — Dream Enterprises LLC", { x: L, y, font: regular, size: 10, color: GRAY });
  const phone = "(321) 697-8864";
  page.drawText(phone, {
    x: R - regular.widthOfTextAtSize(phone, 10), y,
    font: regular, size: 10, color: GRAY,
  });
  y -= 6;
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1, color: BRAND_COLOR });
  y -= 24;

  // Meta rows
  const meta: [string, string][] = [
    ["Agreement #", String(agreement.agreement_number ?? "—")],
    ["Date", fmtDate(handover?.pickup_date ?? agreement.confirmed_pickup_date)],
  ];
  for (const [label, value] of meta) {
    page.drawText(label, { x: L, y, font: bold, size: 10, color: BRAND_COLOR });
    page.drawText(value, { x: L + 140, y, font: regular, size: 10, color: BLACK });
    y -= 16;
  }

  // Section heading helper
  function sectionHead(title: string) {
    y -= 10;
    page.drawText(title.toUpperCase(), { x: L, y, font: bold, size: 9, color: GRAY });
    y -= 4;
    page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 14;
  }

  function field(label: string, value: string) {
    page.drawText(label, { x: L, y, font: bold, size: 10, color: BRAND_COLOR });
    page.drawText(value, { x: L + 140, y, font: regular, size: 10, color: BLACK });
    y -= 16;
  }

  // Puppy
  sectionHead("Puppy");
  field("Name", String(agreement.puppy_name ?? "—"));
  if (agreement.breed) field("Breed", String(agreement.breed));
  if (agreement.puppy_dob) field("Date of birth", fmtDate(String(agreement.puppy_dob)));

  // Buyer
  sectionHead("Buyer");
  field("Name", String(agreement.buyer_name ?? "—"));
  field("Email", String(agreement.buyer_email ?? "—"));
  field("Phone", String(agreement.buyer_phone ?? "—"));
  const addrParts = [
    agreement.buyer_street, agreement.buyer_city, agreement.buyer_state, agreement.buyer_zip,
  ].filter(Boolean).join(", ");
  if (addrParts) field("Address", addrParts);

  // Transaction
  sectionHead("Transaction");
  field("Purchase price", fmt(agreement.purchase_price));
  field("Deposit paid", fmt(agreement.deposit_amount));
  if (agreement.payment_mode === "deposit_only") {
    field("Balance received", fmt(agreement.balance_due));
  } else {
    field("Payment mode", "Full payment");
  }
  field("Payment method", String(agreement.deposit_payment_method ?? "—"));

  // ID verification (if captured)
  if (handover?.buyer_id_last_four) {
    sectionHead("Identity verification (pickup day)");
    field("ID last 4", String(handover.buyer_id_last_four));
    if (handover.buyer_id_state_or_country) {
      field("Issuing region", String(handover.buyer_id_state_or_country));
    }
  }

  // Acknowledgment paragraph
  y -= 8;
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1, color: BRAND_COLOR });
  y -= 16;

  const ackText =
    "Buyer acknowledges receipt of the above-described puppy in apparent good health. " +
    "The deposit is non-refundable per the terms of the signed Reservation Agreement. " +
    "This bill of sale is governed by Florida law.";

  const words = ackText.split(" ");
  let line = "";
  const maxW = R - L;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (regular.widthOfTextAtSize(test, 9) > maxW) {
      page.drawText(line, { x: L, y, font: regular, size: 9, color: GRAY });
      y -= 13;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x: L, y, font: regular, size: 9, color: GRAY });
    y -= 13;
  }
  y -= 20;

  // Signature lines
  const sigY = y;
  const midX = L + (R - L) / 2 + 16;

  const buyerSig = handover?.buyer_signature_canvas as string | null;
  if (buyerSig) {
    page.drawText(buyerSig, { x: L, y: sigY, font: regular, size: 14, color: BRAND_COLOR });
  }
  page.drawLine({
    start: { x: L, y: sigY - 4 }, end: { x: midX - 16, y: sigY - 4 },
    thickness: 0.75, color: BLACK,
  });
  page.drawText("Buyer signature", { x: L, y: sigY - 14, font: regular, size: 8, color: GRAY });

  const staffInitials = handover?.staff_member_initials as string | null;
  if (staffInitials) {
    page.drawText(staffInitials, { x: midX, y: sigY, font: bold, size: 14, color: BRAND_COLOR });
  }
  page.drawLine({
    start: { x: midX, y: sigY - 4 }, end: { x: R, y: sigY - 4 },
    thickness: 0.75, color: BLACK,
  });
  page.drawText("Dream Puppies representative", {
    x: midX, y: sigY - 14, font: regular, size: 8, color: GRAY,
  });

  return doc.save();
}

export interface GenerateBillOfSaleResult {
  ok: true;
  pdf_path: string;
  already_generated?: boolean;
}

export interface GenerateBillOfSaleError {
  ok: false;
  status: number;
  body: { error: string; details?: string };
}

export type BillOfSaleOutcome = GenerateBillOfSaleResult | GenerateBillOfSaleError;

/** Generate, upload, and return the bill-of-sale PDF path.
 * Idempotent: returns the existing path if the file already exists in storage.
 */
export async function generateBillOfSale(
  supabase: SupabaseClient,
  agreementId: string
): Promise<BillOfSaleOutcome> {
  const storagePath = `${agreementId}/bill-of-sale.pdf`;

  // Idempotency check
  const { data: existing } = await supabase.storage
    .from("agreements")
    .list(agreementId, { search: "bill-of-sale.pdf" });
  if (existing && existing.length > 0) {
    return { ok: true, pdf_path: storagePath, already_generated: true };
  }

  // Fetch data
  const [agreementRes, handoverRes] = await Promise.all([
    supabase.from("deposit_agreements").select("*").eq("id", agreementId).single(),
    supabase.from("pickup_handovers").select("*").eq("agreement_id", agreementId).maybeSingle(),
  ]);

  if (agreementRes.error || !agreementRes.data) {
    return {
      ok: false, status: 404,
      body: { error: "Agreement not found", details: agreementRes.error?.message },
    };
  }

  // Generate
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildBillOfSalePdfBytes(
      agreementRes.data as AnyRow,
      (handoverRes.data ?? null) as AnyRow | null
    );
  } catch (err) {
    return {
      ok: false, status: 500,
      body: {
        error: "Failed to generate bill of sale PDF",
        details: err instanceof Error ? err.message : String(err),
      },
    };
  }

  // Upload
  const { error: uploadErr } = await supabase.storage
    .from("agreements")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadErr) {
    return {
      ok: false, status: 500,
      body: { error: "Failed to upload bill of sale", details: uploadErr.message },
    };
  }

  return { ok: true, pdf_path: storagePath };
}
