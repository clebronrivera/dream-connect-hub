import type { Puppy } from '@/lib/supabase';
import { normalizeBreedToCanonical, isMainBreed, OTHER_BREED_OPTION } from '@/lib/breed-utils';
import type { PuppyFormValues } from './puppy-form-schema';

/** Base defaults for a new puppy form. Evaluated at call time so listing_date is always today. */
export function getPuppyFormDefaults(): Partial<PuppyFormValues> {
  return {
    breed_select: '',
    other_breed: '',
    status: 'Available',
    listing_date: new Date().toISOString().slice(0, 10),
    discount_active: false,
    health_certificate: false,
    featured: false,
    display_order: 0,
    photos: [],
  };
}

/** Map a fetched Puppy row back to form values for edit mode. */
export function puppyToFormValues(puppy: Puppy): PuppyFormValues {
  const savedBreed = (puppy.breed || '').trim();
  const canonical = normalizeBreedToCanonical(savedBreed);
  const useMainBreed = isMainBreed(savedBreed);
  return {
    name: puppy.name || '',
    puppy_id: puppy.puppy_id || '',
    breed_select: useMainBreed ? canonical : OTHER_BREED_OPTION,
    other_breed: useMainBreed ? '' : savedBreed,
    listing_date:
      puppy.listing_date ??
      (puppy.created_at ? puppy.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    gender: puppy.gender,
    color: puppy.color || '',
    date_of_birth: puppy.date_of_birth || '',
    age_weeks: puppy.age_weeks,
    ready_date: puppy.ready_date || '',
    base_price: puppy.base_price,
    discount_active: puppy.discount_active || false,
    discount_amount: puppy.discount_amount,
    discount_note: puppy.discount_note || '',
    final_price: puppy.final_price,
    status: puppy.status || 'Available',
    description: puppy.description || '',
    mom_weight_approx: puppy.mom_weight_approx,
    dad_weight_approx: puppy.dad_weight_approx,
    vaccinations: puppy.vaccinations || '',
    health_certificate: puppy.health_certificate || false,
    featured: puppy.featured || false,
    display_order: puppy.display_order || 0,
    primary_photo: puppy.primary_photo || '',
    photos: puppy.photos || [],
  };
}
