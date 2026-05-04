// Supabase Edge Function: send-newsletter
// Admin-invoked. Sends a newsletter to a provided list of recipient emails.
// POST body: { subject, headline, bodyParagraphs, ctaText?, ctaUrl?, closingNote?, recipientEmails }
// Auth: Bearer JWT, admin role required.
// Sends individually with Promise.allSettled so one bad address does not block others.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email/send.ts";
import { newsletter } from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_RECIPIENTS = 500;

interface RequestBody {
  subject: string;
  headline: string;
  bodyParagraphs: string[];
  ctaText?: string;
  ctaUrl?: string;
  closingNote?: string;
  recipientEmails: string[];
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

  // --- Auth: verify admin via JWT ---
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

  // --- Parse and validate body ---
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  if (!body.subject?.trim()) return jsonResponse(400, { error: "subject is required" });
  if (!body.headline?.trim()) return jsonResponse(400, { error: "headline is required" });
  if (!Array.isArray(body.bodyParagraphs) || body.bodyParagraphs.length === 0) {
    return jsonResponse(400, { error: "bodyParagraphs must be a non-empty array" });
  }
  if (body.bodyParagraphs.length > 3) {
    return jsonResponse(400, { error: "bodyParagraphs may contain at most 3 items" });
  }
  if (!Array.isArray(body.recipientEmails) || body.recipientEmails.length === 0) {
    return jsonResponse(400, { error: "recipientEmails must be a non-empty array" });
  }
  if (body.recipientEmails.length > MAX_RECIPIENTS) {
    return jsonResponse(400, {
      error: `recipientEmails exceeds maximum of ${MAX_RECIPIENTS}`,
    });
  }

  // --- Build template ---
  const tpl = newsletter({
    subject: body.subject.trim(),
    headline: body.headline.trim(),
    bodyParagraphs: body.bodyParagraphs.map((p) => p.trim()).filter(Boolean),
    ctaText: body.ctaText?.trim() || null,
    ctaUrl: body.ctaUrl?.trim() || null,
    closingNote: body.closingNote?.trim() || null,
  });

  // --- Send to all recipients (one bad address must not block others) ---
  const results = await Promise.allSettled(
    body.recipientEmails.map((email) =>
      sendEmail({ to: email, subject: tpl.subject, html: tpl.html })
    )
  );

  const failedCount = results.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
  ).length;
  const sentCount = body.recipientEmails.length - failedCount;

  if (sentCount === 0) {
    return jsonResponse(502, {
      error: "Failed to send newsletter to any recipient",
      failed: failedCount,
      sent: 0,
    });
  }

  return jsonResponse(200, {
    success: true,
    sent: sentCount,
    failed: failedCount,
    total: body.recipientEmails.length,
  });
});
