// Step 8 — pick a payment method. We pull live config from
// `payment_methods_config` so admins can update handles/QR codes without a
// deploy. The actual handle + QR are displayed here so the buyer can pay
// out-of-band; the post-submit Payment Dashboard repeats the same info.
//
// TODO(Carlos): provide handles for Zelle / Venmo / Cash App via the
// existing /admin/payment-settings UI before this is exercised in prod. If
// no method is configured the buyer will see an empty-state for that row;
// the wizard still lets them pick and proceed.

import { Controller, useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchEnabledPaymentMethods } from '@/lib/deposit-service';
import { generatePaymentMemo } from '@/lib/utils/depositCalc';
import type { PaymentMethodKey } from '@/lib/constants/deposit';
import type { WizardFormValues } from '@/components/wizard/wizardSchema';

interface StepPaymentMethodProps {
  paymentMode?: 'deposit_only' | 'full_payment';
  amountDue: number;
}

export function StepPaymentMethod({ paymentMode, amountDue }: StepPaymentMethodProps) {
  const { control, watch } = useFormContext<WizardFormValues>();
  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment-methods-enabled'],
    queryFn: fetchEnabledPaymentMethods,
  });

  const selectedKey = watch('deposit_payment_method') as PaymentMethodKey;
  const selected = methods.find((m) => m.method_key === selectedKey);
  const buyerName = watch('buyer_name') || 'Your Name';
  const buyerPhone = watch('buyer_phone') || '';
  const memo = generatePaymentMemo(
    buyerName,
    buyerPhone,
    paymentMode === 'full_payment' ? 'Full Payment' : 'Deposit'
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-muted/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount due now</p>
        <p className="text-2xl font-bold text-ink">${amountDue.toFixed(2)}</p>
      </div>

      <Controller
        name="deposit_payment_method"
        control={control}
        render={({ field }) => (
          <div className="grid gap-2">
            {(['zelle', 'venmo', 'cashapp', 'apple_pay', 'square', 'cash'] as PaymentMethodKey[]).map((key) => {
              const cfg = methods.find((m) => m.method_key === key);
              const isSelected = field.value === key;
              const label = cfg?.display_name ?? prettyName(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => field.onChange(key)}
                  className={`text-left rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? 'border-primaryDeep bg-primaryDeep/5 ring-1 ring-primaryDeep'
                      : 'border-line bg-card hover:border-primaryDeep/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{label}</p>
                    {cfg?.requires_manual_confirm && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        confirmed manually
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading payment options…
        </div>
      )}

      {selected && (
        <div className="rounded-lg border border-line bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-ink">How to pay with {selected.display_name}</p>
          {selected.handle_or_recipient ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Send to</p>
              <p className="font-mono text-base text-ink">{selected.handle_or_recipient}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No handle on file. Please call (321) 697-8864 for instructions, or pick a different
              method.
            </p>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Memo</p>
            <p className="font-mono text-sm text-ink">{memo}</p>
          </div>
          {selected.qr_code_public_url && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">QR code</p>
              <img
                src={selected.qr_code_public_url}
                alt={`${selected.display_name} QR code`}
                className="h-40 w-40 rounded-md border border-line"
              />
            </div>
          )}
          {selected.payment_note && (
            <p className="text-sm text-muted-foreground">{selected.payment_note}</p>
          )}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-line">
        <Label className="text-xs text-muted-foreground">
          How do you plan to pay the balance? (optional)
        </Label>
        <Controller
          name="final_payment_method_intended"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Same as above" />
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

      <p className="text-xs text-muted-foreground">
        You'll be able to mark the payment as sent (and optionally upload a screenshot) right
        after submitting the wizard.
      </p>
    </div>
  );
}

function prettyName(key: PaymentMethodKey): string {
  switch (key) {
    case 'zelle':
      return 'Zelle';
    case 'venmo':
      return 'Venmo';
    case 'cashapp':
      return 'Cash App';
    case 'apple_pay':
      return 'Apple Pay';
    case 'square':
      return 'Square';
    case 'cash':
      return 'Cash';
    default:
      return key;
  }
}
