// src/pages/PaymentDashboard.tsx
// Wave D step 2 — buyer-side payment dashboard.
//
// After the buyer submits the deposit agreement, DepositForm redirects them
// here at /payment/<agreementId>/<buyerToken>. The page fetches the
// agreement via PostgREST with the buyer-token header (RLS gates access),
// shows the deposit amount + the chosen payment method's handle + the
// payment memo, and exposes an "I have sent payment" button.
//
// The button calls a stub for now — Wave D step 3 wires it to the
// `mark-payment-sent` edge function. Wave H1 will gate it on a buyer
// attestation.

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Loader2, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAgreementByToken } from '@/lib/payment-dashboard-service';
import { fetchEnabledPaymentMethods } from '@/lib/deposit-service';
import { generatePaymentMemo, calculateBalanceDue } from '@/lib/utils/depositCalc';
import type { PaymentMethodKey } from '@/lib/constants/deposit';

const PHONE = '(321) 697-8864';

export default function PaymentDashboard() {
  const { agreementId = '', buyerToken = '' } = useParams<{
    agreementId: string;
    buyerToken: string;
  }>();

  const agreementQuery = useQuery({
    queryKey: ['payment-dashboard', agreementId, buyerToken],
    queryFn: () => fetchAgreementByToken(agreementId, buyerToken),
    enabled: !!agreementId && !!buyerToken,
    retry: false,
  });

  const methodsQuery = useQuery({
    queryKey: ['payment-methods-enabled'],
    queryFn: fetchEnabledPaymentMethods,
  });

  if (!agreementId || !buyerToken) {
    return (
      <PageShell>
        <GateMessage
          title="Missing payment link"
          body="This payment link is incomplete. Please use the link we emailed you, or contact us if you can't find it."
        />
      </PageShell>
    );
  }

  if (agreementQuery.isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your reservation…</span>
        </div>
      </PageShell>
    );
  }

  const result = agreementQuery.data;
  if (!result || result.status === 'not_found') {
    return (
      <PageShell>
        <GateMessage
          title="Reservation link not active"
          body="This payment link doesn't match an active reservation. Tokens expire 30 days after the agreement is created. Please call us so we can issue a fresh link."
        />
      </PageShell>
    );
  }
  if (result.status === 'expired') {
    return (
      <PageShell>
        <GateMessage
          title="Payment link expired"
          body="This link is past its 30-day window. Call us and we'll send you a fresh one."
        />
      </PageShell>
    );
  }

  const a = result.agreement;
  const method = methodsQuery.data?.find((m) => m.method_key === a.deposit_payment_method);
  const balanceDue = calculateBalanceDue(a.purchase_price, a.deposit_amount);
  const memoPreview =
    a.payment_memo ??
    generatePaymentMemo(a.buyer_name, a.buyer_phone ?? null, 'Deposit');
  const alreadyMarkedSent = !!a.buyer_marked_payment_sent_at;

  return (
    <PageShell>
      <Card>
        <CardHeader className="border-b bg-emerald-50">
          <CardTitle className="text-lg">Reservation #{a.agreement_number}</CardTitle>
          <p className="text-sm text-emerald-900">
            Reserved: <strong>{a.puppy_name}</strong>
            {a.breed ? ` · ${a.breed}` : ''}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <section className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Purchase price" value={`$${a.purchase_price.toLocaleString()}`} />
            <Stat label="Deposit due" value={`$${a.deposit_amount.toFixed(2)}`} highlight />
            <Stat label="Balance due at pickup" value={`$${balanceDue.toFixed(2)}`} />
          </section>

          <section className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h3 className="text-sm font-semibold">Send your deposit</h3>
            {method ? (
              <PaymentInstructions methodKey={a.deposit_payment_method} method={method} />
            ) : methodsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading payment instructions…</p>
            ) : (
              <p className="text-sm text-amber-700">
                Selected method <code>{a.deposit_payment_method}</code> is not currently
                enabled. Please call us at <strong>{PHONE}</strong>.
              </p>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Payment memo (paste this into the note field on your payment app):
              </p>
              <code className="block rounded bg-background border px-3 py-2 text-sm font-mono">
                {memoPreview}
              </code>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-900">After you send</h3>
            {alreadyMarkedSent ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-emerald-900">
                  <p className="font-medium">We've recorded that you sent payment</p>
                  <p className="text-xs">
                    Marked sent{' '}
                    {a.buyer_marked_payment_sent_at
                      ? new Date(a.buyer_marked_payment_sent_at).toLocaleString()
                      : ''}
                    . We'll confirm receipt and email you a receipt shortly.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-blue-900">
                  Once you've sent the deposit through your payment app, click the button
                  below so we know to look for it. We'll match the incoming payment to
                  your reservation using the memo above.
                </p>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled
                  title="Coming in the next deploy"
                >
                  I have sent payment
                </Button>
                <p className="text-xs text-blue-800/70">
                  (Button activates after the next deploy. Until then, we'll see your
                  payment land via the memo string above.)
                </p>
              </>
            )}
          </section>

          <p className="text-xs text-center text-muted-foreground">
            Questions? Call <strong>{PHONE}</strong>. This payment link works for 30 days
            from the date you signed the agreement.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}

interface PaymentMethodLite {
  method_key: PaymentMethodKey;
  display_name: string;
  handle_or_recipient?: string | null;
  payment_note?: string | null;
  qr_code_public_url?: string | null;
  requires_manual_confirm: boolean;
}

function PaymentInstructions({
  methodKey,
  method,
}: {
  methodKey: PaymentMethodKey;
  method: PaymentMethodLite;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Method</p>
        <p className="text-base font-semibold">{method.display_name}</p>
      </div>
      {method.handle_or_recipient && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Send to</p>
          <code className="block rounded bg-background border px-3 py-2 text-sm font-mono">
            {method.handle_or_recipient}
          </code>
        </div>
      )}
      {method.qr_code_public_url && (
        <div className="flex justify-center">
          <img
            src={method.qr_code_public_url}
            alt={`${method.display_name} QR code`}
            className="h-40 w-40 rounded-lg border"
          />
        </div>
      )}
      {method.payment_note && (
        <p className="text-sm italic text-muted-foreground">{method.payment_note}</p>
      )}
      {methodKey === 'square' && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          For Square, we'll email you the invoice link after we receive your reservation.
          Tax is calculated at checkout.
        </p>
      )}
      {methodKey === 'cash' && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          We prefer payment before pickup for safety. Call <strong>{PHONE}</strong> to
          coordinate.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-emerald-700' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );
}

interface GateMessageProps {
  title: string;
  body: string;
}

function GateMessage({ title, body }: GateMessageProps) {
  return (
    <Card>
      <CardContent className="pt-8 space-y-3 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-amber-700" />
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
        <p className="text-sm flex items-center justify-center gap-1 text-foreground">
          <Phone className="h-4 w-4" /> <strong>{PHONE}</strong>
        </p>
      </CardContent>
    </Card>
  );
}
