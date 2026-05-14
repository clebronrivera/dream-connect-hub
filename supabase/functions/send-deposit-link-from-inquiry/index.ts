// Supabase Edge Function: send-deposit-link-from-inquiry
//
// One-click path from a public inquiry to a buyer-emailed deposit link.
// Mints a deposit_requests row pre-filled from the inquiry + the linked
// customer + the linked puppy, sets request_status = 'deposit_link_sent',
// and reuses the same email template as send-deposit-link. Stamps
// puppy_inquiries.admin_viewed_at so the dashboard alert clears.
//
// Admin-only (verifyAdmin). Returns 4xx if any precondition fails (sold
// puppy, already reserved for a different customer, duplicate active
// deposit request, etc).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAdmin } from "../_shared/auth/verifyAdmin.ts";
import { sendEmail } from "../_shared/email/send.ts";
import { depositLinkSent } from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://puppyheavenllc.com";

interface RequestBody {
  inquiry_id: string;
  custom_message?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(
  status: number,
  body: unknown,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST")
    return jsonResponse(405, { error: "Method not allowed" }, cors);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const auth = await verifyAdmin(req, admin);
  if (!auth.ok) {
    return jsonResponse(auth.status, auth.body, cors);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" }, cors);
  }
  if (!body.inquiry_id || !UUID_RE.test(body.inquiry_id)) {
    return jsonResponse(400, { error: "inquiry_id (uuid) required" }, cors);
  }

  // --- Load + validate inquiry ---
  const { data: inquiry, error: inquiryErr } = await admin
    .from("puppy_inquiries")
    .select(
      "id, name, email, phone, customer_id, puppy_id, puppy_name, city, state, preferences, admin_viewed_at, admin_notes",
    )
    .eq("id", body.inquiry_id)
    .maybeSingle();
  if (inquiryErr) {
    return jsonResponse(
      500,
      { error: "Failed to load inquiry", details: inquiryErr.message },
      cors,
    );
  }
  if (!inquiry) return jsonResponse(404, { error: "Inquiry not found" }, cors);
  if (!inquiry.customer_id) {
    return jsonResponse(
      422,
      {
        error:
          "Inquiry has no linked customer. Reconcile via the customers table first.",
      },
      cors,
    );
  }
  if (!inquiry.puppy_id || !UUID_RE.test(inquiry.puppy_id)) {
    return jsonResponse(
      422,
      { error: "Inquiry has no valid puppy_id" },
      cors,
    );
  }

  // --- Load + validate customer ---
  const { data: customer, error: customerErr } = await admin
    .from("customers")
    .select("id, email, phone, first_name, last_name, city, state")
    .eq("id", inquiry.customer_id)
    .maybeSingle();
  if (customerErr) {
    return jsonResponse(
      500,
      { error: "Failed to load customer", details: customerErr.message },
      cors,
    );
  }
  if (!customer)
    return jsonResponse(404, { error: "Linked customer not found" }, cors);
  const customerEmail = (customer.email ?? inquiry.email ?? "").trim();
  if (!customerEmail) {
    return jsonResponse(
      422,
      { error: "Customer has no email; cannot send deposit link" },
      cors,
    );
  }

  // --- Load + validate puppy ---
  const { data: puppy, error: puppyErr } = await admin
    .from("puppies")
    .select(
      "id, name, status, base_price, deposit_amount, reserved_for_customer_id, is_deceased",
    )
    .eq("id", inquiry.puppy_id)
    .maybeSingle();
  if (puppyErr) {
    return jsonResponse(
      500,
      { error: "Failed to load puppy", details: puppyErr.message },
      cors,
    );
  }
  if (!puppy) return jsonResponse(404, { error: "Puppy not found" }, cors);
  if (puppy.is_deceased) {
    return jsonResponse(409, { error: "Puppy is deceased" }, cors);
  }
  if (puppy.status === "Sold") {
    return jsonResponse(409, { error: "Puppy is already sold" }, cors);
  }
  if (
    puppy.reserved_for_customer_id &&
    puppy.reserved_for_customer_id !== customer.id
  ) {
    return jsonResponse(
      409,
      { error: "Puppy is already reserved for a different customer" },
      cors,
    );
  }

  // --- Check for existing active deposit_request or deposit_agreement ---
  const { data: existingReq } = await admin
    .from("deposit_requests")
    .select("id, request_status")
    .eq("customer_id", customer.id)
    .eq("puppy_id", inquiry.puppy_id)
    .not("request_status", "in", "(declined,converted)")
    .limit(1);
  if (existingReq && existingReq.length > 0) {
    return jsonResponse(
      409,
      {
        error:
          "An active deposit request already exists for this customer and puppy",
        deposit_request_id: existingReq[0].id,
      },
      cors,
    );
  }
  const { data: existingAgreement } = await admin
    .from("deposit_agreements")
    .select("id, agreement_status")
    .eq("puppy_id", inquiry.puppy_id)
    .in("agreement_status", ["sent", "admin_approved"])
    .limit(1);
  if (existingAgreement && existingAgreement.length > 0) {
    return jsonResponse(
      409,
      {
        error: "A deposit agreement already exists for this puppy",
        agreement_id: existingAgreement[0].id,
      },
      cors,
    );
  }

  // --- Resolve deposit amount (puppy override else flat 300) ---
  const depositAmount =
    puppy.deposit_amount && Number(puppy.deposit_amount) > 0
      ? Number(puppy.deposit_amount)
      : 300;

  const customerName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() ||
    inquiry.name ||
    customerEmail;

  // --- Create deposit_requests row in deposit_link_sent state ---
  const now = new Date().toISOString();
  const placeholderLink = `${SITE_URL}/deposit?requestId=PENDING`;
  const { data: created, error: createErr } = await admin
    .from("deposit_requests")
    .insert({
      customer_id: customer.id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customer.phone ?? inquiry.phone ?? null,
      city: customer.city ?? inquiry.city ?? null,
      state: customer.state ?? inquiry.state ?? null,
      puppy_id: inquiry.puppy_id,
      puppy_name: puppy.name ?? inquiry.puppy_name ?? null,
      request_status: "deposit_link_sent",
      deposit_link_url: placeholderLink,
      deposit_link_sent_at: now,
      deposit_link_sent_via: ["email"],
      email_sent_at: now,
    })
    .select("id")
    .single();
  if (createErr || !created) {
    return jsonResponse(
      500,
      {
        error: "Failed to create deposit request",
        details: createErr?.message,
      },
      cors,
    );
  }

  const depositLink = `${SITE_URL}/deposit?requestId=${created.id}`;
  await admin
    .from("deposit_requests")
    .update({ deposit_link_url: depositLink })
    .eq("id", created.id);

  // --- Send buyer email ---
  const tpl = depositLinkSent({
    customerName,
    litterLabel: puppy.name ?? "your puppy",
    depositAmount,
    depositLink,
    customMessage: body.custom_message,
  });
  const emailResult = await sendEmail({
    to: customerEmail,
    subject: tpl.subject,
    html: tpl.html,
  });
  if (!emailResult.ok) {
    return jsonResponse(
      502,
      {
        error: "Deposit request created but email send failed",
        details: emailResult.error,
        deposit_request_id: created.id,
      },
      cors,
    );
  }

  // --- Mark inquiry viewed + append audit note ---
  const note = `Sent deposit link on ${now} (deposit_request ${created.id}).`;
  const prevNotes = inquiry.admin_notes ?? "";
  await admin
    .from("puppy_inquiries")
    .update({
      admin_viewed_at: inquiry.admin_viewed_at ?? now,
      admin_notes: prevNotes ? `${prevNotes}\n${note}` : note,
    })
    .eq("id", inquiry.id);

  return jsonResponse(
    200,
    { success: true, deposit_request_id: created.id, deposit_link: depositLink },
    cors,
  );
});
