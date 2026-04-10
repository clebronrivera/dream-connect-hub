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
}

/** Submit a new deposit agreement (buyer-facing) */
export async function submitDepositAgreement(payload: CreateDepositPayload): Promise<DepositAgreement> {
  const { data, error } = await supabase
    .from('deposit_agreements')
    .insert({
      ...payload,
      agreement_status: 'sent',
      deposit_status: 'pending',
      buyer_signed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as DepositAgreement;
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
    .select('id, breed, deposit_amount, price_label, due_label, date_of_birth')
    .eq('id', litterId)
    .single();

  if (error) throw error;
  return data;
}
