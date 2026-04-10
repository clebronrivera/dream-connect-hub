// src/lib/admin/agreements-service.ts
// Admin CRUD for deposit agreements

import { supabase } from '@/lib/supabase-client';
import type { DepositAgreement } from '@/types/deposit';

/** Fetch all deposit agreements (admin) */
export async function fetchAgreements(): Promise<DepositAgreement[]> {
  const { data, error } = await supabase
    .from('deposit_agreements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as DepositAgreement[];
}

/** Fetch a single agreement by ID */
export async function fetchAgreement(id: string): Promise<DepositAgreement> {
  const { data, error } = await supabase
    .from('deposit_agreements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as DepositAgreement;
}

/** Confirm deposit payment (admin) */
export async function confirmDepositPayment(id: string): Promise<void> {
  const { error } = await supabase
    .from('deposit_agreements')
    .update({
      deposit_status: 'admin_confirmed',
      payment_confirmed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

/** Save admin signature */
export async function saveAdminSignature(
  id: string,
  signatureData: string,
  sellerName: string
): Promise<void> {
  const { error } = await supabase
    .from('deposit_agreements')
    .update({
      admin_signature_svg: signatureData,
      admin_signature_name: sellerName,
      admin_signed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

/** Finalize agreement (set admin_approved when all 3 conditions met) */
export async function finalizeAgreement(id: string): Promise<void> {
  const { error } = await supabase
    .from('deposit_agreements')
    .update({
      agreement_status: 'admin_approved',
      admin_approved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

/** Confirm pickup date */
export async function confirmPickupDate(id: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('deposit_agreements')
    .update({ confirmed_pickup_date: date })
    .eq('id', id);

  if (error) throw error;
}

/** Update admin notes */
export async function updateAgreementNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('deposit_agreements')
    .update({ notes })
    .eq('id', id);

  if (error) throw error;
}

/** Reject deposit */
export async function rejectDeposit(id: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('deposit_agreements')
    .update({
      deposit_status: 'rejected',
      agreement_status: 'cancelled',
      rejection_reason: reason,
      rejection_is_within_window: true,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Refund deposit */
export async function refundDeposit(id: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('deposit_agreements')
    .update({
      deposit_status: 'refunded',
      agreement_status: 'cancelled',
      rejection_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Cancel agreement */
export async function cancelAgreement(id: string): Promise<void> {
  const { error } = await supabase
    .from('deposit_agreements')
    .update({ agreement_status: 'cancelled' })
    .eq('id', id);

  if (error) throw error;
}

/** Fetch pending action counts for dashboard badges */
export async function fetchPendingActionCounts(): Promise<{
  unconfirmedDeposits: number;
  unsignedBuyers: number;
  manualConfirmPending: number;
  noPickupDate: number;
  manualReview: number;
}> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [r1, r2, r3, r4, r5] = await Promise.all([
    // Badge 1: Unconfirmed deposits > 24hrs
    supabase
      .from('deposit_agreements')
      .select('id', { count: 'exact', head: true })
      .eq('deposit_status', 'pending')
      .lt('created_at', twentyFourHoursAgo),
    // Badge 2: Buyer has not signed > 24hrs
    supabase
      .from('deposit_agreements')
      .select('id', { count: 'exact', head: true })
      .eq('agreement_status', 'sent')
      .is('buyer_signed_at', null)
      .lt('created_at', twentyFourHoursAgo),
    // Badge 3: Cash/Square pending manual confirmation
    supabase
      .from('deposit_agreements')
      .select('id', { count: 'exact', head: true })
      .eq('deposit_status', 'pending')
      .in('deposit_payment_method', ['cash', 'square']),
    // Badge 4: No confirmed pickup date (both signed)
    supabase
      .from('deposit_agreements')
      .select('id', { count: 'exact', head: true })
      .not('buyer_signed_at', 'is', null)
      .not('admin_signed_at', 'is', null)
      .is('confirmed_pickup_date', null),
    // Badge 5: Requires manual review
    supabase
      .from('deposit_agreements')
      .select('id', { count: 'exact', head: true })
      .eq('requires_manual_review', true),
  ]);

  return {
    unconfirmedDeposits: r1.count ?? 0,
    unsignedBuyers: r2.count ?? 0,
    manualConfirmPending: r3.count ?? 0,
    noPickupDate: r4.count ?? 0,
    manualReview: r5.count ?? 0,
  };
}
