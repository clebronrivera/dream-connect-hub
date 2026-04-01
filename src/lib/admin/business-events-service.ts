import { supabase } from '@/lib/supabase-client';

export interface BusinessEventRow {
  id: string;
  event_date: string;
  description: string;
  category: string | null;
  created_at: string;
}

export async function fetchBusinessEvents(): Promise<BusinessEventRow[]> {
  const { data, error } = await supabase
    .from('business_events')
    .select('id, event_date, description, category, created_at')
    .order('event_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BusinessEventRow[];
}

export async function createBusinessEvent(payload: {
  event_date: string;
  description: string;
  category: string | null;
}): Promise<void> {
  const { error } = await supabase.from('business_events').insert(payload);
  if (error) throw error;
}

export async function deleteBusinessEvent(id: string): Promise<void> {
  const { error } = await supabase.from('business_events').delete().eq('id', id);
  if (error) throw error;
}
