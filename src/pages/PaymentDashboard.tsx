// src/pages/PaymentDashboard.tsx
// PR 4 — Simplified buyer payment dashboard.
//
// Route: /payment/:agreementId/:buyerToken
//
// Section 1 — Deposit: payment handle + memo + "I've sent my deposit" button.
//   Optional screenshot upload (dispute protection framing, not a gate).
// Section 2 — Balance (deposit_only after deposit confirmed): same layout
//   for the final payment. Wired to mark-payment-sent in a future PR.
// Screenshot upload: UI present; actual storage wiring deferred to PR 6.

import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  Shield,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchAgreementByToken,
  markPaymentSent,
} from '@/lib/payment-dashboard-service';
import { fetchEnabledPaymentMethods } from '@/lib/deposit-service';
import { generatePaymentMemo, calculateBalanceDue } from '@/lib/utils/depositCalc';
import type { PaymentMethodKey } from '@/lib/constants/deposit';
import type { DepositAgreement } from '@/types/deposit';

const PHONE = '(321) 697-8864';

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

  const markSentMut = useMutation({
    mutationFn: () => markPaymentSent(agreementId, buyerToken),
    onSuccess: (res) => {
      if (res.already_marked) {
        toast.success("We already had your payment notice on file.");
      } else {
        toast.success("Got it — we'll watch for your payment and confirm by email.");
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
        <GateCard
          title="Missing payment link"
          body="This payment link is incomplete. Please use the link we emailed you, or contact us if you can't find it."
        />
      </PageShell>
    );
  }

  if (agreementQuery.isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
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
        <GateCard
          title="Reservation link not active"
          body="This payment link doesn't match an active reservation. Please call us and we'll issue a fresh link."
        />
      </PageShell>
    );
  }
  if (result.status === 'expired') {
    return (
      <PageShell>
        <GateCard
          title="Payment link expired"
          body="This link has expired. Call us and we'll send you a fresh one."
        />
      </PageShell>
    );
  }

  const a = result.agreement;
  const methods = methodsQuery.data ?? [];
  const depositMethod = methods.find((m) => m.method_key === a.deposit_payment_method);
  const balanceDue = calculateBalanceDue(a.purchase_price, a.deposit_amount);
  const memo = a.payment_memo ?? generatePaymentMemo(a.buyer_name, a.buyer_phone ?? null, 'Deposit');

  const isCountersigned = !!a.admin_signed_at;
  const isDepositConfirmed = a.deposit_status === 'admin_confirmed';
  const isDepositSent = !!a.buyer_marked_payment_sent_at;
  const isDepositOnly = a.payment_mode === 'deposit_only' || !a.payment_mode;

  return (
    <PageShell>
      {/* Header */}
      <Card>
        <CardHeader className="border-b bg-leaf/10">
          <CardTitle className="text-lg">Reservation #{a.agreement_number}</CardTitle>
          <p className="text-sm text-ink">
            <strong>{a.puppy_name}</strong>{a.breed ? ` · ${a.breed}` : ''}
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Purchase price" value={`$${a.purchase_price.toLocaleString()}`} />
            <Stat label="Deposit" value={`$${a.deposit_amount.toFixed(2)}`} highlight />
            <Stat label="Balance at pickup" value={`$${balanceDue.toFixed(2)}`} />
          </div>

          {/* Contract-not-countersigned notice */}
          {!isCountersigned && (
            <div className="flex items-start gap-2 rounded-lg border border-sun/40 bg-sun/10 p-3 text-sm text-ink">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-ink" />
              <div>
                <p className="font-medium">Agreement pending countersignature</p>
                <p className="text-xs text-inkSoft">
                  Your agreement is not final until we countersign. You'll receive a confirmation
                  email as soon as it's done — usually within a few hours.
                </p>
              </div>
            </div>
          )}

          {/* Section 1 — Deposit payment */}
          <DepositSection
            agreement={a}
            depositMethod={depositMethod}
            memo={memo}
            isDepositSent={isDepositSent}
            isDepositConfirmed={isDepositConfirmed}
            onMarkSent={() => markSentMut.mutate()}
            markSentPending={markSentMut.isPending}
          />

          {/* Section 2 — Balance (deposit-only, unlocks after deposit confirmed) */}
          {isDepositOnly && isDepositConfirmed && (
            <BalanceSection
              agreement={a}
              balanceDue={balanceDue}
              methods={methods}
            />
          )}

          <p className="text-xs text-center text-muted-foreground">
            Questions? Call <strong>{PHONE}</strong>.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}

// ── Section 1: Deposit ────────────────────────────────────────────────────

interface DepositSectionProps {
  agreement: DepositAgreement;
  depositMethod: PaymentMethodLite | undefined;
  memo: string;
  isDepositSent: boolean;
  isDepositConfirmed: boolean;
  onMarkSent: () => void;
  markSentPending: boolean;
}

function DepositSection({
  agreement,
  depositMethod,
  memo,
  isDepositSent,
  isDepositConfirmed,
  onMarkSent,
  markSentPending,
}: DepositSectionProps) {
  if (isDepositConfirmed) {
    return (
      <SectionCard>
        <SectionHeading>Deposit payment</SectionHeading>
        <div className="flex items-center gap-2 text-sm text-leaf font-medium">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Payment confirmed — deposit received
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionHeading>Send your deposit — ${agreement.deposit_amount.toFixed(2)}</SectionHeading>

      {depositMethod ? (
        <PaymentInstructions method={depositMethod} methodKey={agreement.deposit_payment_method} />
      ) : (
        <p className="text-sm text-ink">
          Payment method <code>{agreement.deposit_payment_method}</code> is not currently
          configured. Please call us at <strong>{PHONE}</strong>.
        </p>
      )}

      <MemoBlock memo={memo} />

      {isDepositSent ? (
        <div className="flex items-start gap-2 rounded-lg border border-leaf/30 bg-leaf/10 p-3 text-sm text-ink">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-leaf" />
          <div>
            <p className="font-medium">We've recorded your payment notice.</p>
            <p className="text-xs">
              Noticed{' '}
              {new Date(agreement.buyer_marked_payment_sent_at!).toLocaleString()}.
              We'll confirm receipt and email you once it lands.
            </p>
          </div>
        </div>
      ) : (
        <MarkSentBlock
          label="I've sent my deposit"
          onSubmit={onMarkSent}
          pending={markSentPending}
        />
      )}
    </SectionCard>
  );
}

// ── Section 2: Balance ────────────────────────────────────────────────────

interface BalanceSectionProps {
  agreement: DepositAgreement;
  balanceDue: number;
  methods: PaymentMethodLite[];
}

function BalanceSection({ agreement, balanceDue, methods }: BalanceSectionProps) {
  // Use final_payment_method_intended if set, otherwise fall back to deposit method.
  const balanceMethodKey =
    (agreement.final_payment_method_intended as PaymentMethodKey | undefined) ??
    agreement.deposit_payment_method;
  const balanceMethod = methods.find((m) => m.method_key === balanceMethodKey);
  const balanceMemo = generatePaymentMemo(
    agreement.buyer_name,
    agreement.buyer_phone ?? null,
    'Final Payment'
  );

  return (
    <SectionCard className="border-primaryDeep/20">
      <SectionHeading>Make your final payment — ${balanceDue.toFixed(2)}</SectionHeading>
      <p className="text-xs text-inkSoft">
        Your deposit was received. When you're ready to send the balance, use the instructions
        below. Call us at <strong>{PHONE}</strong> once you've sent it and we'll confirm.
      </p>

      {balanceMethod ? (
        <PaymentInstructions method={balanceMethod} methodKey={balanceMethodKey} />
      ) : (
        <p className="text-sm text-ink">
          Please call us at <strong>{PHONE}</strong> for balance payment instructions.
        </p>
      )}

      <MemoBlock memo={balanceMemo} />
    </SectionCard>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────

interface PaymentMethodLite {
  method_key: PaymentMethodKey;
  display_name: string;
  handle_or_recipient?: string | null;
  payment_note?: string | null;
  qr_code_public_url?: string | null;
  requires_manual_confirm: boolean;
}

function PaymentInstructions({
  method,
  methodKey,
}: {
  method: PaymentMethodLite;
  methodKey: PaymentMethodKey;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Method</p>
      <p className="text-base font-semibold">{method.display_name}</p>
      {method.handle_or_recipient && (
        <>
          <p className="text-xs font-medium text-muted-foreground">Send to</p>
          <code className="block rounded bg-background border px-3 py-2 text-sm font-mono">
            {method.handle_or_recipient}
          </code>
        </>
      )}
      {method.qr_code_public_url && (
        <div className="flex justify-center pt-1">
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
        <p className="text-sm bg-sun/15 border border-sun/30 rounded-sm p-2 text-ink">
          For Square, we'll email you an invoice link after receiving your reservation.
          Tax is calculated at checkout.
        </p>
      )}
      {methodKey === 'cash' && (
        <p className="text-sm bg-sun/15 border border-sun/30 rounded-sm p-2 text-ink">
          We prefer payment before pickup for safety. Call <strong>{PHONE}</strong> to coordinate.
        </p>
      )}
    </div>
  );
}

function MemoBlock({ memo }: { memo: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">
        Paste this into the note/memo field on your payment app:
      </p>
      <code className="block rounded bg-background border px-3 py-2 text-sm font-mono">
        {memo}
      </code>
    </div>
  );
}

function MarkSentBlock({
  label,
  onSubmit,
  pending,
}: {
  label: string;
  onSubmit: () => void;
  pending: boolean;
}) {
  // Screenshot upload — UI present; storage wiring deferred to PR 6.
  // TODO(PR 6): upload file to payment-evidence bucket via edge fn and pass path to onSubmit.
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      {/* Optional screenshot upload */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Upload a screenshot (optional — recommended)</span>
        </div>
        <p className="text-xs text-inkSoft">
          Attaching a screenshot of your payment creates a dispute packet that protects both of
          us if there's ever a question about this payment. Takes 10 seconds.
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
        >
          <Upload className="h-3 w-3" />
          {fileName ?? 'Choose screenshot…'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFileName(f ? f.name : null);
          }}
        />
        {fileName && (
          <p className="text-[11px] text-muted-foreground">{fileName} selected</p>
        )}
      </div>

      <Button
        type="button"
        className="w-full bg-primaryDeep hover:bg-primaryDeep/90 text-white"
        onClick={onSubmit}
        disabled={pending}
      >
        {pending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording…</>
        ) : (
          label
        )}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Tap this after you've sent the payment in your payment app.
      </p>
    </div>
  );
}

// ── Layout primitives ─────────────────────────────────────────────────────

function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border bg-muted/30 p-4 space-y-3 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-ink">{children}</h3>;
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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );
}

function GateCard({ title, body }: { title: string; body: string }) {
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
