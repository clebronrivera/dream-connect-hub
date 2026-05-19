// Buyer-facing 10-step deposit wizard. Replaces the linear DepositForm.tsx.
//
// Hosts a single useForm() instance, the wizard step counter, and the
// per-clause acknowledgement timestamps. Each step component is dumb and
// reads/writes via FormProvider context.
//
// Step skipping: when payment_mode === 'full_payment' the Final Payment
// Plan step is skipped (totalSteps falls from 10 to 9).

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { WizardShell } from '@/components/wizard/WizardShell';
import { StepPaymentChoice } from '@/components/wizard/StepPaymentChoice';
import { StepDisclaimer } from '@/components/wizard/StepDisclaimer';
import { StepAboutYou } from '@/components/wizard/StepAboutYou';
import { StepCareGuide } from '@/components/wizard/StepCareGuide';
import { StepAdoptSignature } from '@/components/wizard/StepAdoptSignature';
import { StepAgreementTerms, CLAUSE_KEYS, type ClauseKey } from '@/components/wizard/StepAgreementTerms';
import { StepFinalSignature } from '@/components/wizard/StepFinalSignature';
import { StepPaymentMethod } from '@/components/wizard/StepPaymentMethod';
import { StepFinalPaymentPlan } from '@/components/wizard/StepFinalPaymentPlan';
import { StepReview } from '@/components/wizard/StepReview';

import {
  wizardSchema,
  type WizardFormValues,
  fieldsByStep,
  WIZARD_STEPS,
  type WizardStepKey,
} from '@/components/wizard/wizardSchema';

import {
  resolveDepositAmount,
  getEarliestPickupDate,
  isValidPickupDate,
} from '@/lib/utils/depositCalc';
import { DEFAULT_AUTHORIZED_SELLER } from '@/lib/constants/deposit';
import {
  submitDepositAgreement,
  fetchPuppyForDeposit,
  fetchLitterForDeposit,
} from '@/lib/deposit-service';
import type { PaymentMethodKey } from '@/lib/constants/deposit';

interface DepositWizardProps {
  puppyId?: string;
  litterId?: string;
  /** Required — operator-issued; links the resulting agreement back to the request. */
  requestId: string;
}

export function DepositWizard({ puppyId, litterId, requestId }: DepositWizardProps) {
  const navigate = useNavigate();

  // ── Puppy / litter context ────────────────────────────────────────────────
  const { data: puppy } = useQuery({
    queryKey: ['puppy-for-deposit', puppyId],
    queryFn: () => fetchPuppyForDeposit(puppyId!),
    enabled: !!puppyId,
  });
  const { data: litter } = useQuery({
    queryKey: ['litter-for-deposit', litterId],
    queryFn: () => fetchLitterForDeposit(litterId!),
    enabled: !!litterId,
  });

  const purchasePrice = puppy?.final_price ?? puppy?.base_price ?? 0;
  const puppyDob = puppy?.date_of_birth ? new Date(puppy.date_of_birth) : litter?.date_of_birth ? new Date(litter.date_of_birth) : null;
  const expectedWhelpingDate = litter?.expected_whelping_date ? new Date(litter.expected_whelping_date) : null;
  const puppyName = puppy?.name ?? 'Undecided';
  const breed = puppy?.breed ?? litter?.breed ?? '';
  const puppyPhotoUrl = puppy?.primary_photo ?? undefined;
  const earliestPickup = useMemo(
    () => getEarliestPickupDate(puppyDob, expectedWhelpingDate),
    [puppyDob, expectedWhelpingDate]
  );
  const earliestPickupStr = earliestPickup ? format(earliestPickup, 'yyyy-MM-dd') : '';

  // ── Form ──────────────────────────────────────────────────────────────────
  const methods = useForm<WizardFormValues>({
    resolver: zodResolver(wizardSchema),
    mode: 'onChange',
    defaultValues: {
      payment_mode: undefined,
      disclaimer_acknowledged: false,
      buyer_name: '',
      buyer_email: '',
      buyer_phone: '',
      buyer_street: '',
      buyer_city: '',
      buyer_state: '',
      buyer_zip: '',
      how_heard: '',
      q_first_dog: '',
      q_living_situation: '',
      q_hours_alone: '',
      q_household_members: '',
      q_puppy_goal: '',
      q_training_experience: '',
      care_comfort_potty: undefined,
      care_comfort_grooming: undefined,
      care_comfort_health: undefined,
      care_comfort_social: undefined,
      care_comfort_boundaries: undefined,
      buyer_initials: '',
      buyer_signature_text: '',
      proposed_pickup_date: '',
      pickup_time_preference: '',
      pickup_day_preference: '',
      pickup_notes: '',
      deposit_payment_method: 'zelle',
      final_payment_method_intended: '',
      final_payment_plan: undefined,
    },
  });

  // Per-clause acknowledgement timestamps. Reset to all-null on mount; each
  // clause flips to ISO string when the buyer stamps their initials on it.
  const [acks, setAcks] = useState<Record<ClauseKey, string | null>>(() => {
    const init: Partial<Record<ClauseKey, string | null>> = {};
    for (const key of CLAUSE_KEYS) init[key] = null;
    return init as Record<ClauseKey, string | null>;
  });
  const stampAck = (key: ClauseKey) =>
    setAcks((prev) => ({ ...prev, [key]: prev[key] ? null : new Date().toISOString() }));
  const allAcksStamped = CLAUSE_KEYS.every((k) => acks[k] !== null);

  const [initialsAdoptedAt, setInitialsAdoptedAt] = useState<string | null>(null);

  // ── Step state ────────────────────────────────────────────────────────────
  const paymentMode = methods.watch('payment_mode');
  const fullPay = paymentMode === 'full_payment';
  const stepOrder: WizardStepKey[] = useMemo(() => {
    const all: WizardStepKey[] = [...WIZARD_STEPS];
    return fullPay ? all.filter((s) => s !== 'final_payment_plan') : all;
  }, [fullPay]);
  const [stepIdx, setStepIdx] = useState(0);
  const currentStepKey = stepOrder[stepIdx];
  const totalSteps = stepOrder.length;
  const isFinalStep = stepIdx === stepOrder.length - 1;

  // ── Validation gate ───────────────────────────────────────────────────────
  // The Agreement Terms step also requires all initials to be stamped.
  const formValid = methods.formState.isValid;
  const stepFields = fieldsByStep[currentStepKey] ?? [];
  const stepFieldsValid = stepFields.every((f) => {
    const errs = methods.formState.errors;
    return !(errs as Record<string, unknown>)[f];
  });
  // For steps without dedicated form fields, derive readiness manually.
  const stepReady = (() => {
    switch (currentStepKey) {
      case 'payment_choice':
        return paymentMode === 'deposit_only' || paymentMode === 'full_payment';
      case 'disclaimer':
        return methods.watch('disclaimer_acknowledged') === true;
      case 'adopt_signature': {
        const initials = methods.watch('buyer_initials');
        const sig = methods.watch('buyer_signature_text');
        return (
          typeof initials === 'string' &&
          initials.trim().length >= 1 &&
          typeof sig === 'string' &&
          sig.trim().length >= 2 &&
          initialsAdoptedAt !== null
        );
      }
      case 'agreement_terms':
        return allAcksStamped;
      case 'final_payment_plan':
        return !!methods.watch('final_payment_plan');
      case 'review':
        return formValid && allAcksStamped;
      default:
        return stepFieldsValid;
    }
  })();

  // ── Navigation ────────────────────────────────────────────────────────────
  async function handleNext() {
    // Validate the current step's fields before advancing.
    if (stepFields.length > 0) {
      const ok = await methods.trigger(stepFields as Parameters<typeof methods.trigger>[0]);
      if (!ok) return;
    }
    // Pickup-date sanity check piggybacks on the About-You step.
    if (currentStepKey === 'about_you') {
      const proposed = methods.getValues('proposed_pickup_date');
      if (proposed) {
        const proposedDate = new Date(proposed);
        if (!isValidPickupDate(proposedDate, puppyDob, expectedWhelpingDate)) {
          toast.error(
            earliestPickup
              ? `Pickup date must be on or after ${format(earliestPickup, 'MMM d, yyyy')}.`
              : 'That pickup date is too early.'
          );
          return;
        }
      }
    }
    if (isFinalStep) {
      void methods.handleSubmit(onSubmit)();
      return;
    }
    setStepIdx((s) => Math.min(s + 1, stepOrder.length - 1));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function handleBack() {
    setStepIdx((s) => Math.max(s - 1, 0));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Submission ────────────────────────────────────────────────────────────
  const depositAmount = resolveDepositAmount({ puppyOverride: puppy?.deposit_amount });

  const submitMutation = useMutation({
    mutationFn: submitDepositAgreement,
    onSuccess: (data) => {
      toast.success('Reservation submitted — taking you to your payment dashboard.');
      navigate(`/payment/${data.id}/${data.buyer_access_token}`, { replace: true });
    },
    onError: (err: Error) => {
      toast.error(`Submission failed: ${err.message}`);
    },
  });

  function emptyToUndef(v: string | undefined | null): string | undefined {
    if (!v) return undefined;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  function onSubmit(values: WizardFormValues) {
    submitMutation.mutate({
      buyer_name: values.buyer_name,
      buyer_email: values.buyer_email,
      buyer_phone: values.buyer_phone,
      buyer_street: emptyToUndef(values.buyer_street),
      buyer_city: emptyToUndef(values.buyer_city),
      buyer_state: emptyToUndef(values.buyer_state),
      buyer_zip: emptyToUndef(values.buyer_zip),
      puppy_id: puppyId,
      litter_id: litterId,
      puppy_name: puppyName,
      breed: breed || undefined,
      puppy_dob: puppyDob ? format(puppyDob, 'yyyy-MM-dd') : undefined,
      purchase_price: purchasePrice,
      deposit_amount: fullPay ? purchasePrice : depositAmount,
      full_pay_flow: fullPay,
      deposit_payment_method: values.deposit_payment_method as PaymentMethodKey,
      final_payment_method_intended:
        (values.final_payment_method_intended as PaymentMethodKey) || undefined,
      proposed_pickup_date: values.proposed_pickup_date,
      pickup_time_preference: emptyToUndef(values.pickup_time_preference) as
        | 'morning'
        | 'afternoon'
        | 'evening'
        | undefined,
      pickup_day_preference: emptyToUndef(values.pickup_day_preference) as
        | 'weekday'
        | 'weekend'
        | 'either'
        | undefined,
      pickup_notes: emptyToUndef(values.pickup_notes),
      q_first_dog: emptyToUndef(values.q_first_dog),
      q_living_situation: emptyToUndef(values.q_living_situation),
      q_hours_alone: emptyToUndef(values.q_hours_alone),
      q_household_members: emptyToUndef(values.q_household_members),
      q_puppy_goal: emptyToUndef(values.q_puppy_goal),
      q_training_experience: emptyToUndef(values.q_training_experience),
      care_comfort_potty: values.care_comfort_potty,
      care_comfort_grooming: values.care_comfort_grooming,
      care_comfort_health: values.care_comfort_health,
      care_comfort_social: values.care_comfort_social,
      care_comfort_boundaries: values.care_comfort_boundaries,
      buyer_initials: values.buyer_initials,
      initials_adopted_at: initialsAdoptedAt ?? undefined,
      payment_mode: values.payment_mode,
      authorized_seller: DEFAULT_AUTHORIZED_SELLER,
      buyer_signature_text: values.buyer_signature_text,
      buyer_signature_font: 'Dancing Script',
      ack_full_agreement_at: acks.full_agreement ?? undefined,
      ack_statutory_rights_at: acks.statutory_rights ?? undefined,
      ack_esign_valid_at: acks.esign_valid ?? undefined,
      ack_genetic_disclaimer_at: acks.genetic_disclaimer ?? undefined,
      ack_arbitration_at: acks.arbitration ?? undefined,
      ack_age_attestation_at: acks.age_attestation ?? undefined,
      ack_welfare_responsibility_at: acks.welfare_responsibility ?? undefined,
      ack_payment_authorization_at: acks.payment_authorization ?? undefined,
      ack_identity_attestation_at: acks.identity_attestation ?? undefined,
      ack_pre_dispute_contact_at: acks.pre_dispute_contact ?? undefined,
      ack_pickup_acceptance_at: acks.pickup_acceptance ?? undefined,
      deposit_request_id: requestId,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const stepLabel = stepLabelFor(currentStepKey, fullPay);

  return (
    <FormProvider {...methods}>
      <WizardShell
        puppyName={puppyName}
        breed={breed}
        puppyPhotoUrl={puppyPhotoUrl}
        currentStep={stepIdx + 1}
        totalSteps={totalSteps}
        stepLabel={stepLabel}
        canGoBack={stepIdx > 0}
        canGoForward={stepReady}
        isFinalStep={isFinalStep}
        isSubmitting={submitMutation.isPending}
        onBack={handleBack}
        onNext={handleNext}
      >
        {currentStepKey === 'payment_choice' && (
          <StepPaymentChoice purchasePrice={purchasePrice} depositAmount={depositAmount} />
        )}
        {currentStepKey === 'disclaimer' && <StepDisclaimer paymentMode={paymentMode} />}
        {currentStepKey === 'about_you' && (
          <StepAboutYou earliestPickupStr={earliestPickupStr} earliestPickup={earliestPickup} />
        )}
        {currentStepKey === 'care_guide' && <StepCareGuide />}
        {currentStepKey === 'adopt_signature' && (
          <StepAdoptSignature
            adoptedAt={initialsAdoptedAt}
            onAdopt={() => setInitialsAdoptedAt(new Date().toISOString())}
          />
        )}
        {currentStepKey === 'agreement_terms' && (
          <StepAgreementTerms acks={acks} onStamp={stampAck} />
        )}
        {currentStepKey === 'final_signature' && <StepFinalSignature />}
        {currentStepKey === 'payment_method' && (
          <StepPaymentMethod paymentMode={paymentMode} amountDue={fullPay ? purchasePrice : depositAmount} />
        )}
        {currentStepKey === 'final_payment_plan' && (
          <StepFinalPaymentPlan balanceDue={Math.max(0, purchasePrice - depositAmount)} />
        )}
        {currentStepKey === 'review' && (
          <StepReview
            puppyName={puppyName}
            breed={breed}
            depositAmount={fullPay ? purchasePrice : depositAmount}
            purchasePrice={purchasePrice}
            paymentMode={paymentMode}
            allAcksStamped={allAcksStamped}
          />
        )}
      </WizardShell>
    </FormProvider>
  );
}

function stepLabelFor(key: WizardStepKey, fullPay: boolean): string {
  switch (key) {
    case 'payment_choice':
      return 'How would you like to pay?';
    case 'disclaimer':
      return 'Before we start';
    case 'about_you':
      return 'About you';
    case 'care_guide':
      return 'Care guide (optional)';
    case 'adopt_signature':
      return 'Adopt your e-signature';
    case 'agreement_terms':
      return 'Initial each agreement clause';
    case 'final_signature':
      return 'Confirm your signature';
    case 'payment_method':
      return fullPay ? 'Pay your puppy in full' : 'Send your deposit';
    case 'final_payment_plan':
      return 'When do you plan to pay the balance?';
    case 'review':
      return 'Review and submit';
    default:
      return '';
  }
}
