// src/pages/admin/AgreementDetailPanel.tsx
// Per-agreement action panel for admin dashboard

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminSignaturePad } from '@/components/signatures/AdminSignaturePad';
import { getDepositExplanation } from '@/lib/utils/depositCalc';
import {
  confirmDepositPayment,
  saveAdminSignature,
  finalizeAgreement,
  confirmPickupDate,
  updateAgreementNotes,
  rejectDeposit,
  refundDeposit,
  cancelAgreement,
} from '@/lib/admin/agreements-service';
import type { DepositAgreement } from '@/types/deposit';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface AgreementDetailPanelProps {
  agreement: DepositAgreement;
}

export function AgreementDetailPanel({ agreement }: AgreementDetailPanelProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(agreement.notes ?? '');
  const [counterDate, setCounterDate] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agreements'] });

  const confirmPaymentMut = useMutation({
    mutationFn: () => confirmDepositPayment(agreement.id),
    onSuccess: () => { toast.success('Payment confirmed'); invalidate(); },
  });

  const adminSignMut = useMutation({
    mutationFn: (params: { svgData: string; sellerName: string }) =>
      saveAdminSignature(agreement.id, params.svgData, params.sellerName),
    onSuccess: () => { toast.success('Signature saved'); invalidate(); },
  });

  const finalizeMut = useMutation({
    mutationFn: () => finalizeAgreement(agreement.id),
    onSuccess: () => { toast.success('Agreement finalized'); invalidate(); },
  });

  const confirmDateMut = useMutation({
    mutationFn: (date: string) => confirmPickupDate(agreement.id, date),
    onSuccess: () => { toast.success('Pickup date confirmed'); invalidate(); },
  });

  const saveNotesMut = useMutation({
    mutationFn: () => updateAgreementNotes(agreement.id, notes),
    onSuccess: () => toast.success('Notes saved'),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectDeposit(agreement.id, rejectReason),
    onSuccess: () => { toast.success('Deposit rejected'); invalidate(); },
  });

  const refundMut = useMutation({
    mutationFn: () => refundDeposit(agreement.id, rejectReason),
    onSuccess: () => { toast.success('Deposit refunded'); invalidate(); },
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelAgreement(agreement.id),
    onSuccess: () => { toast.success('Agreement cancelled'); invalidate(); },
  });

  const puppyDob = agreement.puppy_dob ? new Date(agreement.puppy_dob) : null;
  const isBuyerSigned = !!agreement.buyer_signed_at;
  const isAdminSigned = !!agreement.admin_signed_at;
  const isPaymentConfirmed = agreement.deposit_status === 'admin_confirmed';
  const allConditionsMet = isBuyerSigned && isAdminSigned && isPaymentConfirmed;
  const isCancelled = agreement.agreement_status === 'cancelled';

  return (
    <div className="space-y-6 p-4">
      {/* Agreement header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">{agreement.agreement_number}</h3>
          <p className="text-sm text-gray-500">{agreement.buyer_name} &middot; {agreement.puppy_name}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={agreement.deposit_status === 'admin_confirmed' ? 'default' : 'secondary'}>
            {agreement.deposit_status}
          </Badge>
          <Badge variant={agreement.agreement_status === 'admin_approved' ? 'default' : 'outline'}>
            {agreement.agreement_status}
          </Badge>
        </div>
      </div>

      {/* Deposit tier explanation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Deposit Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{getDepositExplanation(agreement.purchase_price, puppyDob)}</p>
          <div className="grid grid-cols-3 gap-4 mt-3 text-center text-sm">
            <div>
              <p className="text-gray-500">Price</p>
              <p className="font-bold">${agreement.purchase_price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Deposit</p>
              <p className="font-bold text-green-700">${agreement.deposit_amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Balance</p>
              <p className="font-bold">${agreement.balance_due.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pickup date section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pickup Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Proposed</p>
              <p className="font-medium">{agreement.proposed_pickup_date}</p>
            </div>
            <div>
              <p className="text-gray-500">Confirmed</p>
              <p className="font-medium">{agreement.confirmed_pickup_date || 'Not confirmed'}</p>
            </div>
            <div>
              <p className="text-gray-500">Clock Start</p>
              <p className="font-medium">{agreement.pickup_clock_start}</p>
            </div>
            <div>
              <p className="text-gray-500">Deadline</p>
              <p className="font-medium">{agreement.pickup_deadline}</p>
            </div>
          </div>
          {!agreement.confirmed_pickup_date && !isCancelled && (
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => confirmDateMut.mutate(agreement.proposed_pickup_date)}>
                Confirm Proposed Date
              </Button>
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={counterDate}
                  onChange={e => setCounterDate(e.target.value)}
                  className="w-40"
                />
                <Button size="sm" variant="outline" onClick={() => counterDate && confirmDateMut.mutate(counterDate)}>
                  Counter-Propose
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment confirmation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Payment Confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Method:</span> {agreement.deposit_payment_method}</p>
            <p><span className="text-gray-500">Amount:</span> ${agreement.deposit_amount.toFixed(2)}</p>
            <p><span className="text-gray-500">Memo:</span> <code className="bg-gray-100 px-1 rounded">{agreement.payment_memo}</code></p>
          </div>
          {['cash', 'square'].includes(agreement.deposit_payment_method) && (
            <div className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">Manual confirmation required</span>
            </div>
          )}
          {!isPaymentConfirmed && !isCancelled && (
            <Button
              size="sm"
              onClick={() => confirmPaymentMut.mutate()}
              disabled={confirmPaymentMut.isPending}
            >
              Confirm Payment Received
            </Button>
          )}
          {isPaymentConfirmed && (
            <p className="text-sm text-green-600">
              Confirmed at {agreement.payment_confirmed_at ? format(new Date(agreement.payment_confirmed_at), 'MMM d, yyyy h:mm a') : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Admin signature */}
      {!isCancelled && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Admin Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminSignaturePad
              onSign={({ svgData, sellerName }) => adminSignMut.mutate({ svgData, sellerName })}
              disabled={isAdminSigned}
              existingSignature={agreement.admin_signature_svg ?? undefined}
              existingSellerName={agreement.admin_signature_name ?? undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Finalization status block */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Finalization Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <StatusLine
              met={isBuyerSigned}
              label="Buyer signed"
              timestamp={agreement.buyer_signed_at}
            />
            <StatusLine
              met={isPaymentConfirmed}
              label="Payment confirmed"
              timestamp={agreement.payment_confirmed_at}
            />
            <StatusLine
              met={isAdminSigned}
              label="Admin approved"
              timestamp={agreement.admin_signed_at}
            />
          </div>
          {allConditionsMet && agreement.agreement_status !== 'admin_approved' && (
            <div className="pt-2">
              <p className="text-sm font-bold text-green-700 mb-2">All conditions met — ready to finalize</p>
              <Button onClick={() => finalizeMut.mutate()} disabled={finalizeMut.isPending}>
                Finalize Agreement
              </Button>
            </div>
          )}
          {agreement.agreement_status === 'admin_approved' && (
            <p className="text-sm font-bold text-green-700 pt-2">SALE FINAL</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Admin Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          <Button size="sm" variant="outline" onClick={() => saveNotesMut.mutate()} disabled={saveNotesMut.isPending}>
            Save Notes
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      {!isCancelled && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <button
              type="button"
              className="text-sm font-medium text-red-600 hover:text-red-800"
              onClick={() => setShowDangerZone(!showDangerZone)}
            >
              {showDangerZone ? 'Hide' : 'Show'} Danger Zone
            </button>
          </CardHeader>
          {showDangerZone && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-red-700">Reason (required for reject/refund)</Label>
                <Textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => rejectMut.mutate()}
                  disabled={!rejectReason || rejectMut.isPending}
                >
                  Reject Deposit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => refundMut.mutate()}
                  disabled={!rejectReason || refundMut.isPending}
                >
                  Refund Deposit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700"
                  onClick={() => cancelMut.mutate()}
                  disabled={cancelMut.isPending}
                >
                  Cancel Agreement
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

function StatusLine({ met, label, timestamp }: { met: boolean; label: string; timestamp?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-gray-300" />
      )}
      <span className={met ? 'text-gray-900' : 'text-gray-400'}>{label}</span>
      {met && timestamp && (
        <span className="text-xs text-gray-400 ml-auto">
          {format(new Date(timestamp), 'MMM d, yyyy h:mm a')}
        </span>
      )}
    </div>
  );
}
