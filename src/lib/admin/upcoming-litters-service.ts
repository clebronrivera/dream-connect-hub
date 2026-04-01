import { supabase } from '@/lib/supabase-client';

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
