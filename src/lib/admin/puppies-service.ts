import { supabase } from '@/lib/supabase-client';
import type { Puppy } from '@/lib/supabase';

export async function fetchAdminPuppy(id: string): Promise<Puppy> {
  const { data, error } = await supabase.from('puppies').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Puppy;
}

export async function fetchPuppyNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from('puppies')
    .select('name')
    .not('name', 'is', null);
  if (error) throw error;
  return (data ?? []).map((r: { name: string }) => r.name).filter(Boolean);
}

export async function updatePuppy(
  id: string,
  payload: Record<string, unknown>
): Promise<Puppy> {
  const { data, error } = await supabase
    .from('puppies')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Puppy;
}

export async function createPuppy(payload: Record<string, unknown>): Promise<Puppy> {
  const { data, error } = await supabase
    .from('puppies')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data as Puppy;
}

export async function fetchAdminPuppies(): Promise<Puppy[]> {
  const { data, error } = await supabase
    .from('puppies')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Puppy[];
}

export async function deletePuppy(id: string): Promise<void> {
  const { error } = await supabase.from('puppies').delete().eq('id', id);
  if (error) throw error;
}
