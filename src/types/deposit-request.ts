/** Deposit request lifecycle status — state machine enforced at DB level. */
export type DepositRequestStatus =
  | "pending"
  | "accepted"
  | "deposit_link_sent"
  | "converted"
  | "declined";

/** Whether the request came from the public form or was created by admin. */
export type DepositRequestOrigin = "public_form" | "admin_initiated";

/** Valid delivery channels for the deposit link. */
export type DepositRequestChannel = "email" | "sms";

export interface DepositRequest {
  id: string;

  // Customer info
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_phone_e164: string | null;
  city: string | null;
  state: string | null;

  // Litter / puppy context
  upcoming_litter_id: string | null;
  upcoming_litter_label: string | null;
  upcoming_puppy_placeholder_id: string | null;
  upcoming_puppy_placeholder_summary: string | null;
  puppy_id: string | null;
  puppy_name: string | null;

  // Request details
  preferred_payment_method: string | null;
  proposed_pickup_date: string | null;
  spoke_with: string | null;
  how_heard: string | null;
  how_heard_referral_name: string | null;

  // Lifecycle
  request_status: DepositRequestStatus;
  origin: DepositRequestOrigin;

  // Link + delivery
  deposit_link_url: string | null;
  deposit_link_sent_at: string | null;
  deposit_link_sent_via: DepositRequestChannel[] | null;
  email_sent_at: string | null;
  sms_sent_at: string | null;
  sms_delivery_status: string | null;

  // Conversion
  deposit_agreement_id: string | null;
  converted_at: string | null;

  // Admin workflow
  admin_notes: string | null;
  admin_reviewed_at: string | null;
  decline_reason: string | null;

  created_at: string;
  updated_at: string;
}

export interface DepositRequestCounts {
  pending: number;
  accepted: number;
  deposit_link_sent: number;
  converted: number;
  declined: number;
}
