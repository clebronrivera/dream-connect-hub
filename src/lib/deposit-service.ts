// src/lib/deposit-service.ts
// Public-facing Supabase calls for deposit agreements

import { supabase } from '@/lib/supabase-client';
import type { DepositAgreement, PaymentMethodConfig } from '@/types/deposit';
import type { PaymentMethodKey, AuthorizedSellerId } from '@/lib/constants/deposit';

export interface CreateDepositPayload {
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
  puppy_dob?: string;
  purchase_price: number;
  deposit_amount: number;
  deposit_payment_method: PaymentMethodKey;
  final_payment_method_intended?: PaymentMethodKey;
  proposed_pickup_date: string;
  authorized_seller: AuthorizedSellerId;
  full_pay_flow?: boolean;
  buyer_signature_text: string;
  buyer_signature_font?: string;
  // Pickup preferences (Wave E / OPD-08).
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
  // Acknowledgment timestamps (Article IX + Wave E E3 H6 clauses).
  ack_full_agreement_at?: string;
  ack_statutory_rights_at?: string;
  ack_esign_valid_at?: string;
  ack_genetic_disclaimer_at?: string;
  ack_arbitration_at?: string;
  ack_age_attestation_at?: string;
  ack_welfare_responsibility_at?: string;
  ack_payment_authorization_at?: string;
  ack_identity_attestation_at?: string;
  ack_pre_dispute_contact_at?: string;
  ack_pickup_acceptance_at?: string;
  // Arbitration (legacy linear-form field; wizard no longer requires the typed phrase).
  arbitration_typed_phrase?: string;
  arbitration_typed_at?: string;
  // Wizard fields (reservation redesign PR 2).
  buyer_initials?: string;
  initials_adopted_at?: string;
  care_comfort_potty?: number;
  care_comfort_grooming?: number;
  care_comfort_health?: number;
  care_comfort_social?: number;
  care_comfort_boundaries?: number;
  payment_mode?: 'deposit_only' | 'full_payment';
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
 * Outcome of validating a deposit-request link. On success, carries the
 * request's puppy/litter context so the deposit form can pre-fill without
 * a second fetch.
 */
export type DepositRequestValidation =
  | { valid: false; reason: string }
  | { valid: true; puppyId: string | null; litterId: string | null };

/**
 * Validate a deposit-request link. The request must exist, not yet be
 * converted, and be in `'deposit_link_sent'` status. Used by DepositAgreement
 * to gate the public form on an operator-issued link.
 */
export async function validateDepositRequest(
  requestId: string
): Promise<DepositRequestValidation> {
  const { data, error } = await supabase
    .from('deposit_requests')
    .select('id, request_status, puppy_id, upcoming_litter_id, deposit_agreement_id')
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
  return {
    valid: true,
    puppyId: data.puppy_id,
    litterId: data.upcoming_litter_id,
  };
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
    .select('id, name, breed, date_of_birth, base_price, final_price, deposit_amount, status, primary_photo')
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
      'id, breed, price_label, due_label, date_of_birth, expected_whelping_date, breeding_date'
    )
    .eq('id', litterId)
    .single();

  if (error) throw error;
  return data;
}
