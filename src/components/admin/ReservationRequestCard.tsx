// Detail panel for a deposit_request row that hasn't yet converted to a
// signed agreement. Lighter-weight than AgreementDetailPanel — the row
// has no payment, no signatures, and only a handful of admin actions:
// resend the wizard link, decline the request, or open the puppy detail
// page to configure the price / deposit override before sending the link.

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, X, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { sendDepositLink } from '@/lib/admin/deposit-requests-service';
import type { DepositRequest } from '@/types/deposit-request';

interface Props {
  request: DepositRequest;
}

export function ReservationRequestCard({ request }: Props) {
  const qc = useQueryClient();
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);

  const sendLinkMutation = useMutation({
    mutationFn: () => sendDepositLink(request.id),
    onSuccess: () => {
      toast.success('Reservation link emailed to the buyer.');
      qc.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send reservation link');
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await supabase
        .from('deposit_requests')
        .update({
          request_status: 'declined',
          decline_reason: reason || null,
          admin_reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reservation declined. The customer was not auto-emailed.');
      setShowDecline(false);
      setDeclineReason('');
      qc.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to decline');
    },
  });

  const canSendLink =
    request.request_status === 'accepted' || request.request_status === 'deposit_link_sent';
  const canDecline = request.request_status !== 'declined';

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <Field label="Buyer" value={request.customer_name} />
        <Field label="Email" value={request.customer_email} />
        <Field label="Phone" value={request.customer_phone ?? '—'} />
        <Field label="Origin" value={request.origin === 'admin_initiated' ? 'Admin created' : 'Public intake (legacy)'} />
        <Field label="Litter" value={request.upcoming_litter_label ?? '—'} />
        <Field label="Puppy slot" value={request.upcoming_puppy_placeholder_summary ?? request.puppy_name ?? '—'} />
        {request.preferred_payment_method && (
          <Field label="Preferred payment" value={request.preferred_payment_method} />
        )}
        {request.proposed_pickup_date && (
          <Field label="Proposed pickup" value={request.proposed_pickup_date} />
        )}
        {request.deposit_link_sent_at && (
          <Field
            label="Link last sent"
            value={new Date(request.deposit_link_sent_at).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          />
        )}
        {request.decline_reason && (
          <Field label="Decline reason" value={request.decline_reason} fullWidth />
        )}
        {request.admin_notes && <Field label="Admin notes" value={request.admin_notes} fullWidth />}
      </div>

      {/* Actions — always visible save/action area sits at the bottom so
          the admin never has to scroll to find the next button. */}
      <div className="border-t border-line pt-4 flex flex-wrap gap-2">
        {request.puppy_id && (
          <Link to={`/admin/puppies/${request.puppy_id}/edit`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1.5" /> Edit puppy / price
            </Button>
          </Link>
        )}
        <Button
          type="button"
          size="sm"
          className="bg-primaryDeep hover:bg-primaryDeep/90 text-white"
          disabled={!canSendLink || sendLinkMutation.isPending}
          onClick={() => sendLinkMutation.mutate()}
        >
          {sendLinkMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Mail className="h-4 w-4 mr-1.5" />
          )}
          {request.request_status === 'deposit_link_sent' ? 'Resend wizard link' : 'Send wizard link'}
        </Button>
        {canDecline && !showDecline && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowDecline(true)}>
            <X className="h-4 w-4 mr-1.5" /> Decline
          </Button>
        )}
      </div>

      {showDecline && (
        <div className="border-t border-line pt-4 space-y-2">
          <Label htmlFor="decline_reason" className="text-sm">
            Reason (shown internally; the buyer is not auto-notified)
          </Label>
          <Textarea
            id="decline_reason"
            rows={2}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="e.g. puppy already reserved by another customer"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={declineMutation.isPending}
              onClick={() => declineMutation.mutate(declineReason)}
            >
              {declineMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Confirm decline
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowDecline(false);
                setDeclineReason('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  );
}
