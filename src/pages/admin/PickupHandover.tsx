// src/pages/admin/PickupHandover.tsx
// PR 5 — Simplified 3-step in-person pickup handover.
// Step 1: payment check → Step 2: visual inspection → Step 3: bill of sale.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { BuyerSignature } from '@/components/signatures/BuyerSignature';

import { fetchAgreement, confirmDepositPayment } from '@/lib/admin/agreements-service';
import {
  fetchPickupHandover,
  upsertPickupHandover,
  finalizePickupHandover,
} from '@/lib/admin/pickup-handover-service';
import type { DepositAgreement } from '@/types/deposit';
import type { PickupHandover } from '@/types/pickup-handover';

export default function PickupHandoverPage() {
  const { agreementId } = useParams<{ agreementId: string }>();
  const queryClient = useQueryClient();

  const agreementQ = useQuery({
    queryKey: ['agreement', agreementId],
    queryFn: () => fetchAgreement(agreementId!),
    enabled: !!agreementId,
  });

  const handoverQ = useQuery({
    queryKey: ['pickup-handover', agreementId],
    queryFn: () => fetchPickupHandover(agreementId!),
    enabled: !!agreementId,
  });

  if (!agreementId) return <div className="p-6">Missing agreement id.</div>;
  if (agreementQ.isLoading || handoverQ.isLoading) return <div className="p-6">Loading…</div>;
  if (!agreementQ.data) return <div className="p-6 text-destructive">Failed to load agreement.</div>;

  const agreement = agreementQ.data;
  const existingHandover = handoverQ.data ?? null;
  const isVerified = existingHandover?.handover_status === 'in_person_verified';

  return (
    <div className="space-y-5 p-4 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/reservations">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Pickup Handover</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {agreement.agreement_number} · {agreement.buyer_name} · {agreement.puppy_name}
              </p>
            </div>
            {isVerified && (
              <Badge className="bg-leaf/15 text-ink border-leaf/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Pickup date:{' '}
            <strong>{agreement.confirmed_pickup_date ?? agreement.proposed_pickup_date}</strong>
          </p>
        </CardContent>
      </Card>

      {isVerified ? (
        <VerifiedSummary handover={existingHandover!} />
      ) : (
        <StepFlow
          agreement={agreement}
          existingHandover={existingHandover}
          onFinalized={() => {
            queryClient.invalidateQueries({ queryKey: ['pickup-handover', agreementId] });
            queryClient.invalidateQueries({ queryKey: ['agreement', agreementId] });
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
          }}
        />
      )}
    </div>
  );
}

// ── 3-step flow ─────────────────────────────────────────────────────────

const INSPECTION_ITEMS = [
  'Puppy is alert and active',
  'Coat and eyes look healthy',
  'This is the same dog from the listing photos',
];

interface StepFlowProps {
  agreement: DepositAgreement;
  existingHandover: PickupHandover | null;
  onFinalized: () => void;
}

function StepFlow({ agreement, existingHandover, onFinalized }: StepFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inspectionChecks, setInspectionChecks] = useState([false, false, false]);
  const [idLastFour, setIdLastFour] = useState(existingHandover?.buyer_id_last_four ?? '');
  const [buyerSig, setBuyerSig] = useState('');
  const [staffInitials, setStaffInitials] = useState(existingHandover?.staff_member_initials ?? '');

  const isDepositConfirmed = agreement.deposit_status === 'admin_confirmed';
  const allChecked = inspectionChecks.every(Boolean);
  const pickupDate = agreement.confirmed_pickup_date ?? agreement.proposed_pickup_date;

  const cashMut = useMutation({
    mutationFn: () => confirmDepositPayment(agreement.id, 'cash'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreement', agreement.id] });
      toast.success('Payment marked received.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const finalizeMut = useMutation({
    mutationFn: async () => {
      if (!buyerSig.trim()) throw new Error('Buyer signature is required.');
      if (!staffInitials.trim()) throw new Error('Staff initials are required.');

      const now = new Date().toISOString();
      await upsertPickupHandover({
        agreement_id: agreement.id,
        pickup_date: pickupDate,
        buyer_id_last_four: idLastFour || null,
        buyer_signature_canvas: buyerSig.trim(),
        buyer_signature_at: now,
        staff_member_initials: staffInitials.trim(),
        staff_signature_at: now,
        visual_inspection_acknowledged_at: now,
        bill_of_sale_signed_at: now,
      } as Parameters<typeof upsertPickupHandover>[0]);

      return finalizePickupHandover(agreement.id);
    },
    onSuccess: (result) => {
      if (result.already_verified) toast.info('Pickup was already finalized.');
      else toast.success('Pickup finalized — welcome-home email sent!');
      onFinalized();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Step 1 — Payment check
  if (step === 1) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Step 1 of 3 — Payment check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {isDepositConfirmed ? (
              <Badge className="bg-leaf/15 text-ink border-leaf/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Deposit confirmed
              </Badge>
            ) : (
              <Badge variant="destructive">Deposit pending</Badge>
            )}
            {agreement.payment_mode === 'full_payment' && (
              <Badge variant="outline">Full payment</Badge>
            )}
          </div>

          {!isDepositConfirmed && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                The deposit has not been confirmed yet. If the buyer paid cash, mark it now.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cashMut.mutate()}
                disabled={cashMut.isPending}
              >
                {cashMut.isPending ? 'Marking…' : 'Mark cash / check received'}
              </Button>
            </div>
          )}

          {isDepositConfirmed && agreement.payment_mode === 'deposit_only' &&
            Number(agreement.balance_due) > 0 && (
            <p className="text-sm text-muted-foreground">
              Balance due: <strong>${Number(agreement.balance_due).toFixed(2)}</strong> — confirm
              you have collected the balance before finalizing.
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(2)} disabled={!isDepositConfirmed}>
              Continue →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2 — Visual inspection
  if (step === 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Step 2 of 3 — Visual inspection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {INSPECTION_ITEMS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox
                  id={`check-${i}`}
                  checked={inspectionChecks[i]}
                  onCheckedChange={(v) => {
                    const next = [...inspectionChecks];
                    next[i] = v === true;
                    setInspectionChecks(next);
                  }}
                />
                <Label htmlFor={`check-${i}`} className="text-sm">{label}</Label>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor="id-last-four" className="text-sm">
              ID last 4 digits{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="id-last-four"
              inputMode="numeric"
              maxLength={4}
              value={idLastFour}
              onChange={(e) => setIdLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              className="max-w-[8rem]"
            />
            <p className="text-xs text-muted-foreground">
              We never store the full ID number — last-4 only.
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>← Back</Button>
            <Button onClick={() => setStep(3)} disabled={!allChecked}>
              Buyer accepts delivery →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3 — Bill of sale
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Step 3 of 3 — Bill of sale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-y-1.5 text-sm border rounded p-3 bg-muted/30">
          <dt className="text-muted-foreground">Puppy</dt>
          <dd className="font-medium">{agreement.puppy_name}</dd>
          {agreement.breed && (
            <>
              <dt className="text-muted-foreground">Breed</dt>
              <dd className="font-medium">{agreement.breed}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Buyer</dt>
          <dd className="font-medium">{agreement.buyer_name}</dd>
          <dt className="text-muted-foreground">Date</dt>
          <dd className="font-medium">{new Date().toLocaleDateString()}</dd>
          <dt className="text-muted-foreground">Purchase price</dt>
          <dd className="font-medium">${Number(agreement.purchase_price).toFixed(2)}</dd>
          <dt className="text-muted-foreground">Deposit paid</dt>
          <dd className="font-medium">${Number(agreement.deposit_amount).toFixed(2)}</dd>
          {agreement.payment_mode === 'deposit_only' && Number(agreement.balance_due) > 0 && (
            <>
              <dt className="text-muted-foreground">Balance received</dt>
              <dd className="font-medium">${Number(agreement.balance_due).toFixed(2)}</dd>
            </>
          )}
        </dl>

        <BuyerSignature
          value={buyerSig}
          onChange={setBuyerSig}
          label="Buyer: type your full name to acknowledge receipt of puppy"
        />

        <div className="space-y-1">
          <Label htmlFor="staff-initials" className="text-sm">Staff initials</Label>
          <Input
            id="staff-initials"
            value={staffInitials}
            onChange={(e) => setStaffInitials(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="LB"
            className="max-w-[8rem]"
          />
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => setStep(2)}>← Back</Button>
          <Button
            size="lg"
            onClick={() => finalizeMut.mutate()}
            disabled={finalizeMut.isPending || !buyerSig.trim() || !staffInitials.trim()}
          >
            {finalizeMut.isPending ? 'Finalizing…' : 'Finalize Handover'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Verified summary ────────────────────────────────────────────────────

function VerifiedSummary({ handover }: { handover: PickupHandover }) {
  const rows: [string, string][] = [
    ['Pickup date', handover.pickup_date],
    ['ID last-4', handover.buyer_id_last_four ?? '—'],
    ['Staff initials', handover.staff_member_initials ?? '—'],
    [
      'Finalized at',
      handover.bill_of_sale_signed_at
        ? new Date(handover.bill_of_sale_signed_at).toLocaleString()
        : '—',
    ],
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Pickup record</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
