// Step 10 — summary + submit. Shows the buyer what they are about to
// submit, plus the "contract not valid until countersigned" disclosure so
// nobody is surprised when the dashboard initially shows "awaiting
// confirmation". Tapping the wizard's Submit button (provided by
// WizardShell) fires the parent's handleSubmit → submitDepositAgreement.

import { useFormContext } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import type { WizardFormValues } from '@/components/wizard/wizardSchema';

interface StepReviewProps {
  puppyName: string;
  breed: string;
  depositAmount: number;
  purchasePrice: number;
  paymentMode?: 'deposit_only' | 'full_payment';
  allAcksStamped: boolean;
}

export function StepReview({
  puppyName,
  breed,
  depositAmount,
  purchasePrice,
  paymentMode,
  allAcksStamped,
}: StepReviewProps) {
  const { watch } = useFormContext<WizardFormValues>();
  const buyer = watch('buyer_name');
  const email = watch('buyer_email');
  const phone = watch('buyer_phone');
  const street = watch('buyer_street');
  const city = watch('buyer_city');
  const state = watch('buyer_state');
  const zip = watch('buyer_zip');
  const pickup = watch('proposed_pickup_date');
  const method = watch('deposit_payment_method');
  const plan = watch('final_payment_plan');

  const balanceDue = Math.max(0, purchasePrice - depositAmount);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5 space-y-4">
          <Row label="Puppy" value={`${puppyName}${breed ? ` · ${breed}` : ''}`} />
          <Row label="Buyer" value={buyer || '—'} />
          <Row label="Email" value={email || '—'} />
          <Row label="Phone" value={phone || '—'} />
          <Row
            label="Address"
            value={[street, city, state, zip].filter(Boolean).join(', ') || '—'}
          />
          <Row label="Pickup date" value={pickup || '—'} />
          <Row
            label="Payment plan"
            value={paymentMode === 'full_payment' ? 'Pay full price now' : 'Deposit now, balance later'}
          />
          <Row label="Amount due today" value={`$${depositAmount.toFixed(2)}`} highlight />
          {paymentMode === 'deposit_only' && (
            <Row label="Balance due at pickup" value={`$${balanceDue.toFixed(2)}`} />
          )}
          {paymentMode === 'deposit_only' && plan && (
            <Row
              label="Balance plan"
              value={
                plan === 'pay_before_pickup'
                  ? 'Pay before pickup'
                  : plan === 'pay_at_pickup'
                    ? 'Pay at pickup'
                    : 'Decide later'
              }
            />
          )}
          <Row
            label="Payment method"
            value={method ? method.charAt(0).toUpperCase() + method.slice(1) : '—'}
          />
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold mb-1">Heads up</p>
        <p>
          Your reservation isn't legally final until Carlos or Yolanda countersigns. We'll review
          your submission and confirm by email within 24 hours. If something doesn't match (e.g.
          puppy already reserved), we'll refund any payment immediately.
        </p>
      </div>

      {!allAcksStamped && (
        <p className="text-xs text-amber-700">
          Go back to the agreement step and stamp every clause before submitting.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line last:border-0 pb-2 last:pb-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`text-sm ${highlight ? 'font-bold text-primaryDeep' : 'text-ink'}`}>
        {value}
      </span>
    </div>
  );
}
