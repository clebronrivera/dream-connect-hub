// src/pages/admin/AgreementDetailPanel.tsx
// Per-agreement action panel for admin dashboard

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminSignaturePad } from '@/components/signatures/AdminSignaturePad';
import { AgreementCommunicationsCard } from '@/components/admin/AgreementCommunicationsCard';
import {
  confirmDepositPayment,
  fetchAttestedBuyerHandle,
  saveAdminSignature,
  finalizeAgreement,
  confirmPickupDate,
  updateAgreementNotes,
  rejectDeposit,
  refundDeposit,
  cancelAgreement,
  sendPuppyGuide,
  sendTestimonialInvite,
  generateDisputeEvidencePacket,
  listDisputePackets,
  getDisputePacketUrl,
  getAgreementPdfUrl,
  type DisputePacket,
} from '@/lib/admin/agreements-service';
import type { DepositAgreement } from '@/types/deposit';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BookOpen,
  MessageSquarePlus,
  ClipboardCheck,
  FileArchive,
  FileDown,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// ── AgreementPdfCard (Wave F7) ────────────────────────────────────────────
// Shows when agreement_status = 'complete' and signed_pdf_storage_path is set.
// Each click mints a fresh 1-hour signed URL — never cached client-side.

interface AgreementPdfCardProps {
  storagePath: string;
  agreementNumber: string;
}

function AgreementPdfCard({ storagePath, agreementNumber }: AgreementPdfCardProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const url = await getAgreementPdfUrl(storagePath);
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to generate download link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileDown className="h-4 w-4" />
          Signed Agreement PDF
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {agreementNumber}.pdf
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? 'Getting link…' : '↓ Download'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Link expires 1 hour after each click.
        </p>
      </CardContent>
    </Card>
  );
}

// ── DisputeEvidenceCard + PacketRow ──────────────────────────────────────
// Named components defined outside AgreementDetailPanel to satisfy the
// React Compiler "Cannot create components during render" rule.

interface DisputeEvidenceCardProps {
  agreementId: string;
}

function DisputeEvidenceCard({ agreementId }: DisputeEvidenceCardProps) {
  const queryClient = useQueryClient();
  const [showPast, setShowPast] = useState(false);

  const packetsQ = useQuery({
    queryKey: ['dispute-packets', agreementId],
    queryFn:  () => listDisputePackets(agreementId),
  });

  const generateMut = useMutation({
    mutationFn: () => generateDisputeEvidencePacket(agreementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute-packets', agreementId] });
      toast.success('Evidence packet generated — click Download to get the file.');
    },
    onError: (err: Error) =>
      toast.error('Failed to generate packet: ' + err.message),
  });

  const packets = packetsQ.data ?? [];
  const [mostRecent, ...past] = packets;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileArchive className="h-4 w-4" />
            Dispute Evidence Packets
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending || packetsQ.isLoading}
          >
            {generateMut.isPending
              ? 'Building…'
              : mostRecent
              ? 'Generate Fresh'
              : 'Generate Packet'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {packetsQ.isLoading ? (
          <p className="text-xs text-muted-foreground italic">Loading…</p>
        ) : !mostRecent ? (
          <p className="text-xs text-muted-foreground italic">
            No packets generated yet.
          </p>
        ) : (
          <>
            <PacketRow packet={mostRecent} label="Most recent" />
            {past.length > 0 && (
              <div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
                  onClick={() => setShowPast((v) => !v)}
                >
                  {showPast
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />}
                  Past packets ({past.length})
                </button>
                {showPast && (
                  <ul className="mt-1.5 space-y-1.5 pl-4 border-l">
                    {past.map((p) => (
                      <PacketRow key={p.zip_path} packet={p} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface PacketRowProps {
  packet: DisputePacket;
  label?: string;
}

function PacketRow({ packet, label }: PacketRowProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const url = await getDisputePacketUrl(packet.zip_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Failed to get download URL — try again.');
    } finally {
      setLoading(false);
    }
  };

  const ts = packet.created_at
    ? format(new Date(packet.created_at), 'MMM d, yyyy h:mm a')
    : packet.name;

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-xs text-muted-foreground">
        {label && <span className="font-medium">{label} — </span>}
        {ts}
      </span>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleDownload} disabled={loading}>
        {loading ? 'Getting link…' : '↓ Download'}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

interface AgreementDetailPanelProps {
  agreement: DepositAgreement;
}

export function AgreementDetailPanel({ agreement }: AgreementDetailPanelProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(agreement.notes ?? '');
  const [counterDate, setCounterDate] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [senderHandle, setSenderHandle] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agreements'] });

  const isPaymentConfirmed = agreement.deposit_status === 'admin_confirmed';

  // Buyer's claimed payment handle from H1 attestation. Loaded only while
  // payment is unconfirmed — once confirmed the handle is captured on the
  // agreement row itself (operator_verified_sender_handle).
  const attestedHandleQ = useQuery({
    queryKey: ['attested-buyer-handle', agreement.id],
    queryFn: () => fetchAttestedBuyerHandle(agreement.id),
    enabled: !isPaymentConfirmed,
  });

  const confirmPaymentMut = useMutation({
    mutationFn: () => confirmDepositPayment(agreement.id, senderHandle),
    onSuccess: (result) => {
      if (result.mismatch) {
        toast.warning('Payment confirmed — sender handle does NOT match buyer attestation. Flagged for chargeback evidence.');
      } else {
        toast.success('Payment confirmed');
      }
      setSenderHandle('');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
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

  const puppyGuideMut = useMutation({
    mutationFn: () => sendPuppyGuide(agreement.id),
    onSuccess: () => toast.success(`Puppy guide sent to ${agreement.buyer_name}`),
    onError: (err: Error) => toast.error('Failed to send guide: ' + err.message),
  });

  const testimonialMut = useMutation({
    mutationFn: () => sendTestimonialInvite(agreement.id),
    onSuccess: () => toast.success('Testimonial invitation sent'),
    onError: (err: Error) => toast.error('Failed to send invitation: ' + err.message),
  });

  const isBuyerSigned = !!agreement.buyer_signed_at;
  const isAdminSigned = !!agreement.admin_signed_at;
  const allConditionsMet = isBuyerSigned && isAdminSigned && isPaymentConfirmed;
  const isCancelled = agreement.agreement_status === 'cancelled';

  return (
    <div className="space-y-6 p-4">
      {/* Agreement header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">{agreement.agreement_number}</h3>
          <p className="text-sm text-muted-foreground">{agreement.buyer_name} &middot; {agreement.puppy_name}</p>
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

      {/* Deposit summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Deposit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Price</p>
              <p className="font-bold">${agreement.purchase_price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Deposit</p>
              <p className="font-bold text-leaf">${agreement.deposit_amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Balance</p>
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
              <p className="text-muted-foreground">Proposed</p>
              <p className="font-medium">{agreement.proposed_pickup_date}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Confirmed</p>
              <p className="font-medium">{agreement.confirmed_pickup_date || 'Not confirmed'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Clock Start</p>
              <p className="font-medium">{agreement.pickup_clock_start}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Deadline</p>
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
        <CardContent className="space-y-3">
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Method:</span> {agreement.deposit_payment_method}</p>
            <p><span className="text-muted-foreground">Amount:</span> ${agreement.deposit_amount.toFixed(2)}</p>
            <p><span className="text-muted-foreground">Memo:</span> <code className="bg-muted px-1 rounded">{agreement.payment_memo}</code></p>
          </div>
          {['cash', 'square'].includes(agreement.deposit_payment_method) && (
            <div className="flex items-center gap-2 p-2 rounded-sm bg-sun/15 border border-sun/30">
              <AlertTriangle className="h-4 w-4 text-ink" />
              <span className="text-sm text-ink">Manual confirmation required</span>
            </div>
          )}
          {!isPaymentConfirmed && !isCancelled && (
            <div className="space-y-2 rounded border bg-muted/30 p-3">
              <div className="text-sm">
                <p className="text-muted-foreground">Buyer's claimed handle (from H1 attestation)</p>
                {attestedHandleQ.isLoading ? (
                  <p className="text-xs text-muted-foreground italic">Loading…</p>
                ) : attestedHandleQ.data ? (
                  <code className="bg-muted px-1 rounded font-medium">{attestedHandleQ.data}</code>
                ) : (
                  <p className="text-xs text-ink italic">
                    Buyer has not signed the H1 attestation yet — sender handle cannot be cross-checked.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="sender-handle" className="text-sm">
                  Sender handle (as it appeared in your payment app)
                </Label>
                <Input
                  id="sender-handle"
                  value={senderHandle}
                  onChange={e => setSenderHandle(e.target.value)}
                  placeholder="e.g. maria@example.com or +14075551212"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Type exactly as shown in the payment app. Mismatch with the buyer's claimed handle will be flagged but won't block confirmation.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => confirmPaymentMut.mutate()}
                disabled={confirmPaymentMut.isPending || !senderHandle.trim()}
              >
                {confirmPaymentMut.isPending ? 'Confirming…' : 'Confirm Payment Received'}
              </Button>
            </div>
          )}
          {isPaymentConfirmed && (
            <div className="space-y-2">
              <p className="text-sm text-leaf">
                Confirmed at {agreement.payment_confirmed_at ? format(new Date(agreement.payment_confirmed_at), 'MMM d, yyyy h:mm a') : ''}
              </p>
              {agreement.operator_verified_sender_handle && (
                <p className="text-xs text-muted-foreground">
                  Sender handle recorded:{' '}
                  <code className="bg-muted px-1 rounded">{agreement.operator_verified_sender_handle}</code>
                </p>
              )}
              {agreement.operator_handle_mismatch_flagged && (
                <div className="flex items-start gap-2 p-2 rounded-sm bg-sun/15 border border-sun/30">
                  <AlertTriangle className="h-4 w-4 text-ink mt-0.5 shrink-0" />
                  <div className="text-sm text-ink">
                    <p className="font-medium">Sender handle mismatch flagged</p>
                    <p className="text-xs">
                      The handle you typed differs from the buyer's H1 attestation. This is preserved as chargeback evidence — review before pickup if relevant.
                    </p>
                  </div>
                </div>
              )}
            </div>
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
              <p className="text-sm font-bold text-leaf mb-2">All conditions met — ready to finalize</p>
              <Button onClick={() => finalizeMut.mutate()} disabled={finalizeMut.isPending}>
                Finalize Agreement
              </Button>
            </div>
          )}
          {agreement.agreement_status === 'admin_approved' && (
            <p className="text-sm font-bold text-leaf pt-2">SALE FINAL</p>
          )}
        </CardContent>
      </Card>

      {/* Post-Sale Actions — only shown once agreement is fully finalized */}
      {agreement.agreement_status === 'admin_approved' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Post-Sale Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Pickup Handover</p>
                  <p className="text-xs text-muted-foreground">
                    Tablet flow at the kennel: ID check, photos, buyer signature, vet certificate.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" asChild className="shrink-0">
                <Link to={`/admin/pickup/${agreement.id}`}>Open Pickup Form</Link>
              </Button>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Send Puppy Care Guide</p>
                  <p className="text-xs text-muted-foreground">
                    Emails {agreement.buyer_name} a care and training guide for {agreement.puppy_name}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => puppyGuideMut.mutate()}
                disabled={puppyGuideMut.isPending}
                className="shrink-0"
              >
                {puppyGuideMut.isPending ? 'Sending…' : 'Send Guide'}
              </Button>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <MessageSquarePlus className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Request Testimonial</p>
                  <p className="text-xs text-muted-foreground">
                    Invites {agreement.buyer_name} to share their story on Dreamy Reviews
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => testimonialMut.mutate()}
                disabled={testimonialMut.isPending}
                className="shrink-0"
              >
                {testimonialMut.isPending ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signed agreement PDF download (Wave F7) */}
      {agreement.signed_pdf_storage_path && (
        <AgreementPdfCard
          storagePath={agreement.signed_pdf_storage_path}
          agreementNumber={agreement.agreement_number ?? agreement.id}
        />
      )}

      {/* Dispute evidence packets (Wave H H8) */}
      <DisputeEvidenceCard agreementId={agreement.id} />

      {/* Communications timeline + manual log (Wave H H5) */}
      <AgreementCommunicationsCard agreementId={agreement.id} />

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
        <CheckCircle2 className="h-4 w-4 text-leaf" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground/50" />
      )}
      <span className={met ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
      {met && timestamp && (
        <span className="text-xs text-muted-foreground ml-auto">
          {format(new Date(timestamp), 'MMM d, yyyy h:mm a')}
        </span>
      )}
    </div>
  );
}
