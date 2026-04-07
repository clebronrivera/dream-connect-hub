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
      payload.interest_options?.length > 0 ? payload.interest_options : null,
  };
}

/** Insert a contact message. Single place for all contact_messages inserts. */
export async function insertContactMessage(
  row: ContactMessageInsert
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("contact_messages").insert([row]);
  return { error: error ?? null };
}
