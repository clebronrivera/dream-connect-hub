// Supabase Edge Function: notify-waitlist-new-puppy
//
// Phase 6.4 — own-property auto-post (ToS-safe). Triggered by a DB trigger
// on puppies (AFTER UPDATE OF status, WHEN NEW.status = 'Available' AND
// OLD.status IS DISTINCT FROM 'Available') via trg_notify_waitlist_on_puppy_available.
// Matches the new puppy against waitlist_signups on breed and emails each
// matching lead. Not an auto-poster to third-party sites — see the review's
// ToS-risk framing; this only emails people who opted in on our own site.
//
// === DEPLOYMENT REQUIREMENT ===
// Set CRON_SECRET in Edge Function secrets (same secret already used by
// send-pending-reminders) and have the DB trigger send X-Cron-Secret with the
// same value. Requests missing or mismatching the header are rejected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdminRecipients, sendEmail } from "../_shared/email/send.ts";
import { waitlistPuppyMatch } from "../_shared/email/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://puppyheavenllc.com";

interface RequestBody {
  puppy_id?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  if (!CRON_SECRET) {
    console.error("notify-waitlist-new-puppy called but CRON_SECRET is not configured");
    return json(503, { error: "Server not configured" });
  }
  const providedSecret = req.headers.get("X-Cron-Secret");
  if (!providedSecret) return json(401, { error: "Missing X-Cron-Secret header" });
  if (providedSecret !== CRON_SECRET) return json(403, { error: "Invalid cron secret" });

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  if (!body.puppy_id) return json(400, { error: "puppy_id is required" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: puppy, error: puppyErr } = await supabase
    .from("puppies")
    .select("id, name, breed, slug, status")
    .eq("id", body.puppy_id)
    .maybeSingle();
  if (puppyErr) return json(500, { error: "Failed to load puppy", details: puppyErr.message });
  if (!puppy) return json(404, { error: "Puppy not found" });
  if (puppy.status !== "Available") {
    return json(200, { ok: true, skipped: "puppy is not Available", matched: 0, sent: 0 });
  }

  // Match on breed only — a signup with no breed preference matches every
  // puppy. Size-interest is buyer intent captured as free text and isn't
  // reliably comparable to a specific puppy without a canonical size field,
  // so it's shown to the operator but not used as a hard filter here.
  const { data: signups, error: signupsErr } = await supabase
    .from("waitlist_signups")
    .select("id, email, breed_interest")
    .or(`breed_interest.is.null,breed_interest.eq.${puppy.breed}`);
  if (signupsErr) {
    return json(500, { error: "Failed to load waitlist signups", details: signupsErr.message });
  }

  const puppyUrl = `${PUBLIC_SITE_URL}/puppies/${puppy.slug ?? puppy.id}`;
  let sent = 0;
  let failed = 0;
  for (const signup of signups ?? []) {
    if (!signup.email) continue;
    const tpl = waitlistPuppyMatch({ puppyName: puppy.name, breed: puppy.breed, puppyUrl });
    const r = await sendEmail({
      to: signup.email,
      subject: tpl.subject,
      html: tpl.html,
      summary: `Waitlist match emailed — ${puppy.name} (${puppy.breed}) to ${signup.email}`,
    });
    if (r.ok) sent++;
    else {
      failed++;
      console.error(`notify-waitlist-new-puppy: send failed for ${signup.email}:`, r.error);
    }
  }

  const admins = getAdminRecipients();
  if (admins.length > 0 && (signups?.length ?? 0) > 0) {
    await sendEmail({
      to: admins,
      subject: `Waitlist notified — ${puppy.name} (${puppy.breed})`,
      html: `<p>${sent} of ${signups?.length ?? 0} waitlist signups emailed about ${puppy.name} (${puppy.breed}). ${failed} failed.</p>`,
      summary: `Admin notified — waitlist blast for ${puppy.name}`,
    });
  }

  return json(200, { ok: true, matched: signups?.length ?? 0, sent, failed });
});
