// Step 2 — front-loaded plain-English disclaimer covering the
// non-refundable deposit, 18+ attestation, and that the full agreement is
// presented later step-by-step. One single acknowledgement gates the step;
// the individual contract clauses get their own initials later.

import { useFormContext } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import type { WizardFormValues } from '@/components/wizard/wizardSchema';

interface StepDisclaimerProps {
  paymentMode?: 'deposit_only' | 'full_payment';
}

export function StepDisclaimer({ paymentMode }: StepDisclaimerProps) {
  const { watch, setValue } = useFormContext<WizardFormValues>();
  const acknowledged = watch('disclaimer_acknowledged');

  const points: string[] = [
    paymentMode === 'full_payment'
      ? 'Your payment today is non-refundable except as described in the rejection-window clause inside the agreement.'
      : 'Your deposit is non-refundable except as described in the rejection-window clause inside the agreement.',
    'You must be at least 18 years old to sign.',
    'Puppies are released no earlier than 8 weeks of age and must be picked up within 14 days of the pickup-clock start date.',
    'We will walk you through every clause one at a time. You initial each one as you go.',
    'This is a legally binding electronic agreement under Florida law (Fla. Stat. Ch. 668).',
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Quick highlights before we start. The full agreement is presented later and you initial each
        clause individually.
      </p>
      <ul className="space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3 items-start">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primaryDeep shrink-0" aria-hidden />
            <span className="text-sm text-ink">{p}</span>
          </li>
        ))}
      </ul>
      <label className="flex gap-3 items-start cursor-pointer rounded-lg border border-line bg-muted/30 p-4">
        <Checkbox
          checked={acknowledged === true}
          onCheckedChange={(v) =>
            setValue('disclaimer_acknowledged', v === true, { shouldValidate: true })
          }
          className="mt-0.5"
        />
        <span className="text-sm font-medium text-ink">
          I have read and understood the points above and I am 18 or older.
        </span>
      </label>
    </div>
  );
}
