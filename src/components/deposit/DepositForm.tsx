// src/components/deposit/DepositForm.tsx
// Full customer deposit form — handles the buyer-facing deposit submission flow.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { BuyerSignature } from '@/components/signatures/BuyerSignature';
import { DepositSummary } from '@/components/deposit/DepositSummary';
import { PaymentMethodSelector } from '@/components/deposit/PaymentMethodSelector';

import {
  resolveDepositAmount,
  getEarliestPickupDate,
  isValidPickupDate,
  generatePaymentMemo,
} from '@/lib/utils/depositCalc';
import { DEFAULT_AUTHORIZED_SELLER } from '@/lib/constants/deposit';
import { US_STATES } from '@/data/statesData';
import { submitDepositAgreement, fetchPuppyForDeposit, fetchLitterForDeposit } from '@/lib/deposit-service';
import type { PaymentMethodKey } from '@/lib/constants/deposit';
import { Checkbox } from '@/components/ui/checkbox';
import { LEGAL_REFERENCES } from '@/lib/constants/business';

// --- Zod schema ---
const depositFormSchema = z.object({
  buyer_name: z.string().min(2, 'Full name is required'),
  buyer_email: z.string().email('Valid email is required'),
  buyer_phone: z.string().optional(),
  // OPD-05: structured address. ZIP drives sales-tax jurisdiction (OPD-15).
  // Per Wave E E1 the DB columns are nullable; form-side validation here
  // is intentionally light — tighter validation can land alongside OPD-15.
  buyer_street: z.string().optional(),
  buyer_city: z.string().optional(),
  buyer_state: z.string().optional(),
  buyer_zip: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{5}(-\d{4})?$/.test(v),
      'ZIP must be 5 digits, optionally with -4 extension'
    ),
  proposed_pickup_date: z.string().min(1, 'Pickup date is required'),
  // OPD-08 pickup preferences (all optional). The DB CHECK constraint
  // enforces the enum values on write; the <Select>s only emit valid
  // values, so the schema is loose here on purpose.
  pickup_time_preference: z.string().optional(),
  pickup_day_preference: z.string().optional(),
  pickup_alt_date: z.string().optional(),
  pickup_alt_time: z.string().optional(),
  pickup_alt_day: z.string().optional(),
  pickup_notes: z.string().optional(),
  // OPD-07 Section 3 questionnaire (all optional, free-form).
  q_first_dog: z.string().optional(),
  q_living_situation: z.string().optional(),
  q_hours_alone: z.string().optional(),
  q_household_members: z.string().optional(),
  q_puppy_goal: z.string().optional(),
  q_training_experience: z.string().optional(),
  deposit_payment_method: z.string().min(1, 'Payment method is required'),
  final_payment_method_intended: z.string().optional(),
  buyer_signature_text: z.string().min(2, 'Signature is required — type your full legal name'),
  // Seller is no longer picked by the buyer — the form auto-fills
  // DEFAULT_AUTHORIZED_SELLER on submit so the DB constraint is satisfied.
  authorized_seller: z.string().optional(),
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

/** Convert an empty form string to `undefined` so the payload field is omitted. */
function emptyToUndef(v: string | undefined | null): string | undefined {
  if (!v) return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

interface DepositFormProps {
  puppyId?: string;
  litterId?: string;
  /** Optional — links the resulting agreement back to a deposit_requests row. */
  requestId?: string;
}

export function DepositForm({ puppyId, litterId, requestId }: DepositFormProps) {
  const navigate = useNavigate();

  // Acknowledgment checkboxes (Article IX) — each stores timestamp when checked
  const [acks, setAcks] = useState<Record<string, string | null>>({
    full_agreement: null,
    statutory_rights: null,
    esign_valid: null,
    genetic_disclaimer: null,
    arbitration: null,
    age_attestation: null,
    welfare_responsibility: null,
  });
  const [arbitrationPhrase, setArbitrationPhrase] = useState('');

  const REQUIRED_ARBITRATION_PHRASE = 'I understand and agree to arbitration';
  const allAcksChecked = Object.values(acks).every((v) => v !== null);
  const arbitrationValid = arbitrationPhrase.toLowerCase().trim() === REQUIRED_ARBITRATION_PHRASE.toLowerCase();
  const canSubmit = allAcksChecked && arbitrationValid;

  function toggleAck(key: string) {
    setAcks((prev) => ({
      ...prev,
      [key]: prev[key] ? null : new Date().toISOString(),
    }));
  }

  // Fetch puppy data if puppyId provided
  const { data: puppy } = useQuery({
    queryKey: ['puppy-for-deposit', puppyId],
    queryFn: () => fetchPuppyForDeposit(puppyId!),
    enabled: !!puppyId,
  });

  // Fetch litter data if litterId provided
  const { data: litter } = useQuery({
    queryKey: ['litter-for-deposit', litterId],
    queryFn: () => fetchLitterForDeposit(litterId!),
    enabled: !!litterId,
  });

  // Derive pricing and DOB. Purchase price comes from the selected puppy.
  // Deposit defaults to a flat amount; the operator can set a per-puppy
  // override via puppies.deposit_amount in OperatorReviewForm (Wave C).
  const purchasePrice = puppy?.final_price ?? puppy?.base_price ?? 0;
  const puppyDob = puppy?.date_of_birth ? new Date(puppy.date_of_birth) : (litter?.date_of_birth ? new Date(litter.date_of_birth) : null);
  // Fallback when puppy isn't born yet: the litter's expected whelping date (or
  // the breeding date, which pairs with the project's own +63d helper).
  const expectedWhelpingDate = litter?.expected_whelping_date
    ? new Date(litter.expected_whelping_date)
    : null;
  const puppyName = puppy?.name ?? 'Undecided';
  const breed = puppy?.breed ?? litter?.breed ?? '';

  const earliestPickup = useMemo(
    () => getEarliestPickupDate(puppyDob, expectedWhelpingDate),
    [puppyDob, expectedWhelpingDate]
  );
  const earliestPickupStr = earliestPickup ? format(earliestPickup, 'yyyy-MM-dd') : '';

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<DepositFormValues>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      buyer_name: '',
      buyer_email: '',
      buyer_phone: '',
      buyer_street: '',
      buyer_city: '',
      buyer_state: '',
      buyer_zip: '',
      proposed_pickup_date: '',
      pickup_time_preference: '',
      pickup_day_preference: '',
      pickup_alt_date: '',
      pickup_alt_time: '',
      pickup_alt_day: '',
      pickup_notes: '',
      q_first_dog: '',
      q_living_situation: '',
      q_hours_alone: '',
      q_household_members: '',
      q_puppy_goal: '',
      q_training_experience: '',
      deposit_payment_method: 'zelle',
      final_payment_method_intended: '',
      buyer_signature_text: '',
      authorized_seller: '',
    },
  });

  const buyerName = watch('buyer_name');
  const buyerPhone = watch('buyer_phone');
  const proposedPickupDate = watch('proposed_pickup_date');
  const paymentMemo = generatePaymentMemo(buyerName || 'Your Name', buyerPhone, 'Deposit');

  // Flat default unless the puppy row carries a per-puppy override.
  const depositAmount = resolveDepositAmount({ puppyOverride: puppy?.deposit_amount });

  // Pickup date validation
  const pickupDateError = useMemo(() => {
    if (!proposedPickupDate) return null;
    const proposed = new Date(proposedPickupDate);
    if (!isValidPickupDate(proposed, puppyDob, expectedWhelpingDate)) {
      if (!earliestPickup) return null;
      return `Pickup date must be on or after ${format(earliestPickup, 'MMM d, yyyy')} — puppies go home at 8 weeks.`;
    }
    return null;
  }, [proposedPickupDate, puppyDob, expectedWhelpingDate, earliestPickup]);

  const submitMutation = useMutation({
    mutationFn: submitDepositAgreement,
    onSuccess: (data) => {
      toast.success('Deposit agreement submitted — taking you to your payment dashboard…');
      // Wave D: redirect to the buyer-token-scoped payment dashboard.
      navigate(`/payment/${data.id}/${data.buyer_access_token}`, { replace: true });
    },
    onError: (err: Error) => {
      toast.error(`Submission failed: ${err.message}`);
    },
  });

  function onSubmit(values: DepositFormValues) {
    if (pickupDateError) {
      toast.error(pickupDateError);
      return;
    }

    const amount = depositAmount;

    submitMutation.mutate({
      buyer_name: values.buyer_name,
      buyer_email: values.buyer_email,
      buyer_phone: values.buyer_phone || undefined,
      buyer_street: values.buyer_street || undefined,
      buyer_city: values.buyer_city || undefined,
      buyer_state: values.buyer_state || undefined,
      buyer_zip: values.buyer_zip || undefined,
      puppy_id: puppyId,
      litter_id: litterId,
      puppy_name: puppyName,
      breed,
      puppy_dob: puppyDob ? format(puppyDob, 'yyyy-MM-dd') : undefined,
      purchase_price: purchasePrice,
      deposit_amount: amount,
      deposit_payment_method: values.deposit_payment_method as PaymentMethodKey,
      final_payment_method_intended: values.final_payment_method_intended as PaymentMethodKey | undefined,
      proposed_pickup_date: values.proposed_pickup_date,
      pickup_time_preference: emptyToUndef(values.pickup_time_preference) as 'morning' | 'afternoon' | 'evening' | undefined,
      pickup_day_preference: emptyToUndef(values.pickup_day_preference) as 'weekday' | 'weekend' | 'either' | undefined,
      pickup_alt_date: emptyToUndef(values.pickup_alt_date),
      pickup_alt_time: emptyToUndef(values.pickup_alt_time) as 'morning' | 'afternoon' | 'evening' | undefined,
      pickup_alt_day: emptyToUndef(values.pickup_alt_day) as 'weekday' | 'weekend' | 'either' | undefined,
      pickup_notes: emptyToUndef(values.pickup_notes),
      q_first_dog: emptyToUndef(values.q_first_dog),
      q_living_situation: emptyToUndef(values.q_living_situation),
      q_hours_alone: emptyToUndef(values.q_hours_alone),
      q_household_members: emptyToUndef(values.q_household_members),
      q_puppy_goal: emptyToUndef(values.q_puppy_goal),
      q_training_experience: emptyToUndef(values.q_training_experience),
      authorized_seller:
        (values.authorized_seller as 'carlos_lebron_rivera' | 'yolanda_lebron_rivera') ||
        DEFAULT_AUTHORIZED_SELLER,
      buyer_signature_text: values.buyer_signature_text,
      buyer_signature_font: 'Dancing Script',
      // Audit trail fields
      ack_full_agreement_at: acks.full_agreement || undefined,
      ack_statutory_rights_at: acks.statutory_rights || undefined,
      ack_esign_valid_at: acks.esign_valid || undefined,
      ack_genetic_disclaimer_at: acks.genetic_disclaimer || undefined,
      ack_arbitration_at: acks.arbitration || undefined,
      ack_age_attestation_at: acks.age_attestation || undefined,
      ack_welfare_responsibility_at: acks.welfare_responsibility || undefined,
      arbitration_typed_phrase: arbitrationPhrase,
      arbitration_typed_at: arbitrationValid ? new Date().toISOString() : undefined,
      // Link this agreement back to its originating deposit request, if any.
      deposit_request_id: requestId,
    });
  }

  // --- Main form ---
  // (Wave D: success state replaced by an immediate redirect to the
  // payment dashboard at /payment/<id>/<token> — see submitMutation.onSuccess.)
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Deposit Agreement — Dream Puppies</CardTitle>
          {puppyName !== 'Undecided' && (
            <p className="text-sm text-muted-foreground">
              Puppy: <span className="font-medium">{puppyName}</span>
              {breed && <> &middot; {breed}</>}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deposit Summary */}
          {purchasePrice > 0 && (
            <DepositSummary
              purchasePrice={purchasePrice}
              puppyOverride={puppy?.deposit_amount}
            />
          )}

          {/* Buyer Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Your Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buyer_name">Full Name *</Label>
                <Input id="buyer_name" {...register('buyer_name')} placeholder="Jane Smith" />
                {errors.buyer_name && <p className="text-xs text-red-500 mt-1">{errors.buyer_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="buyer_email">Email *</Label>
                <Input id="buyer_email" type="email" {...register('buyer_email')} placeholder="jane@example.com" />
                {errors.buyer_email && <p className="text-xs text-red-500 mt-1">{errors.buyer_email.message}</p>}
              </div>
              <div>
                <Label htmlFor="buyer_phone">Phone</Label>
                <Input id="buyer_phone" {...register('buyer_phone')} placeholder="(555) 123-4567" />
              </div>
            </div>

            {/* Structured address (Wave E E3 / OPD-05) */}
            <div className="space-y-3 pt-2">
              <div>
                <Label htmlFor="buyer_street">Street Address</Label>
                <Input
                  id="buyer_street"
                  {...register('buyer_street')}
                  placeholder="123 Main St, Apt 4"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="buyer_city">City</Label>
                  <Input id="buyer_city" {...register('buyer_city')} placeholder="Orlando" />
                </div>
                <div>
                  <Label htmlFor="buyer_state">State</Label>
                  <Controller
                    name="buyer_state"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger id="buyer_state">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="buyer_zip">ZIP</Label>
                  <Input
                    id="buyer_zip"
                    {...register('buyer_zip')}
                    placeholder="32801"
                    inputMode="numeric"
                  />
                  {errors.buyer_zip && (
                    <p className="text-xs text-red-500 mt-1">{errors.buyer_zip.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pickup */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Pickup</h3>
            <div className="space-y-2">
              <Label htmlFor="proposed_pickup_date">Primary date *</Label>
              <Input
                id="proposed_pickup_date"
                type="date"
                min={earliestPickupStr}
                {...register('proposed_pickup_date')}
              />
              {pickupDateError && (
                <p className="text-xs text-red-500">{pickupDateError}</p>
              )}
              {errors.proposed_pickup_date && (
                <p className="text-xs text-red-500">{errors.proposed_pickup_date.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {earliestPickup
                  ? `Earliest pickup: ${format(earliestPickup, 'MMM d, yyyy')} (puppies go home at 8 weeks)`
                  : 'Pick any date — earliest pickup will be set once the litter is born (puppies go home 8 weeks after birth).'}
              </p>
            </div>

            {/* OPD-08 pickup preferences (all optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickup_time_preference">Preferred time</Label>
                <Controller
                  name="pickup_time_preference"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="pickup_time_preference">
                        <SelectValue placeholder="No preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="pickup_day_preference">Preferred day</Label>
                <Controller
                  name="pickup_day_preference"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="pickup_day_preference">
                        <SelectValue placeholder="No preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekday">Weekday</SelectItem>
                        <SelectItem value="weekend">Weekend</SelectItem>
                        <SelectItem value="either">Either</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="pickup_alt_date">Alternative date (optional)</Label>
                <Input
                  id="pickup_alt_date"
                  type="date"
                  min={earliestPickupStr}
                  {...register('pickup_alt_date')}
                />
              </div>
              <div className="hidden sm:block" />
              <div>
                <Label htmlFor="pickup_alt_time">Alt time</Label>
                <Controller
                  name="pickup_alt_time"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="pickup_alt_time">
                        <SelectValue placeholder="No preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="pickup_alt_day">Alt day</Label>
                <Controller
                  name="pickup_alt_day"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="pickup_alt_day">
                        <SelectValue placeholder="No preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekday">Weekday</SelectItem>
                        <SelectItem value="weekend">Weekend</SelectItem>
                        <SelectItem value="either">Either</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pickup_notes">Notes about pickup (optional)</Label>
              <Textarea
                id="pickup_notes"
                rows={2}
                {...register('pickup_notes')}
                placeholder="e.g. driving in from out of state; need a stroller; etc."
              />
            </div>
          </div>

          {/* OPD-07 Section 3 questionnaire — all optional */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                About You & Your Home (Optional)
              </h3>
              <p className="text-xs text-muted-foreground">
                Helps us prepare a personalized care guide. None of these questions are required.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="q_first_dog">Is this your first dog?</Label>
                <Controller
                  name="q_first_dog"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="q_first_dog">
                        <SelectValue placeholder="Skip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes — first dog</SelectItem>
                        <SelectItem value="no">No — had a dog before</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="q_living_situation">Where will the puppy primarily live?</Label>
                <Controller
                  name="q_living_situation"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="q_living_situation">
                        <SelectValue placeholder="Skip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house_yard">House with yard</SelectItem>
                        <SelectItem value="house_no_yard">House without yard</SelectItem>
                        <SelectItem value="apartment">Apartment / Condo</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="q_hours_alone">Hours alone per day?</Label>
                <Controller
                  name="q_hours_alone"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="q_hours_alone">
                        <SelectValue placeholder="Skip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_4">Less than 4</SelectItem>
                        <SelectItem value="4_to_8">4 to 8</SelectItem>
                        <SelectItem value="over_8">More than 8</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="q_household_members">Young children or other pets?</Label>
                <Input
                  id="q_household_members"
                  {...register('q_household_members')}
                  placeholder="e.g. 1 toddler + 1 cat"
                />
              </div>
              <div>
                <Label htmlFor="q_puppy_goal">Main goal for this puppy?</Label>
                <Controller
                  name="q_puppy_goal"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="q_puppy_goal">
                        <SelectValue placeholder="Skip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="family_pet">Family pet</SelectItem>
                        <SelectItem value="service">Service / therapy</SelectItem>
                        <SelectItem value="show">Show / breeding</SelectItem>
                        <SelectItem value="working">Working dog</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="q_training_experience">Dog training experience?</Label>
                <Controller
                  name="q_training_experience"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="q_training_experience">
                        <SelectValue placeholder="Skip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="some">Some basics</SelectItem>
                        <SelectItem value="extensive">Extensive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Deposit Payment</h3>
            <Controller
              name="deposit_payment_method"
              control={control}
              render={({ field }) => (
                <PaymentMethodSelector
                  value={field.value as PaymentMethodKey}
                  onChange={field.onChange}
                  paymentMemo={paymentMemo}
                />
              )}
            />
          </div>

          {/* Final Payment Method (informational) */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Intended final payment method (optional)</Label>
            <Controller
              name="final_payment_method_intended"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="How do you plan to pay the balance?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="cashapp">Cash App</SelectItem>
                    <SelectItem value="apple_pay">Apple Pay</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Agreement Terms */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Agreement Terms</h3>
            <div className="max-h-48 overflow-y-auto rounded border border-line bg-muted/40 p-4 text-xs text-muted-foreground space-y-2">
              <p><strong>Dream Puppies — Deposit Agreement</strong></p>
              <p>This Deposit Agreement ("Agreement") is entered into between Dream Puppies, a hobby breeding program operated in Florida, and the Buyer identified above.</p>
              <p><strong>1. Deposit.</strong> The Buyer agrees to pay the deposit amount shown above to reserve the specified puppy. The deposit is non-refundable except as provided herein.</p>
              <p><strong>2. Pickup.</strong> The Buyer must pick up the puppy on or after the proposed pickup date. Puppies are not released before 8 weeks of age. If the Buyer fails to pick up the puppy within 14 days of the pickup clock start date, the reservation may be forfeited.</p>
              <p><strong>3. Rejection Window.</strong> Dream Puppies reserves the right to reject a deposit within 48 hours of submission if the puppy is no longer available. In such case, the deposit will be refunded in full.</p>
              <p><strong>4. Balance.</strong> The remaining balance is due at or before pickup. Payment must be made using one of the accepted payment methods.</p>
              <p><strong>5. Health Guarantee.</strong> Dream Puppies provides a health guarantee as detailed in the Pet Guide provided at pickup.</p>
              <p><strong>6. Electronic Signature.</strong> By typing your name below, you acknowledge that this constitutes a valid electronic signature under Florida law (Fla. Stat. § 668.50).</p>
            </div>
          </div>

          {/* Required Acknowledgments (Article IX) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Required Acknowledgments</h3>
            <p className="text-xs text-muted-foreground">Please review and check each acknowledgment individually.</p>

            <div className="space-y-3 rounded border border-line bg-muted/40 p-4">
              {[
                { key: 'full_agreement', label: 'I have read and understand the full agreement.' },
                { key: 'statutory_rights', label: (
                  <>I have reviewed my Florida statutory rights under{' '}
                    <a href={LEGAL_REFERENCES.FLA_828_29} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Fla. Stat. § 828.29</a>.
                  </>
                )},
                { key: 'esign_valid', label: (
                  <>I acknowledge that electronic signatures are valid under{' '}
                    <a href={LEGAL_REFERENCES.FLA_CH_668} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Fla. Stat. Ch. 668</a>.
                  </>
                )},
                { key: 'genetic_disclaimer', label: (
                  <>I understand canine genetic outcomes cannot be guaranteed ({' '}
                    <a href={LEGAL_REFERENCES.GENETICS_REF} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Axelsson et al.</a>).
                  </>
                )},
                { key: 'arbitration', label: 'I understand and agree to binding arbitration for any disputes.' },
                { key: 'age_attestation', label: 'I am at least 18 years old and all information provided is accurate.' },
                { key: 'welfare_responsibility', label: "I accept full responsibility for the puppy's welfare and actions after transfer." },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={acks[key] !== null}
                    onCheckedChange={() => toggleAck(key)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Arbitration Typed Phrase */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Arbitration Agreement</h3>
            <p className="text-xs text-muted-foreground uppercase font-bold">
              DISPUTES ARISING UNDER THIS AGREEMENT SHALL BE RESOLVED BY BINDING ARBITRATION IN ACCORDANCE WITH FLORIDA LAW (
              <a href={LEGAL_REFERENCES.FLA_CH_682} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">FLA. STAT. CH. 682</a>
              ).
            </p>
            <Label htmlFor="arbitration_phrase" className="text-sm">
              Please type: <em className="text-foreground">&quot;{REQUIRED_ARBITRATION_PHRASE}&quot;</em>
            </Label>
            <Input
              id="arbitration_phrase"
              value={arbitrationPhrase}
              onChange={(e) => setArbitrationPhrase(e.target.value)}
              placeholder={REQUIRED_ARBITRATION_PHRASE}
              className={arbitrationValid ? 'border-green-500' : ''}
            />
            {arbitrationPhrase.length > 0 && !arbitrationValid && (
              <p className="text-xs text-red-500">Please type the phrase exactly as shown above.</p>
            )}
          </div>

          {/* Buyer Signature */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Your Signature</h3>
            <Controller
              name="buyer_signature_text"
              control={control}
              render={({ field }) => (
                <BuyerSignature value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.buyer_signature_text && (
              <p className="text-xs text-red-500">{errors.buyer_signature_text.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-primaryDeep text-white hover:bg-primaryDeep/90"
            disabled={submitMutation.isPending || !canSubmit}
            size="lg"
          >
            {submitMutation.isPending ? 'Submitting...' : `Submit Deposit — $${depositAmount.toFixed(2)}`}
          </Button>
          {!canSubmit && (
            <p className="text-xs text-center text-amber-600">
              Please complete all acknowledgments and the arbitration agreement above before submitting.
            </p>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Dream Puppies — hobby breeding program
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
