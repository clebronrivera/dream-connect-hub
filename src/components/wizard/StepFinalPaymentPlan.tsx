// Step 9 — only shown when `payment_mode === 'deposit_only'`. Buyer
// declares their intent for paying the remaining balance. Not legally
// binding; just helps Carlos plan the pickup-day cadence and pick the
// right reminder schedule.

import { Controller, useFormContext } from 'react-hook-form';
import { Clock, Hand, HelpCircle } from 'lucide-react';
import type { WizardFormValues } from '@/components/wizard/wizardSchema';

interface StepFinalPaymentPlanProps {
  balanceDue: number;
}

export function StepFinalPaymentPlan({ balanceDue }: StepFinalPaymentPlanProps) {
  const { control } = useFormContext<WizardFormValues>();

  const options: Array<{
    value: 'pay_before_pickup' | 'pay_at_pickup' | 'unsure';
    title: string;
    body: string;
    icon: typeof Clock;
  }> = [
    {
      value: 'pay_before_pickup',
      title: 'I plan to pay before pickup',
      body: 'You will send the balance digitally a few days before pickup. We will send you a reminder 7 days out.',
      icon: Clock,
    },
    {
      value: 'pay_at_pickup',
      title: 'I plan to pay at pickup',
      body: 'You will bring the balance with you at pickup. Acceptable methods include cash, Zelle, or Venmo.',
      icon: Hand,
    },
    {
      value: 'unsure',
      title: "I'm not sure yet",
      body: 'No problem — we will check in closer to pickup and help you decide.',
      icon: HelpCircle,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-muted/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Balance due at pickup</p>
        <p className="text-2xl font-bold text-ink">${balanceDue.toFixed(2)}</p>
      </div>

      <Controller
        name="final_payment_plan"
        control={control}
        render={({ field }) => (
          <div className="grid gap-3">
            {options.map(({ value, title, body, icon: Icon }) => {
              const selected = field.value === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => field.onChange(value)}
                  className={`text-left rounded-lg border p-4 transition-colors flex gap-3 items-start ${
                    selected
                      ? 'border-primaryDeep bg-primaryDeep/5 ring-1 ring-primaryDeep'
                      : 'border-line bg-card hover:border-primaryDeep/50'
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      selected ? 'bg-primaryDeep text-white' : 'bg-muted text-ink'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink">{title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{body}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      />

      <p className="text-xs text-muted-foreground">
        This is informational. You can change your mind right up to pickup day.
      </p>
    </div>
  );
}
