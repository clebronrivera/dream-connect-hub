import { supabase, type Litter, type Puppy } from '@/lib/supabase';

/**
 * Create a litter from an existing puppy (shared fields only) and link the puppy to it.
 * Returns the new litter id.
 */
export async function createLitterFromPuppy(puppyId: string): Promise<string> {
  const { data: puppy, error: fetchError } = await supabase
    .from('puppies')
    .select('*')
    .eq('id', puppyId)
    .single();

  if (fetchError || !puppy) {
    throw new Error(fetchError?.message ?? 'Puppy not found');
  }

  const litterRow = {
    breed: (puppy as Puppy).breed ?? '',
    listing_date: (puppy as Puppy).listing_date ?? null,
    date_of_birth: (puppy as Puppy).date_of_birth ?? null,
    ready_date: (puppy as Puppy).ready_date ?? null,
    base_price: (puppy as Puppy).base_price ?? 0,
    mom_weight_lbs: (puppy as Puppy).mom_weight_approx ?? null,
    dad_weight_lbs: (puppy as Puppy).dad_weight_approx ?? null,
    vaccinations: (puppy as Puppy).vaccinations ?? null,
    health_certificate_default: (puppy as Puppy).health_certificate ?? false,
    microchipped_default: true,
    status_default: (puppy as Puppy).status ?? 'Available',
  };

  const { data: litter, error: insertError } = await supabase
    .from('litters')
    .insert([litterRow])
    .select('id')
    .single();

  if (insertError || !litter) {
    throw new Error(insertError?.message ?? 'Failed to create litter');
  }

  const { error: updateError } = await supabase
    .from('puppies')
    .update({ litter_id: litter.id })
    .eq('id', puppyId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return litter.id;
}

export interface CreatePuppyFromLitterOverrides {
  gender: 'Male' | 'Female';
  color?: string;
  name?: string;
  primaryPhoto?: string | null;
}

/**
 * Create a single puppy from litter defaults + overrides.
 * Forces: featured = false, discount_active = false, discount_amount = 0, discount_note = ''.
 * primary_photo = null unless provided; color = '' unless provided.
 */
export async function createPuppyFromLitter(
  litterId: string,
  overrides: CreatePuppyFromLitterOverrides
): Promise<string> {
  const { data: litter, error: fetchError } = await supabase
    .from('litters')
    .select('*')
    .eq('id', litterId)
    .single();

  if (fetchError || !litter) {
    throw new Error(fetchError?.message ?? 'Litter not found');
  }

  const L = litter as Litter;
  const basePrice = L.base_price ?? 0;

  const puppyRow = {
    name: overrides.name?.trim() || 'Littermate',
    breed: L.breed,
    gender: overrides.gender,
    color: overrides.color ?? '',
    listing_date: L.listing_date ?? undefined,
    date_of_birth: L.date_of_birth ?? undefined,
    ready_date: L.ready_date ?? undefined,
    base_price: basePrice,
    discount_active: false,
    discount_amount: 0,
    discount_note: '',
    final_price: basePrice,
    status: L.status_default ?? 'Available',
    mom_weight_approx: L.mom_weight_lbs ?? undefined,
    dad_weight_approx: L.dad_weight_lbs ?? undefined,
    vaccinations: L.vaccinations ?? undefined,
    health_certificate: L.health_certificate_default ?? false,
    microchipped: true,
    featured: false,
    display_order: 0,
    primary_photo: overrides.primaryPhoto ?? null,
    photos: overrides.primaryPhoto ? [overrides.primaryPhoto] : [],
    litter_id: litterId,
  };

  const { data: puppy, error: insertError } = await supabase
    .from('puppies')
    .insert([puppyRow])
    .select('id')
    .single();

  if (insertError || !puppy) {
    throw new Error(insertError?.message ?? 'Failed to create puppy');
  }

  return puppy.id;
}

export interface BulkCreateFromLitterOptions {
  litterId: string;
  counts: { male: number; female: number };
  baseName?: string;
}

/**
 * Create multiple puppies from a litter in one go (male + female counts).
 * Names: baseName + " 1", " 2", ... (default baseName = "Littermate").
 */
export async function bulkCreatePuppiesFromLitter(
  options: BulkCreateFromLitterOptions
): Promise<string[]> {
  const { litterId, counts, baseName = 'Littermate' } = options;
  const total = counts.male + counts.female;
  if (total <= 0) return [];

  const { data: litter, error: fetchError } = await supabase
    .from('litters')
    .select('*')
    .eq('id', litterId)
    .single();

  if (fetchError || !litter) {
    throw new Error(fetchError?.message ?? 'Litter not found');
  }

  const L = litter as Litter;
  const basePrice = L.base_price ?? 0;
  let index = 0;

  const insertRow = (gender: 'Male' | 'Female') => {
    index += 1;
    return {
      name: `${baseName} ${index}`,
      breed: L.breed,
      gender,
      color: '',
      listing_date: L.listing_date ?? undefined,
      date_of_birth: L.date_of_birth ?? undefined,
      ready_date: L.ready_date ?? undefined,
      base_price: basePrice,
      discount_active: false,
      discount_amount: 0,
      discount_note: '',
      final_price: basePrice,
      status: L.status_default ?? 'Available',
      mom_weight_approx: L.mom_weight_lbs ?? undefined,
      dad_weight_approx: L.dad_weight_lbs ?? undefined,
      vaccinations: L.vaccinations ?? undefined,
      health_certificate: L.health_certificate_default ?? false,
      microchipped: true,
      featured: false,
      display_order: 0,
      primary_photo: null,
      photos: [],
      litter_id: litterId,
    };
  };

  const rows: ReturnType<typeof insertRow>[] = [];
  for (let i = 0; i < counts.male; i++) rows.push(insertRow('Male'));
  for (let i = 0; i < counts.female; i++) rows.push(insertRow('Female'));

  const { data: inserted, error: insertError } = await supabase
    .from('puppies')
    .insert(rows)
    .select('id');

  if (insertError) {
    throw new Error(insertError.message);
  }

  return (inserted ?? []).map((p) => p.id);
}

/**
 * Apply current litter defaults to all puppies in this litter (bulk update shared fields).
 */
export async function applyLitterDefaultsToLittermates(litterId: string): Promise<number> {
  const { data: litter, error: fetchError } = await supabase
    .from('litters')
    .select('*')
    .eq('id', litterId)
    .single();

  if (fetchError || !litter) {
    throw new Error(fetchError?.message ?? 'Litter not found');
  }

  const L = litter as Litter;
  const updates = {
    breed: L.breed,
    listing_date: L.listing_date ?? null,
    date_of_birth: L.date_of_birth ?? null,
    ready_date: L.ready_date ?? null,
    base_price: L.base_price ?? 0,
    mom_weight_approx: L.mom_weight_lbs ?? null,
    dad_weight_approx: L.dad_weight_lbs ?? null,
    vaccinations: L.vaccinations ?? null,
    health_certificate: L.health_certificate_default ?? false,
    microchipped: true,
    status: L.status_default ?? 'Available',
  };

  const { data: updated, error: updateError } = await supabase
    .from('puppies')
    .update(updates)
    .eq('litter_id', litterId)
    .select('id');

  if (updateError) {
    throw new Error(updateError.message);
  }

  return updated?.length ?? 0;
}
