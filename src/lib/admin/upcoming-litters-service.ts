import { supabase } from '@/lib/supabase-client';
import type { UpcomingLitter } from '@/lib/supabase';

export async function fetchAdminUpcomingLitters(): Promise<UpcomingLitter[]> {
  const { data, error } = await supabase
    .from('upcoming_litters')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UpcomingLitter[];
}

export async function createUpcomingLitter(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('upcoming_litters').insert(payload);
  if (error) throw error;
}

export async function updateUpcomingLitter(
  id: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('upcoming_litters')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteUpcomingLitter(id: string): Promise<void> {
  const { error } = await supabase.from('upcoming_litters').delete().eq('id', id);
  if (error) throw error;
}
