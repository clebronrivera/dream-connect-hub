// src/lib/deposit-service.ts
// Public-facing Supabase calls for deposit agreements

import { supabase } from '@/lib/supabase-client';
import type { DepositAgreement, PaymentMethodConfig, SplitPaymentDetail } from '@/types/deposit';
import type { PaymentMethodKey, AuthorizedSellerId } from '@/lib/constants/deposit';

export interface CreateDepositPayload {
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  buyer_address?: string;
  puppy_id?: string;
  litter_id?: string;
  puppy_name: string;
  breed?: string;
  puppy_dob?: string;
  purchase_price: number;
  deposit_tier: 'pre_8_weeks' | 'post_8_weeks';
  deposit_amount: number;
  deposit_payment_method: PaymentMethodKey;
  deposit_payment_detail?: SplitPaymentDetail[];
  final_payment_method_intended?: PaymentMethodKey;
  proposed_pickup_date: string;
  authorized_seller: AuthorizedSellerId;
  full_pay_flow?: boolean;
  buyer_signature_text: string;
  buyer_signature_font?: string;
  /** Optional — links this agreement back to the deposit_requests row that initiated it. */
  deposit_request_id?: string;
}

/** Submit a new deposit agreement (buyer-facing). If deposit_request_id is set,
 * also updates the originating deposit_requests row to 'converted'. */
export async function submitDepositAgreement(payload: CreateDepositPayload): Promise<DepositAgreement> {
  const { deposit_request_id, ...agreementFields } = payload;

  // Pre-flight: if a request is being linked, make sure it isn't already converted.
  // This gives a clearer client-side error than the unique partial index would.
  if (deposit_request_id) {
    const { data: existingRequest } = await supabase
      .from('deposit_requests')
      .select('request_status, deposit_agreement_id')
      .eq('id', deposit_request_id)
      .maybeSingle();
    if (existingRequest?.request_status === 'converted' || existingRequest?.deposit_agreement_id) {
      throw new Error('This deposit request has already been converted to an agreement.');
    }
  }

  const { data, error } = await supabase
    .from('deposit_agreements')
    .insert({
      ...agreementFields,
      deposit_request_id: deposit_request_id ?? null,
      agreement_status: 'sent',
      deposit_status: 'pending',
      buyer_signed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // The originating deposit_request is marked 'converted' by the
  // link_deposit_agreement_to_request() trigger (migration
  // 20260422000000) — anon clients can't UPDATE deposit_requests
  // under RLS, so the link is performed server-side.

  return data as DepositAgreement;
}

/**
 * Validate a deposit request link. Returns the request if valid (status is
 * deposit_link_sent and the litter matches), otherwise null.
 * Used by DepositAgreement page to warn customers when a link is stale.
 */
export async function validateDepositRequest(
  requestId: string,
  expectedLitterId?: string
): Promise<{ valid: boolean; reason?: string }> {
  const { data, error } = await supabase
    .from('deposit_requests')
    .select('id, request_status, upcoming_litter_id, deposit_agreement_id')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, reason: 'Request not found' };
  }
  if (data.request_status === 'converted' || data.deposit_agreement_id) {
    return { valid: false, reason: 'Request already converted' };
  }
  if (data.request_status !== 'deposit_link_sent') {
    return { valid: false, reason: `Request status is ${data.request_status}` };
  }
  if (expectedLitterId && data.upcoming_litter_id !== expectedLitterId) {
    return { valid: false, reason: 'Litter mismatch' };
  }
  return { valid: true };
}

/** Fetch enabled payment methods for the deposit form */
export async function fetchEnabledPaymentMethods(): Promise<PaymentMethodConfig[]> {
  const { data, error } = await supabase
    .from('payment_methods_config')
    .select('*')
    .eq('is_enabled', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PaymentMethodConfig[];
}

/** Fetch puppy details for deposit form pre-fill */
export async function fetchPuppyForDeposit(puppyId: string) {
  const { data, error } = await supabase
    .from('puppies')
    .select('id, name, breed, date_of_birth, base_price, final_price, status, primary_photo')
    .eq('id', puppyId)
    .single();

  if (error) throw error;
  return data;
}

/** Fetch upcoming litter details for deposit form pre-fill */
export async function fetchLitterForDeposit(litterId: string) {
  const { data, error } = await supabase
    .from('upcoming_litters')
    .select(
      'id, breed, deposit_amount, price_label, due_label, date_of_birth, expected_whelping_date, breeding_date'
    )
    .eq('id', litterId)
    .single();

  if (error) throw error;
  return data;
}
