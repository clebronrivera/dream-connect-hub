// Step 7 — buyer re-confirms their adopted signature one last time before
// the payment step. No re-typing of any arbitration phrase (retired in the
// redesign); just a final confirmation that the signature is theirs.

import { Controller, useFormContext } from 'react-hook-form';
import { BuyerSignature } from '@/components/signatures/BuyerSignature';
import type { WizardFormValues } from '@/components/wizard/wizardSchema';

export function StepFinalSignature() {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<WizardFormValues>();
  const initials = (watch('buyer_initials') ?? '').toUpperCase();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        You're about to commit to the agreement. Confirm your signature is correct — edit if
        anything needs to change.
      </p>

      <div className="space-y-2">
        <Controller
          name="buyer_signature_text"
          control={control}
          render={({ field }) => <BuyerSignature value={field.value} onChange={field.onChange} />}
        />
        {errors.buyer_signature_text && (
          <p className="text-xs text-red-500">{errors.buyer_signature_text.message}</p>
        )}
      </div>

      {initials && (
        <div className="rounded-lg border border-line bg-muted/30 p-4 flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Initials on file
          </span>
          <span className="font-bold tracking-widest text-ink">{initials}</span>
        </div>
      )}
    </div>
  );
}
