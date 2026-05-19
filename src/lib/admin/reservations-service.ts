// Unified data layer for the /admin/reservations page.
//
// A "reservation" is the customer-facing concept that spans both the
// `deposit_requests` table (admin has initiated, buyer hasn't signed) and
// the `deposit_agreements` table (buyer signed; in payment / pickup
// fulfillment). We fetch both, dedupe on the converted/agreement
// relationship, and stamp a unified status so the admin sees one timeline
// regardless of which underlying table holds the row.

import { supabase } from '@/lib/supabase-client';
import type { DepositAgreement } from '@/types/deposit';
import type { DepositRequest } from '@/types/deposit-request';

export type ReservationStatus =
  | 'awaiting_review'     // deposit_request pending (legacy public intake only)
  | 'link_ready'          // deposit_request accepted, link not yet emailed
  | 'link_sent'           // deposit_request deposit_link_sent, buyer hasn't completed wizard
  | 'needs_countersign'   // agreement_status='sent' (wizard submitted; awaiting admin sign + payment confirm)
  | 'awaiting_payment'    // agreement_status='admin_approved' AND deposit_status='pending'
  | 'payment_confirmed'   // agreement_status='admin_approved' AND deposit_status='admin_confirmed'
  | 'picked_up'           // agreement_status='complete' (handover finalised in PR 5)
  | 'cancelled';          // declined / cancelled / rejected / refunded — terminal

export interface Reservation {
  kind: 'request' | 'agreement';
  /** Stable id for routing / keys — request UUID or agreement UUID. */
  id: string;
  /** Display label for the row (#DEP-xxxxx for requests, DP-NNNN for agreements). */
  displayId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  puppyName: string | null;
  breed: string | null;
  /** Deposit amount when known; null while we're pre-acceptance. */
  amount: number | null;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  /** Underlying row (carries everything the detail panel might need). */
  agreement: DepositAgreement | null;
  request: DepositRequest | null;
}

export interface ReservationCounts {
  awaiting_review: number;
  link_ready: number;
  link_sent: number;
  needs_countersign: number;
  awaiting_payment: number;
  payment_confirmed: number;
  picked_up: number;
  cancelled: number;
  total: number;
}

/** Stamp a reservation status from a deposit_agreement row. */
function statusFromAgreement(a: DepositAgreement): ReservationStatus {
  if (a.agreement_status === 'cancelled' || a.deposit_status === 'rejected' || a.deposit_status === 'refunded') {
    return 'cancelled';
  }
  if (a.agreement_status === 'complete') return 'picked_up';
  if (a.agreement_status === 'admin_approved') {
    return a.deposit_status === 'admin_confirmed' ? 'payment_confirmed' : 'awaiting_payment';
  }
  // status === 'sent'
  return 'needs_countersign';
}

/** Stamp a reservation status from a deposit_request row (only used pre-conversion). */
function statusFromRequest(r: DepositRequest): ReservationStatus {
  if (r.request_status === 'declined') return 'cancelled';
  if (r.request_status === 'deposit_link_sent') return 'link_sent';
  if (r.request_status === 'accepted') return 'link_ready';
  if (r.request_status === 'pending') return 'awaiting_review';
  // 'converted' rows are excluded from the unified list (the linked agreement shows instead).
  return 'awaiting_review';
}

function shortDepId(id: string): string {
  return `#DEP-${id.slice(0, 8).toUpperCase()}`;
}

/**
 * Pull both tables and merge into a unified list. Agreements take
 * precedence over their originating request — a request that has already
 * been `converted` is dropped from the merged list because the
 * corresponding agreement now represents that reservation.
 */
export async function fetchReservations(): Promise<Reservation[]> {
  const [agreementsRes, requestsRes] = await Promise.all([
    supabase.from('deposit_agreements').select('*').order('created_at', { ascending: false }),
    supabase
      .from('deposit_requests')
      .select('*')
      .neq('request_status', 'converted')
      .order('created_at', { ascending: false }),
  ]);
  if (agreementsRes.error) throw agreementsRes.error;
  if (requestsRes.error) throw requestsRes.error;

  const agreements = (agreementsRes.data ?? []) as DepositAgreement[];
  const requests = (requestsRes.data ?? []) as DepositRequest[];

  // Build a set of request ids already represented by an agreement so we
  // don't double-count post-conversion rows (in case the trigger lagged).
  const linkedRequestIds = new Set<string>();
  // deposit_request_id lives on the agreement row when it was wizard-converted.
  for (const a of agreements) {
    const linked = (a as DepositAgreement & { deposit_request_id?: string | null }).deposit_request_id;
    if (linked) linkedRequestIds.add(linked);
  }

  const reservations: Reservation[] = [];

  for (const a of agreements) {
    reservations.push({
      kind: 'agreement',
      id: a.id,
      displayId: a.agreement_number,
      buyerName: a.buyer_name,
      buyerEmail: a.buyer_email,
      buyerPhone: a.buyer_phone,
      puppyName: a.puppy_name,
      breed: a.breed ?? null,
      amount: a.deposit_amount,
      status: statusFromAgreement(a),
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      agreement: a,
      request: null,
    });
  }

  for (const r of requests) {
    if (linkedRequestIds.has(r.id)) continue;
    reservations.push({
      kind: 'request',
      id: r.id,
      displayId: shortDepId(r.id),
      buyerName: r.customer_name,
      buyerEmail: r.customer_email,
      buyerPhone: r.customer_phone,
      puppyName: r.puppy_name ?? r.upcoming_puppy_placeholder_summary ?? null,
      breed: r.upcoming_litter_label ?? null,
      amount: null,
      status: statusFromRequest(r),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      agreement: null,
      request: r,
    });
  }

  reservations.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return reservations;
}

/** Count reservations per status bucket. */
export function tallyReservations(rows: Reservation[]): ReservationCounts {
  const counts: ReservationCounts = {
    awaiting_review: 0,
    link_ready: 0,
    link_sent: 0,
    needs_countersign: 0,
    awaiting_payment: 0,
    payment_confirmed: 0,
    picked_up: 0,
    cancelled: 0,
    total: rows.length,
  };
  for (const r of rows) counts[r.status] += 1;
  return counts;
}

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  awaiting_review: 'Awaiting review',
  link_ready: 'Link ready to send',
  link_sent: 'Buyer is filling out wizard',
  needs_countersign: 'Needs countersignature',
  awaiting_payment: 'Awaiting payment',
  payment_confirmed: 'Payment confirmed',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
};

export const STATUS_TONE: Record<ReservationStatus, 'amber' | 'blue' | 'green' | 'gray'> = {
  awaiting_review: 'amber',
  link_ready: 'amber',
  link_sent: 'blue',
  needs_countersign: 'amber',
  awaiting_payment: 'amber',
  payment_confirmed: 'green',
  picked_up: 'green',
  cancelled: 'gray',
};
