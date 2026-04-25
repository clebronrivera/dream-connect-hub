// Supabase Edge Function: send-pending-reminders
// Triggered by pg_cron or external scheduler.
// Queries stale pending deposits and sends admin reminder emails.
//
// === DEPLOYMENT REQUIREMENT ===
// Before enabling or re-enabling the reminder scheduler, set CRON_SECRET in
// Supabase Edge Function secrets and configure the scheduler to send
// `X-Cron-Secret` with the same value. Requests missing or mismatching the
// header are rejected — without the secret set, the function refuses every
// call. There is no query-param fallback by design.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdminRecipients, sendEmail } from "../_shared/email/send.ts";
import {
  adminManualReviewRequired,
  adminPendingDepositReminder,
} from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const REMINDER_MAX_COUNT = 5;
const TRIGGER_HOURS = 24;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!CRON_SECRET) {
    console.error(
      "send-pending-reminders called but CRON_SECRET is not configured"
    );
    return new Response(
      JSON.stringify({ error: "Server not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const providedSecret = req.headers.get("X-Cron-Secret");
  if (!providedSecret) {
    return new Response(
      JSON.stringify({ error: "Missing X-Cron-Secret header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  if (providedSecret !== CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: "Invalid cron secret" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const threshold = new Date(
    Date.now() - TRIGGER_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: stalePending, error: queryErr } = await supabase
    .from("deposit_agreements")
    .select("*")
    .eq("deposit_status", "pending")
    .lt("created_at", threshold)
    .lt("reminder_count", REMINDER_MAX_COUNT)
    .eq("requires_manual_review", false);

  if (queryErr) {
    return new Response(
      JSON.stringify({ error: "Query failed", details: queryErr }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const admins = getAdminRecipients();
  let remindersSent = 0;
  let flaggedForReview = 0;

  for (const agreement of stalePending ?? []) {
    if (agreement.reminder_last_sent_at) {
      const lastSent = new Date(agreement.reminder_last_sent_at).getTime();
      if (Date.now() - lastSent < TRIGGER_HOURS * 60 * 60 * 1000) {
        continue;
      }
    }

    const newCount = (agreement.reminder_count ?? 0) + 1;

    if (newCount >= REMINDER_MAX_COUNT) {
      await supabase
        .from("deposit_agreements")
        .update({
          requires_manual_review: true,
          reminder_count: newCount,
          reminder_last_sent_at: new Date().toISOString(),
        })
        .eq("id", agreement.id);

      if (admins.length > 0) {
        const tpl = adminManualReviewRequired({
          agreementNumber: agreement.agreement_number,
          buyerName: agreement.buyer_name,
          puppyName: agreement.puppy_name,
        });
        const r = await sendEmail({
          to: admins,
          subject: tpl.subject,
          html: tpl.html,
        });
        if (!r.ok) console.error("Manual review alert failed:", r.error);
      }
      flaggedForReview++;
    } else {
      await supabase
        .from("deposit_agreements")
        .update({
          reminder_count: newCount,
          reminder_last_sent_at: new Date().toISOString(),
        })
        .eq("id", agreement.id);

      if (admins.length > 0) {
        const tpl = adminPendingDepositReminder({
          agreementNumber: agreement.agreement_number,
          buyerName: agreement.buyer_name,
          puppyName: agreement.puppy_name,
          depositAmount: Number(agreement.deposit_amount),
          paymentMethod: agreement.deposit_payment_method,
          reminderCount: newCount,
        });
        const r = await sendEmail({
          to: admins,
          subject: tpl.subject,
          html: tpl.html,
        });
        if (!r.ok) console.error("Pending reminder failed:", r.error);
      }
      remindersSent++;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processed: (stalePending ?? []).length,
      remindersSent,
      flaggedForReview,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
