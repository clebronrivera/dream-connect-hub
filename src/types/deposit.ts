// src/types/deposit.ts
import type { AuthorizedSellerId, PaymentMethodKey } from '@/lib/constants/deposit';

export interface DepositAgreement {
  id: string;
  agreement_number: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  // Structured buyer address (Wave E E1, OPD-05). buyer_address blob retired.
  buyer_street?: string;
  buyer_city?: string;
  buyer_state?: string;
  buyer_zip?: string;
  puppy_id?: string;
  litter_id?: string;
  puppy_name: string;
  breed?: string;
  puppy_dob?: string; // ISO date string
  purchase_price: number;
  deposit_amount: number;
  balance_due: number; // GENERATED
  deposit_payment_method: PaymentMethodKey;
  final_payment_method_intended?: PaymentMethodKey;
  payment_memo: string; // GENERATED
  deposit_status: 'pending' | 'admin_confirmed' | 'rejected' | 'refunded';
  agreement_status: 'sent' | 'admin_approved' | 'complete' | 'cancelled';
  proposed_pickup_date: string; // ISO date
  confirmed_pickup_date?: string;
  pickup_clock_start: string; // GENERATED
  pickup_deadline: string; // GENERATED
  authorized_seller: AuthorizedSellerId;
  full_pay_flow: boolean;
  // Buyer signature
  buyer_signature_text?: string;
  buyer_signature_font?: string;
  buyer_signed_at?: string;
  // Admin signature
  admin_signature_svg?: string;
  admin_signature_name?: string;
  admin_signed_at?: string;
  // Audit trail
  buyer_ip_address?: string;
  buyer_user_agent?: string;
  buyer_signed_server_ts?: string;
  admin_ip_address?: string;
  admin_user_agent?: string;
  admin_signed_server_ts?: string;
  // Acknowledgment timestamps (Article IX + Wave E E3 H6 clauses).
  ack_full_agreement_at?: string;
  ack_statutory_rights_at?: string;
  ack_esign_valid_at?: string;
  ack_genetic_disclaimer_at?: string;
  ack_arbitration_at?: string;
  ack_age_attestation_at?: string;
  ack_welfare_responsibility_at?: string;
  // H6 contract-clause acks (Wave E E3 — option A, FL venue held back).
  ack_payment_authorization_at?: string;
  ack_identity_attestation_at?: string;
  ack_pre_dispute_contact_at?: string;
  ack_pickup_acceptance_at?: string;
  // How-heard (OPD-06).
  how_heard?: string;
  how_heard_referral_name?: string;
  how_heard_other_text?: string;
  // Pickup preferences (OPD-08).
  pickup_time_preference?: 'morning' | 'afternoon' | 'evening';
  pickup_day_preference?: 'weekday' | 'weekend' | 'either';
  pickup_alt_date?: string;
  pickup_alt_time?: 'morning' | 'afternoon' | 'evening';
  pickup_alt_day?: 'weekday' | 'weekend' | 'either';
  pickup_notes?: string;
  // Section 3 questionnaire (OPD-07 — all optional).
  q_first_dog?: string;
  q_living_situation?: string;
  q_hours_alone?: string;
  q_household_members?: string;
  q_puppy_goal?: string;
  q_training_experience?: string;
  // Arbitration
  arbitration_typed_phrase?: string;
  arbitration_typed_at?: string;
  // Warranty
  warranty_illness_expiry?: string;
  warranty_genetic_expiry?: string;
  // Signed PDF
  signed_pdf_storage_path?: string;
  confirmation_email_sent_at?: string;
  confirmation_email_opened_at?: string;
  // Vet visit
  vet_visit_acknowledged?: boolean;
  vet_visit_acknowledged_at?: string;
  // Finalization
  admin_approved_at?: string;
  payment_confirmed_at?: string;
  // Buyer-token surface (Wave D)
  buyer_access_token: string;
  buyer_access_token_expires_at: string;
  buyer_marked_payment_sent_at?: string;
  // Reminders
  reminder_last_sent_at?: string;
  reminder_count: number;
  requires_manual_review: boolean;
  rejection_reason?: string;
  rejection_is_within_window?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FinalSale {
  id: string;
  deposit_agreement_id?: string;
  puppy_final_name?: string;
  full_pay_flow: boolean;
  final_payment_method: PaymentMethodKey;
  final_payment_status: 'pending' | 'admin_confirmed';
  final_payment_confirmed_at?: string;
  pet_guide_generated_at?: string;
  pet_guide_sent_at?: string;
  pet_guide_storage_path?: string;
  sale_complete: boolean;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodConfig {
  id: string;
  method_key: PaymentMethodKey;
  display_name: string;
  is_enabled: boolean;
  qr_code_storage_path?: string;
  qr_code_public_url?: string;
  handle_or_recipient?: string;
  payment_note?: string;
  requires_manual_confirm: boolean;
  display_order: number;
}
