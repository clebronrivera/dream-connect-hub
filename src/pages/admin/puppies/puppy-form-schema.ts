import * as z from 'zod';

/** Coerce null/empty-string to undefined so optional number fields don't fail validation. */
export const optionalNumber = (s: z.ZodNumber) =>
  z.preprocess((v) => (v === null || v === '' ? undefined : v), s.optional());

export const puppySchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    puppy_id: z.string().optional(),
    breed_select: z.string().min(1, 'Please select a breed'),
    other_breed: z.string().optional(),
    listing_date: z.string().optional(),
    // Canonical values are "Male" / "Female"; free-text allowed for the rare
    // edge case via the form's "Other (specify)" escape hatch.
    gender: z.string().optional(),
    color: z.string().optional(),
    coat_type: z.string().optional(),
    date_of_birth: z.string().optional(),
    age_weeks: optionalNumber(z.number()),
    ready_date: z.string().optional(),
    base_price: optionalNumber(z.number().min(0)),
    discount_active: z.boolean().optional(),
    discount_amount: optionalNumber(z.number().min(0)),
    discount_note: z.string().optional(),
    final_price: optionalNumber(z.number().min(0)),
    status: z.enum(['Available', 'Pending', 'Sold', 'Reserved']).default('Available'),
    description: z.string().optional(),
    is_publicly_visible: z.boolean().optional(),
    is_deceased: z.boolean().optional(),
    display_order: optionalNumber(z.number()),
    primary_photo: z.string().optional(),
    photos: z.array(z.string()).optional(),
    reserved_for_customer_id: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.breed_select === 'Other') return !!data.other_breed?.trim();
      return true;
    },
    { message: 'Please enter the other breed', path: ['other_breed'] }
  );

export type PuppyFormValues = z.infer<typeof puppySchema>;
