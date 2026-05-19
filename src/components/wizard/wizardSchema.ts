// Shared Zod schema + step-field map for the deposit wizard.
// Kept in its own module so the parent host (DepositWizard) and individual
// step components both type-check against the same field set without
// pulling in step-component implementation details.

import { z } from 'zod';

export const WIZARD_STEPS = [
  'payment_choice',
  'disclaimer',
  'about_you',
  'care_guide',
  'adopt_signature',
  'agreement_terms',
  'final_signature',
  'payment_method',
  'final_payment_plan',
  'review',
] as const;

export type WizardStepKey = (typeof WIZARD_STEPS)[number];

// Validation strategy: every field is optional() at the schema level so the
// step gate logic (in DepositWizard) is what enforces per-step requirements
// via .trigger(fieldsByStep[currentStep]). The final review-step submission
// goes through .handleSubmit() which would refuse if any genuinely required
// field is empty — those are marked required individually below.
export const wizardSchema = z.object({
  // Step 1
  payment_mode: z.enum(['deposit_only', 'full_payment'], {
    required_error: 'Choose how you would like to pay',
  }),

  // Step 2
  disclaimer_acknowledged: z.boolean().refine((v) => v === true, {
    message: 'Please acknowledge before continuing',
  }),

  // Step 3
  buyer_name: z.string().min(2, 'Full legal name is required'),
  buyer_email: z.string().email('Valid email is required'),
  buyer_phone: z
    .string()
    .refine((v) => v.replace(/\D/g, '').length >= 10, 'Phone number (10 digits) is required'),
  buyer_street: z.string().min(2, 'Street address is required'),
  buyer_city: z.string().min(2, 'City is required'),
  buyer_state: z.string().min(2, 'State is required'),
  buyer_zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'ZIP must be 5 digits, optionally with -4 extension'),
  how_heard: z.string().optional(),
  proposed_pickup_date: z.string().min(1, 'Pickup date is required'),
  pickup_time_preference: z.string().optional(),
  pickup_day_preference: z.string().optional(),
  pickup_notes: z.string().optional(),

  // Step 4 — Care guide (all optional; the step is skippable)
  q_first_dog: z.string().optional(),
  q_living_situation: z.string().optional(),
  q_hours_alone: z.string().optional(),
  q_household_members: z.string().optional(),
  q_puppy_goal: z.string().optional(),
  q_training_experience: z.string().optional(),
  care_comfort_potty: z.number().int().min(1).max(5).optional(),
  care_comfort_grooming: z.number().int().min(1).max(5).optional(),
  care_comfort_health: z.number().int().min(1).max(5).optional(),
  care_comfort_social: z.number().int().min(1).max(5).optional(),
  care_comfort_boundaries: z.number().int().min(1).max(5).optional(),

  // Step 5 — Adopt signature
  buyer_initials: z
    .string()
    .trim()
    .min(1, 'Initials are required')
    .max(6, 'Initials are too long'),
  // Buyer signature (used in Step 5 adopt, then re-confirmed in Step 7)
  buyer_signature_text: z.string().min(2, 'Signature is required — type your full legal name'),

  // Step 8 — Payment method
  deposit_payment_method: z.string().min(1, 'Choose a payment method'),
  final_payment_method_intended: z.string().optional(),

  // Step 9 — Final payment plan (only required when payment_mode = deposit_only)
  final_payment_plan: z
    .enum(['pay_before_pickup', 'pay_at_pickup', 'unsure'], {
      required_error: 'Pick the option that fits best',
    })
    .optional(),
});

export type WizardFormValues = z.infer<typeof wizardSchema>;

/**
 * Fields whose validity gates each step's "Next" button. Steps that have no
 * form fields (or where readiness is derived from external state — adopt
 * signature, agreement terms, review) appear with an empty list and the
 * parent component supplies the gate manually.
 */
export const fieldsByStep: Record<WizardStepKey, (keyof WizardFormValues)[]> = {
  payment_choice: ['payment_mode'],
  disclaimer: ['disclaimer_acknowledged'],
  about_you: [
    'buyer_name',
    'buyer_email',
    'buyer_phone',
    'buyer_street',
    'buyer_city',
    'buyer_state',
    'buyer_zip',
    'proposed_pickup_date',
  ],
  care_guide: [],
  adopt_signature: ['buyer_initials', 'buyer_signature_text'],
  agreement_terms: [],
  final_signature: ['buyer_signature_text'],
  payment_method: ['deposit_payment_method'],
  final_payment_plan: ['final_payment_plan'],
  review: [],
};
