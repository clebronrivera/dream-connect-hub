// Admin insights — fetch wrappers for the views and RPC defined in
// supabase/migrations/20260512000000_admin_insights_views.sql.

import { supabase } from '@/lib/supabase-client';

// ---------- Types ---------------------------------------------------------

export interface KpiSummary {
  revenue_ytd: number;
  revenue_last_30d: number;
  revenue_prev_30d: number;
  expenses_ytd: number;
  expenses_last_30d: number;
  expenses_total: number;
  net_ytd: number;
  pipeline_value: number;
  active_reservations_count: number;
  available_inventory_count: number;
  available_inventory_value: number;
  next_90d_projection: number;
  next_12mo_projection: number;
  request_to_complete_conversion: number | null;
}

export interface RevenueMonthlyRow {
  month: string;                          // 'YYYY-MM-DD' (first of month)
  deposits_collected_count: number;
  deposits_collected_amount: number;
  balances_collected_count: number;
  balances_collected_amount: number;
  total_collected_amount: number;
}

export type PipelineStageKey =
  | 'request_pending'
  | 'request_accepted'
  | 'request_link_sent'
  | 'agreement_sent_unpaid'
  | 'agreement_deposit_confirmed'
  | 'agreement_admin_approved'
  | 'agreement_complete';

export interface PipelineRow {
  display_order: number;
  stage_key: PipelineStageKey;
  stage_label: string;
  count: number;
  total_dollars: number | null;
}

export interface BreedPerfRow {
  breed: string;
  available_count: number;
  reserved_count: number;
  sold_count: number;
  inquiry_count: number;
  total_revenue_collected: number;
  avg_sale_price: number | null;
  conversion_rate: number | null;       // 0..1, or null if no inquiries
}

export type ProjectionConfidence = 'committed' | 'projected';

export interface ProjectionRow {
  month: string;                          // 'YYYY-MM-DD' (first of month)
  from_reserved_count: number;
  from_reserved_amount: number;
  from_available_count: number;
  from_available_amount: number;
  from_upcoming_count: number;
  from_upcoming_amount: number;
  confidence: ProjectionConfidence;
}

export type AgingActionKind =
  | 'request_stale'
  | 'agreement_unpaid_stale'
  | 'reservation_pickup_overdue';

export interface AgingActionRow {
  kind: AgingActionKind;
  id: string;
  label: string;
  created_at: string;
  days_stale: number;
  dollars: number | null;
  link_path: string;
}

// ---------- Helpers -------------------------------------------------------

function asNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asNullableNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------- Fetch fns -----------------------------------------------------

export async function fetchKpiSummary(): Promise<KpiSummary> {
  const { data, error } = await supabase
    .from('v_admin_kpi_summary')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    revenue_ytd: asNumber(row.revenue_ytd),
    revenue_last_30d: asNumber(row.revenue_last_30d),
    revenue_prev_30d: asNumber(row.revenue_prev_30d),
    expenses_ytd: asNumber(row.expenses_ytd),
    expenses_last_30d: asNumber(row.expenses_last_30d),
    expenses_total: asNumber(row.expenses_total),
    net_ytd: asNumber(row.net_ytd),
    pipeline_value: asNumber(row.pipeline_value),
    active_reservations_count: asNumber(row.active_reservations_count),
    available_inventory_count: asNumber(row.available_inventory_count),
    available_inventory_value: asNumber(row.available_inventory_value),
    next_90d_projection: asNumber(row.next_90d_projection),
    next_12mo_projection: asNumber(row.next_12mo_projection),
    request_to_complete_conversion: asNullableNumber(row.request_to_complete_conversion),
  };
}

export async function fetchRevenueMonthly(): Promise<RevenueMonthlyRow[]> {
  const { data, error } = await supabase
    .from('v_admin_revenue_monthly')
    .select('*')
    .order('month', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    month: String(r.month ?? ''),
    deposits_collected_count: asNumber(r.deposits_collected_count),
    deposits_collected_amount: asNumber(r.deposits_collected_amount),
    balances_collected_count: asNumber(r.balances_collected_count),
    balances_collected_amount: asNumber(r.balances_collected_amount),
    total_collected_amount: asNumber(r.total_collected_amount),
  }));
}

export async function fetchPipelineFunnel(): Promise<PipelineRow[]> {
  const { data, error } = await supabase
    .from('v_admin_pipeline_funnel')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    display_order: asNumber(r.display_order),
    stage_key: String(r.stage_key ?? '') as PipelineStageKey,
    stage_label: String(r.stage_label ?? ''),
    count: asNumber(r.count),
    total_dollars: asNullableNumber(r.total_dollars),
  }));
}

export async function fetchBreedPerformance(): Promise<BreedPerfRow[]> {
  const { data, error } = await supabase
    .from('v_admin_breed_performance')
    .select('*');
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    breed: String(r.breed ?? ''),
    available_count: asNumber(r.available_count),
    reserved_count: asNumber(r.reserved_count),
    sold_count: asNumber(r.sold_count),
    inquiry_count: asNumber(r.inquiry_count),
    total_revenue_collected: asNumber(r.total_revenue_collected),
    avg_sale_price: asNullableNumber(r.avg_sale_price),
    conversion_rate: asNullableNumber(r.conversion_rate),
  }));
}

export async function fetchForwardProjection(): Promise<ProjectionRow[]> {
  const { data, error } = await supabase
    .from('v_admin_forward_projection')
    .select('*')
    .order('month', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    month: String(r.month ?? ''),
    from_reserved_count: asNumber(r.from_reserved_count),
    from_reserved_amount: asNumber(r.from_reserved_amount),
    from_available_count: asNumber(r.from_available_count),
    from_available_amount: asNumber(r.from_available_amount),
    from_upcoming_count: asNumber(r.from_upcoming_count),
    from_upcoming_amount: asNumber(r.from_upcoming_amount),
    confidence: (r.confidence === 'committed' ? 'committed' : 'projected') as ProjectionConfidence,
  }));
}

export async function fetchAgingActions(): Promise<AgingActionRow[]> {
  const { data, error } = await supabase.rpc('get_aging_action_items');
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    kind: String(r.kind ?? '') as AgingActionKind,
    id: String(r.id ?? ''),
    label: String(r.label ?? ''),
    created_at: String(r.created_at ?? ''),
    days_stale: asNumber(r.days_stale),
    dollars: asNullableNumber(r.dollars),
    link_path: String(r.link_path ?? ''),
  }));
}
