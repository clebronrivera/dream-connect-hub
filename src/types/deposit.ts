// src/types/deposit.ts
import type { AuthorizedSellerId, PaymentMethodKey } from '@/lib/constants/deposit';

export interface SplitPaymentDetail {
  method: PaymentMethodKey;
  amount: number;
}

export interface DepositAgreement {
  id: string;
  agreement_number: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  buyer_address?: string;
  puppy_id?: string;
  litter_id?: string;
  puppy_name: string;
  breed?: string;
  puppy_dob?: string; // ISO date string
  purchase_price: number;
  deposit_tier: 'pre_8_weeks' | 'post_8_weeks';
  deposit_amount: number;
  balance_due: number; // GENERATED
  deposit_payment_method: PaymentMethodKey;
  deposit_payment_detail?: SplitPaymentDetail[];
  final_payment_method_intended?: PaymentMethodKey;
  payment_memo: string; // GENERATED
  deposit_status: 'pending' | 'admin_confirmed' | 'rejected' | 'refunded';
  agreement_status: 'sent' | 'buyer_signed' | 'admin_approved' | 'complete' | 'cancelled';
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
  // Finalization
  admin_approved_at?: string;
  payment_confirmed_at?: string;
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
  final_payment_detail?: SplitPaymentDetail[];
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
