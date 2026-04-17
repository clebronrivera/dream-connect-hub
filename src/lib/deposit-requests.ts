import { supabase } from "@/lib/supabase";

/**
 * Payload shape for a public deposit request submission.
 * Mirrors DepositRequestForm output.
 */
export interface DepositRequestPayload {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  city: string;
  state: string;
  upcoming_litter_id: string | null;
  upcoming_litter_label: string | null;
  upcoming_puppy_placeholder_id: string | null;
  upcoming_puppy_placeholder_summary: string | null;
  puppy_id: string | null;
  puppy_name: string | null;
  preferred_payment_method: string | null;
  proposed_pickup_date: string | null;
  spoke_with: string | null;
  how_heard: string | null;
  how_heard_referral_name: string | null;
}

/**
 * Row shape for inserting into deposit_requests as a public user.
 * The RLS policy enforces that all system-/admin-managed fields stay null —
 * so only these public-safe fields are allowed.
 */
export interface DepositRequestInsert {
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  city: string | null;
  state: string | null;
  upcoming_litter_id: string | null;
  upcoming_litter_label: string | null;
  upcoming_puppy_placeholder_id: string | null;
  upcoming_puppy_placeholder_summary: string | null;
  puppy_id: string | null;
  puppy_name: string | null;
  preferred_payment_method: string | null;
  proposed_pickup_date: string | null;
  spoke_with: string | null;
  how_heard: string | null;
  how_heard_referral_name: string | null;
}

export function depositRequestPayloadToRow(
  payload: DepositRequestPayload
): DepositRequestInsert {
  return {
    customer_name: payload.customer_name,
    customer_email: payload.customer_email,
    customer_phone: payload.customer_phone || null,
    city: payload.city || null,
    state: payload.state || null,
    upcoming_litter_id: payload.upcoming_litter_id,
    upcoming_litter_label: payload.upcoming_litter_label,
    upcoming_puppy_placeholder_id: payload.upcoming_puppy_placeholder_id,
    upcoming_puppy_placeholder_summary: payload.upcoming_puppy_placeholder_summary,
    puppy_id: payload.puppy_id,
    puppy_name: payload.puppy_name,
    preferred_payment_method: payload.preferred_payment_method,
    proposed_pickup_date: payload.proposed_pickup_date,
    spoke_with: payload.spoke_with,
    how_heard: payload.how_heard,
    how_heard_referral_name: payload.how_heard_referral_name,
  };
}

/**
 * Insert a deposit request from the public form. RLS enforces that
 * request_status='pending' and origin='public_form' (the defaults) and that
 * no privileged fields are populated.
 */
export async function insertDepositRequest(
  row: DepositRequestInsert
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("deposit_requests").insert([row]);
  return { error: error ?? null };
}

/** Light client-side US phone validation — 10 or 11 digits after stripping non-digits. */
export function isValidUsPhone(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith("1")) return true;
  return false;
}
