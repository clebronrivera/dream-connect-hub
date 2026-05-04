import { supabase } from "@/lib/supabase";

/** Row shape for inserting into contact_messages (omit id, created_at). */
export interface ContactMessageInsert {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  upcoming_litter_id?: string | null;
  upcoming_litter_label?: string | null;
  upcoming_puppy_placeholder_id?: string | null;
  upcoming_puppy_placeholder_summary?: string | null;
  city?: string | null;
  state?: string | null;
  interest_options?: string[] | null;
}

/** Map UpcomingLitterInquiryForm payload to contact_messages insert row. */
export function upcomingLitterPayloadToRow(payload: {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  subject: string;
  message: string;
  upcoming_litter_id: string | null;
  upcoming_litter_label: string | null;
  upcoming_puppy_placeholder_id?: string | null;
  upcoming_puppy_placeholder_summary?: string | null;
  interest_options?: string[];
}): ContactMessageInsert {
  return {
    name: payload.name,
    email: payload.email,
    phone: payload.phone || null,
    city: payload.city || null,
    state: payload.state || null,
    subject: payload.subject,
    message: payload.message,
    upcoming_litter_id: payload.upcoming_litter_id,
    upcoming_litter_label: payload.upcoming_litter_label,
    upcoming_puppy_placeholder_id: payload.upcoming_puppy_placeholder_id ?? null,
    upcoming_puppy_placeholder_summary:
      payload.upcoming_puppy_placeholder_summary ?? null,
    interest_options:
      (payload.interest_options?.length ?? 0) > 0
        ? payload.interest_options ?? null
        : null,
  };
}

/**
 * Insert a contact message via the captcha-gated `submit-contact-message`
 * edge function. The edge function validates the Turnstile token and then
 * inserts the row using the service role; the downstream
 * `notify-contact-message` webhook fires on the row insert exactly as it did
 * with the previous direct anon insert path.
 *
 * `turnstileToken` is required in production. Pass `null` only from
 * environments where `VITE_TURNSTILE_SITE_KEY` is not configured (the edge
 * function will then 403 with `secret-not-configured`).
 */
export async function insertContactMessage(
  row: ContactMessageInsert,
  turnstileToken: string | null = null
): Promise<{ error: Error | null }> {
  const { data, error } = await supabase.functions.invoke(
    "submit-contact-message",
    {
      body: { ...row, turnstile_token: turnstileToken },
    }
  );

  if (error) {
    const remoteMessage = (data as { error?: string } | null | undefined)?.error;
    return {
      error: new Error(
        remoteMessage || error.message || "Failed to send message"
      ),
    };
  }
  return { error: null };
}
