// Step 5 — buyer adopts an e-signature once. Captures full-name signature
// (re-used as the wet-style mark for the final signature step) and
// initials (stamped against each of the 11 contract clauses next step).
//
// Adoption is a deliberate action: the buyer types both fields, then taps
// "Adopt". Until adopted, the wizard's Next button stays disabled.

import { useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BuyerSignature } from '@/components/signatures/BuyerSignature';
import type { WizardFormValues } from '@/components/wizard/wizardSchema';

interface StepAdoptSignatureProps {
  adoptedAt: string | null;
  onAdopt: () => void;
}

export function StepAdoptSignature({ adoptedAt, onAdopt }: StepAdoptSignatureProps) {
  const {
    register,
    watch,
    control,
    formState: { errors },
    setValue,
  } = useFormContext<WizardFormValues>();
  const initials = watch('buyer_initials') ?? '';
  const signature = watch('buyer_signature_text') ?? '';
  const buyerName = watch('buyer_name') ?? '';

  const canAdopt =
    typeof initials === 'string' &&
    initials.trim().length >= 1 &&
    typeof signature === 'string' &&
    signature.trim().length >= 2;

  // Auto-derive initials from full name if the buyer hasn't typed any yet.
  useEffect(() => {
    if (!initials && buyerName) {
      const auto = buyerName
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 4);
      if (auto) setValue('buyer_initials', auto, { shouldValidate: true });
    }
    // We only want this to run when buyerName changes, not on every initials edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerName]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        We'll use the signature and initials you adopt here for the rest of the agreement. Take a
        moment to make sure they match how you'd sign on paper.
      </p>

      <div className="space-y-2">
        <Label htmlFor="buyer_signature_text">Your full legal name (signature) *</Label>
        <Controller
          name="buyer_signature_text"
          control={control}
          render={({ field }) => <BuyerSignature value={field.value} onChange={field.onChange} />}
        />
        {errors.buyer_signature_text && (
          <p className="text-xs text-red-500">{errors.buyer_signature_text.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="buyer_initials">Your initials *</Label>
        <Input
          id="buyer_initials"
          {...register('buyer_initials')}
          maxLength={6}
          className="w-32 font-semibold tracking-widest uppercase"
          placeholder="JS"
        />
        {errors.buyer_initials && (
          <p className="text-xs text-red-500">{errors.buyer_initials.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          You'll tap these next to each clause in the next step. We've pre-filled a guess from
          your name — change them if needed.
        </p>
      </div>

      <div className="pt-2">
        {adoptedAt ? (
          <div className="flex items-center gap-3 rounded-lg border border-leaf/40 bg-leaf/10 p-4">
            <Check className="h-5 w-5 text-leaf shrink-0" />
            <div className="text-sm text-ink">
              <p className="font-semibold">Adopted</p>
              <p className="text-xs text-muted-foreground">
                You can edit and re-adopt before continuing.
              </p>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            onClick={onAdopt}
            disabled={!canAdopt}
            className="w-full bg-primaryDeep hover:bg-primaryDeep/90 text-white"
            size="lg"
          >
            Adopt my signature & initials
          </Button>
        )}
      </div>
    </div>
  );
}
