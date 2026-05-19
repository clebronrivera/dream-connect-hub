// Step 1 — choose between paying just the deposit now (with the balance due
// closer to pickup) or paying the full price up-front. Drives whether the
// wizard later shows the Final Payment Plan step and how the payment
// dashboard renders post-submit.

import { useFormContext } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { CircleDollarSign, Wallet } from 'lucide-react';
import type { WizardFormValues } from '@/components/wizard/wizardSchema';

interface StepPaymentChoiceProps {
  purchasePrice: number;
  depositAmount: number;
}

export function StepPaymentChoice({ purchasePrice, depositAmount }: StepPaymentChoiceProps) {
  const { watch, setValue } = useFormContext<WizardFormValues>();
  const value = watch('payment_mode');

  const balanceDue = Math.max(0, purchasePrice - depositAmount);
  const showPrices = purchasePrice > 0;

  const options: Array<{
    key: 'deposit_only' | 'full_payment';
    title: string;
    body: string;
    icon: typeof Wallet;
    amount: string;
  }> = [
    {
      key: 'deposit_only',
      title: 'Pay a deposit now',
      body: `Reserve your puppy with a refundable deposit. The remaining balance${
        showPrices ? ` ($${balanceDue.toFixed(2)})` : ''
      } is due at or before pickup.`,
      icon: Wallet,
      amount: showPrices ? `$${depositAmount.toFixed(2)}` : '—',
    },
    {
      key: 'full_payment',
      title: 'Pay the full price now',
      body: 'Pay your puppy in full today. No balance owed at pickup. Same protections apply.',
      icon: CircleDollarSign,
      amount: showPrices ? `$${purchasePrice.toFixed(2)}` : '—',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        You can adjust this with us later if your plans change. Either way, the same agreement
        protects both of us.
      </p>
      <div className="grid gap-3">
        {options.map(({ key, title, body, icon: Icon, amount }) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setValue('payment_mode', key, { shouldValidate: true, shouldDirty: true })}
              className={`text-left transition-all rounded-lg ${
                selected ? 'ring-2 ring-primaryDeep' : 'ring-1 ring-line hover:ring-primaryDeep/50'
              }`}
            >
              <Card className="border-0 bg-card">
                <CardContent className="p-5 flex gap-4 items-start">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                      selected ? 'bg-primaryDeep text-white' : 'bg-muted text-ink'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-ink">{title}</p>
                      <p className={`text-lg font-bold ${selected ? 'text-primaryDeep' : 'text-ink'}`}>
                        {amount}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{body}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
