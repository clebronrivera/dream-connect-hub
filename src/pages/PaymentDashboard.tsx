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

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchAgreementByToken,
  fetchPaymentAttestation,
  markPaymentSent,
  type PaymentAttestationRow,
} from '@/lib/payment-dashboard-service';
import {
  submitH1Attestation,
  submitH2Confirmation,
  tryGetGeolocation,
} from '@/lib/payment-attestation-service';
import { fetchEnabledPaymentMethods } from '@/lib/deposit-service';
import { generatePaymentMemo, calculateBalanceDue } from '@/lib/utils/depositCalc';
import type { PaymentMethodKey } from '@/lib/constants/deposit';
import type { DepositAgreement } from '@/types/deposit';

const PHONE = '(321) 418-1796';

export default function PaymentDashboard() {
  const { agreementId = '', buyerToken = '' } = useParams<{
    agreementId: string;
    buyerToken: string;
  }>();

  const qc = useQueryClient();

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

  // Wave H phase 1c — fetch the buyer's payment_attestations row to drive
  // the multi-step (H1 sign → H2 confirm → mark sent) flow below.
  const attestationEnabled =
    !!agreementId && !!buyerToken && agreementQuery.data?.status === 'ok';
  const attestationQuery = useQuery({
    queryKey: ['payment-attestation', agreementId, buyerToken],
    queryFn: () => fetchPaymentAttestation(agreementId, buyerToken),
    enabled: attestationEnabled,
    retry: false,
  });

  const markSentMut = useMutation({
    mutationFn: () => markPaymentSent(agreementId, buyerToken),
    onSuccess: (res) => {
      if (res.already_marked) {
        toast.success("We had already recorded your payment notice.");
      } else {
        toast.success("Got it — we'll watch for your payment and email a receipt once it lands.");
      }
      qc.invalidateQueries({ queryKey: ['payment-dashboard', agreementId, buyerToken] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Couldn't record your payment notice. Please try again or call us.");
    },
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

  return (
    <PageShell>
      <Card>
        <CardHeader className="border-b bg-leaf/10">
          <CardTitle className="text-lg">Reservation #{a.agreement_number}</CardTitle>
          <p className="text-sm text-ink">
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
              <p className="text-sm text-ink">
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

          {/* Wave H phase 1c+1d: multi-step flow (H1 attestation → H2
              confirmation → mark sent → done). Step is derived from the
              agreement's buyer_marked_payment_sent_at and the attestation
              row's attestation_status / confirmation_captured_at. */}
          <FlowSection
            agreement={a}
            attestation={attestationQuery.data ?? null}
            attestationLoading={attestationQuery.isLoading}
            method={method}
            memoPreview={memoPreview}
            agreementId={agreementId}
            buyerToken={buyerToken}
            onMarkSent={() => markSentMut.mutate()}
            markSentPending={markSentMut.isPending}
          />

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
        <p className="text-sm text-ink bg-sun/15 border border-sun/30 rounded-sm p-2">
          For Square, we'll email you the invoice link after we receive your reservation.
          Tax is calculated at checkout.
        </p>
      )}
      {methodKey === 'cash' && (
        <p className="text-sm text-ink bg-sun/15 border border-sun/30 rounded-sm p-2">
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
      <p className={`text-lg font-bold ${highlight ? 'text-leaf' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

// ── Wave H phase 1 multi-step flow ─────────────────────────────────────

interface FlowSectionProps {
  agreement: DepositAgreement;
  attestation: PaymentAttestationRow | null;
  attestationLoading: boolean;
  method: PaymentMethodLite | undefined;
  memoPreview: string;
  agreementId: string;
  buyerToken: string;
  onMarkSent: () => void;
  markSentPending: boolean;
}

function FlowSection({
  agreement,
  attestation,
  attestationLoading,
  method,
  memoPreview,
  agreementId,
  buyerToken,
  onMarkSent,
  markSentPending,
}: FlowSectionProps) {
  if (agreement.buyer_marked_payment_sent_at) {
    return (
      <section className="space-y-3 rounded-lg border border-leaf/30 bg-leaf/10 p-4">
        <h3 className="text-sm font-semibold text-ink">Payment recorded</h3>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 text-leaf mt-0.5 flex-shrink-0" />
          <div className="text-sm text-ink">
            <p className="font-medium">We've recorded that you sent payment.</p>
            <p className="text-xs">
              Marked sent{' '}
              {new Date(agreement.buyer_marked_payment_sent_at).toLocaleString()}
              . We'll confirm receipt and email you once it lands.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (attestationLoading) {
    return (
      <section className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading next step…
      </section>
    );
  }

  // H2: attestation signed but no confirmation yet → confirmation form.
  if (attestation && attestation.attestation_status === 'signed' && !attestation.confirmation_captured_at) {
    return (
      <H2Form
        agreementId={agreementId}
        buyerToken={buyerToken}
        memoPreview={memoPreview}
      />
    );
  }

  // Awaiting "I have sent payment" click — H1 + H2 both done, just need the click.
  if (attestation && attestation.attestation_status === 'signed' && attestation.confirmation_captured_at) {
    return (
      <section className="space-y-3 rounded-lg border border-primary/20 bg-primary/10 p-4">
        <h3 className="text-sm font-semibold text-ink">Final step</h3>
        <p className="text-sm text-ink">
          You've signed the attestation and uploaded your confirmation. Click below to let
          us know to start watching for your payment.
        </p>
        <Button
          type="button"
          className="bg-primaryDeep hover:bg-primary"
          onClick={onMarkSent}
          disabled={markSentPending}
        >
          {markSentPending ? 'Recording…' : 'I have sent payment'}
        </Button>
      </section>
    );
  }

  // Default: render H1 form.
  return (
    <H1Form
      agreement={agreement}
      method={method}
      agreementId={agreementId}
      buyerToken={buyerToken}
    />
  );
}

interface H1FormProps {
  agreement: DepositAgreement;
  method: PaymentMethodLite | undefined;
  agreementId: string;
  buyerToken: string;
}

function H1Form({ agreement, method, agreementId, buyerToken }: H1FormProps) {
  const qc = useQueryClient();
  const [buyerHandle, setBuyerHandle] = useState('');
  const [buyerPhone, setBuyerPhone] = useState(agreement.buyer_phone ?? '');
  const [file, setFile] = useState<File | null>(null);

  const handleToUse = method?.handle_or_recipient ?? '';
  const attestationText =
    `I confirm I am ${agreement.buyer_name} and I am sending payment from my own ` +
    `${method?.display_name ?? agreement.deposit_payment_method} account ${buyerHandle || '[your handle]'} ` +
    `to Dream Puppies. I authorize this payment and understand the deposit is non-refundable ` +
    `per the agreement I signed on ${new Date(agreement.created_at).toLocaleDateString()}.`;

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please upload a screenshot of your payment-app handle.');
      if (!buyerHandle.trim()) throw new Error('Please enter your payment-app handle.');
      const geolocation = await tryGetGeolocation();
      return submitH1Attestation({
        agreementId,
        buyerToken,
        paymentMethodHandleToUse: handleToUse || agreement.deposit_payment_method,
        buyerPaymentHandle: buyerHandle.trim(),
        buyerPhoneAtPayment: buyerPhone.trim() || undefined,
        paymentAttestationText: attestationText,
        geolocation,
        handleScreenshotFile: file,
      });
    },
    onSuccess: () => {
      toast.success('Attestation signed. One more step.');
      qc.invalidateQueries({ queryKey: ['payment-attestation', agreementId, buyerToken] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit = !!file && !!buyerHandle.trim() && !submitMut.isPending;

  return (
    <section className="space-y-3 rounded-lg border border-primary/20 bg-primary/10 p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Step 2 — Sign the payment attestation</h3>
        <p className="text-xs text-inkSoft mt-1">
          Before sending payment, please confirm a few details so we can match the
          incoming transfer to your reservation.
        </p>
      </div>

      <div className="space-y-3 rounded bg-background border p-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Send TO this handle</p>
          <code className="block text-sm font-mono mt-1">{handleToUse || '(set up by operator)'}</code>
        </div>

        <div>
          <Label htmlFor="buyer_handle">Your payment-app handle / email</Label>
          <Input
            id="buyer_handle"
            value={buyerHandle}
            onChange={(e) => setBuyerHandle(e.target.value)}
            placeholder="$YourCashtag, your.zelle@email.com, etc."
            disabled={submitMut.isPending}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            The handle / email / username on your payment app, in your legal name.
          </p>
        </div>

        <div>
          <Label htmlFor="buyer_phone_at_payment">Confirm your phone</Label>
          <Input
            id="buyer_phone_at_payment"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            placeholder="(555) 123-4567"
            disabled={submitMut.isPending}
          />
        </div>

        <div>
          <Label htmlFor="handle_screenshot">Screenshot of your payment-app handle (showing your name)</Label>
          <Input
            id="handle_screenshot"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={submitMut.isPending}
          />
          {file && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>

        <div className="rounded-sm border border-primary/20 bg-primary/10 p-3 text-xs text-ink space-y-1">
          <p className="font-medium">By clicking below you sign:</p>
          <p className="italic">{attestationText}</p>
        </div>

        <Button
          type="button"
          className="bg-primaryDeep hover:bg-primary"
          onClick={() => submitMut.mutate()}
          disabled={!canSubmit}
        >
          {submitMut.isPending ? 'Signing…' : 'Sign attestation and continue'}
        </Button>
      </div>
    </section>
  );
}

interface H2FormProps {
  agreementId: string;
  buyerToken: string;
  memoPreview: string;
}

function H2Form({ agreementId, buyerToken, memoPreview }: H2FormProps) {
  const qc = useQueryClient();
  const [transactionId, setTransactionId] = useState('');
  const [memoUsed, setMemoUsed] = useState(memoPreview);
  const [file, setFile] = useState<File | null>(null);

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please upload a screenshot of your payment confirmation.');
      if (!transactionId.trim()) throw new Error('Please enter the transaction reference id.');
      return submitH2Confirmation({
        agreementId,
        buyerToken,
        transactionReferenceId: transactionId.trim(),
        paymentMemoUsed: memoUsed.trim() || undefined,
        confirmationScreenshotFile: file,
      });
    },
    onSuccess: () => {
      toast.success('Confirmation recorded. Click "I have sent payment" to finish.');
      qc.invalidateQueries({ queryKey: ['payment-attestation', agreementId, buyerToken] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit = !!file && !!transactionId.trim() && !submitMut.isPending;

  return (
    <section className="space-y-3 rounded-lg border border-primary/20 bg-primary/10 p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Step 3 — Upload your payment confirmation</h3>
        <p className="text-xs text-inkSoft mt-1">
          After you send the deposit, attach a screenshot of the confirmation page from
          your payment app and the transaction reference id.
        </p>
      </div>

      <div className="space-y-3 rounded bg-background border p-3">
        <div>
          <Label htmlFor="confirmation_screenshot">Confirmation screenshot (amount, recipient, date, transaction ID visible)</Label>
          <Input
            id="confirmation_screenshot"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={submitMut.isPending}
          />
          {file && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="transaction_reference_id">Transaction reference id</Label>
          <Input
            id="transaction_reference_id"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="e.g. CB123456789, ZF-987654, TXN-…"
            disabled={submitMut.isPending}
          />
        </div>

        <div>
          <Label htmlFor="memo_used">Memo you actually used</Label>
          <Input
            id="memo_used"
            value={memoUsed}
            onChange={(e) => setMemoUsed(e.target.value)}
            placeholder={memoPreview}
            disabled={submitMut.isPending}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            We'll cross-check this against our copy of the memo string.
          </p>
        </div>

        <Button
          type="button"
          className="bg-primaryDeep hover:bg-primary"
          onClick={() => submitMut.mutate()}
          disabled={!canSubmit}
        >
          {submitMut.isPending ? 'Saving…' : 'Save confirmation and continue'}
        </Button>
      </div>
    </section>
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
        <div className="mx-auto h-12 w-12 rounded-full bg-sun/15 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-ink" />
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
