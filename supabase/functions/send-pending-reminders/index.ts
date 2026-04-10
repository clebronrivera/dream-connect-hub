// Supabase Edge Function: send-pending-reminders
// Triggered by pg_cron or external scheduler.
// Queries stale pending deposits and sends admin reminder emails.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAILS = (Deno.env.get("NOTIFY_EMAIL") ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const RESEND_FROM =
  Deno.env.get("RESEND_FROM") ?? "Dream Puppies <onboarding@resend.dev>";

const REMINDER_MAX_COUNT = 5;
const TRIGGER_HOURS = 24;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const threshold = new Date(
    Date.now() - TRIGGER_HOURS * 60 * 60 * 1000
  ).toISOString();

  // Query 1: Pending deposits past 24-hour threshold
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

  let remindersSent = 0;
  let flaggedForReview = 0;

  for (const agreement of stalePending ?? []) {
    // Check if enough time has passed since last reminder
    if (agreement.reminder_last_sent_at) {
      const lastSent = new Date(agreement.reminder_last_sent_at).getTime();
      if (Date.now() - lastSent < TRIGGER_HOURS * 60 * 60 * 1000) {
        continue; // Skip — too soon since last reminder
      }
    }

    const newCount = (agreement.reminder_count ?? 0) + 1;

    if (newCount >= REMINDER_MAX_COUNT) {
      // Flag for manual review (Build Rule #10)
      await supabase
        .from("deposit_agreements")
        .update({
          requires_manual_review: true,
          reminder_count: newCount,
          reminder_last_sent_at: new Date().toISOString(),
        })
        .eq("id", agreement.id);

      // Send admin alert
      if (RESEND_API_KEY && NOTIFY_EMAILS.length > 0) {
        await sendEmail(
          NOTIFY_EMAILS,
          `Manual Review Required: ${agreement.agreement_number}`,
          `<p>Agreement <strong>${escapeHtml(agreement.agreement_number)}</strong> for ${escapeHtml(agreement.buyer_name)} has reached ${REMINDER_MAX_COUNT} reminders without action.</p><p>Please review manually in the admin dashboard.</p><p style="color: #888;">Dream Puppies — hobby breeding program</p>`
        );
      }
      flaggedForReview++;
    } else {
      // Send admin reminder
      await supabase
        .from("deposit_agreements")
        .update({
          reminder_count: newCount,
          reminder_last_sent_at: new Date().toISOString(),
        })
        .eq("id", agreement.id);

      if (RESEND_API_KEY && NOTIFY_EMAILS.length > 0) {
        await sendEmail(
          NOTIFY_EMAILS,
          `Pending Deposit Reminder (${newCount}/${REMINDER_MAX_COUNT}): ${agreement.agreement_number}`,
          `
          <h3>Pending Deposit Requires Attention</h3>
          <p>Agreement <strong>${escapeHtml(agreement.agreement_number)}</strong> has been pending for more than ${TRIGGER_HOURS} hours.</p>
          <table style="border-collapse: collapse;">
            <tr><td style="padding: 4px 8px; border: 1px solid #eee;"><strong>Buyer</strong></td><td style="padding: 4px 8px; border: 1px solid #eee;">${escapeHtml(agreement.buyer_name)}</td></tr>
            <tr><td style="padding: 4px 8px; border: 1px solid #eee;"><strong>Puppy</strong></td><td style="padding: 4px 8px; border: 1px solid #eee;">${escapeHtml(agreement.puppy_name)}</td></tr>
            <tr><td style="padding: 4px 8px; border: 1px solid #eee;"><strong>Deposit</strong></td><td style="padding: 4px 8px; border: 1px solid #eee;">$${Number(agreement.deposit_amount).toFixed(2)}</td></tr>
            <tr><td style="padding: 4px 8px; border: 1px solid #eee;"><strong>Method</strong></td><td style="padding: 4px 8px; border: 1px solid #eee;">${escapeHtml(agreement.deposit_payment_method)}</td></tr>
            <tr><td style="padding: 4px 8px; border: 1px solid #eee;"><strong>Reminder</strong></td><td style="padding: 4px 8px; border: 1px solid #eee;">${newCount} of ${REMINDER_MAX_COUNT}</td></tr>
          </table>
          <p style="color: #888; font-size: 12px;">Dream Puppies — hobby breeding program</p>
          `.trim()
        );
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

async function sendEmail(to: string[], subject: string, html: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
