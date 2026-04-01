import { supabase } from '@/lib/supabase-client';
import type { BreedingDog } from '@/lib/supabase';

export async function fetchBreedingDog(id: string): Promise<BreedingDog> {
  const { data, error } = await supabase
    .from('breeding_dogs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as BreedingDog;
}

export async function createBreedingDog(
  payload: Record<string, unknown>
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('breeding_dogs')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function updateBreedingDog(
  id: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('breeding_dogs')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteBreedingDog(id: string): Promise<void> {
  const { error } = await supabase.from('breeding_dogs').delete().eq('id', id);
  if (error) throw error;
}
