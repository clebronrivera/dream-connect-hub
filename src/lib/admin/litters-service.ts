import { supabase } from '@/lib/supabase-client';
import type { Litter } from '@/lib/supabase';

export async function fetchLitter(id: string): Promise<Litter> {
  const { data, error } = await supabase
    .from('litters')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Litter;
}

export async function updateLitter(
  id: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('litters').update(payload).eq('id', id);
  if (error) throw error;
}
