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
    .select('*, upcoming_litter:upcoming_litter_id(id, dam_name, sire_name, date_of_birth)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Puppy[];
}

export async function deletePuppy(id: string): Promise<void> {
  const { error } = await supabase.from('puppies').delete().eq('id', id);
  if (error) throw error;
}

/** Category label for the business expense recorded when a puppy is marked deceased. */
export const DEATH_EXPENSE_CATEGORY = 'death';

/**
 * Record (or correct) the business expense tied to a puppy's death.
 *
 * Idempotent: at most one death-category row exists per puppy, so re-saving the
 * record updates the existing cost rather than stacking duplicates. A cost of 0
 * (or less) removes any prior death expense — i.e. the operator went back and
 * said there was no cost after all. Writes go through the admin-only RLS on
 * puppy_expenses (admin_insert/update/delete policies).
 */
export async function upsertPuppyDeathExpense(puppyId: string, cost: number): Promise<void> {
  const { data: existing, error: selErr } = await supabase
    .from('puppy_expenses')
    .select('id')
    .eq('puppy_id', puppyId)
    .eq('category', DEATH_EXPENSE_CATEGORY)
    .maybeSingle();
  if (selErr) throw selErr;

  if (cost <= 0) {
    if (existing) {
      const { error } = await supabase.from('puppy_expenses').delete().eq('id', existing.id);
      if (error) throw error;
    }
    return;
  }

  if (existing) {
    const { error } = await supabase.from('puppy_expenses').update({ cost }).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('puppy_expenses').insert([
      { puppy_id: puppyId, category: DEATH_EXPENSE_CATEGORY, cost, description: 'Loss / death-related cost' },
    ]);
    if (error) throw error;
  }
}

/** Fetch the recorded death-expense cost for a puppy, or null if none. */
export async function fetchPuppyDeathExpense(puppyId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('puppy_expenses')
    .select('cost')
    .eq('puppy_id', puppyId)
    .eq('category', DEATH_EXPENSE_CATEGORY)
    .maybeSingle();
  if (error) throw error;
  return data ? Number(data.cost) : null;
}
