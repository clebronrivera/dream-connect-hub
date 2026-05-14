import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { PuppyInquiry } from '@/lib/supabase';
import { toDatetimeLocal } from '@/lib/date-utils';
import { Field, Section } from '@/components/admin/InquiryDetailShared';
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react';
import { fetchCustomerHistory } from '@/lib/admin/customers-service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PuppyInquiryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Selected row id; dialog fetches full row when open. */
  selectedId: string | null;
  /** List rows (current page) for next/prev navigation. */
  listRows: { id?: string }[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  queryKey: string[];
}

export function PuppyInquiryDetailDialog({
  open,
  onOpenChange,
  selectedId,
  listRows,
  currentIndex,
  onSelectIndex,
  queryKey,
}: PuppyInquiryDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inquiry } = useQuery({
    queryKey: ['puppy-inquiry-detail', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data, error } = await supabase
        .from('puppy_inquiries')
        .select('*')
        .eq('id', selectedId)
        .single();
      if (error) throw error;
      return data as PuppyInquiry;
    },
    enabled: open && !!selectedId,
  });

  const [status, setStatus] = useState<string>(inquiry?.status ?? 'active');
  const [adminNotes, setAdminNotes] = useState(inquiry?.admin_notes ?? '');

  const [followedUpAt, setFollowedUpAt] = useState(
    inquiry?.followed_up_at ? toDatetimeLocal(inquiry.followed_up_at) : ''
  );

  // Sync local editable state when loaded inquiry changes (adjusting state during render)
  const [prevInquiryId, setPrevInquiryId] = useState<string | null>(inquiry?.id ?? null);
  if (inquiry && inquiry.id !== prevInquiryId) {
    setPrevInquiryId(inquiry.id);
    setStatus(inquiry.status ?? 'active');
    setAdminNotes(inquiry.admin_notes ?? '');
    setFollowedUpAt(inquiry.followed_up_at ? toDatetimeLocal(inquiry.followed_up_at) : '');
  }

  const updateMutation = useMutation({
    mutationFn: async (updates: { status?: string; admin_notes?: string; followed_up_at?: string | null }) => {
      if (!inquiry?.id) throw new Error('No inquiry selected');
      const { error } = await supabase
        .from('puppy_inquiries')
        .update({
          ...updates,
          admin_viewed_at: new Date().toISOString(),
        })
        .eq('id', inquiry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ['puppy-inquiry-detail', selectedId] });
      toast({ title: 'Saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    const followedUpIso = followedUpAt ? new Date(followedUpAt).toISOString() : null;
    updateMutation.mutate({
      status,
      admin_notes: adminNotes || undefined,
      followed_up_at: followedUpIso,
    });
  };

  const sendDepositLinkMutation = useMutation({
    mutationFn: async () => {
      if (!inquiry?.id) throw new Error('No inquiry');
      const { data, error } = await supabase.functions.invoke(
        'send-deposit-link-from-inquiry',
        { body: { inquiry_id: inquiry.id } },
      );
      if (error) {
        const remoteMessage = (data as { error?: string } | null | undefined)?.error;
        throw new Error(remoteMessage || error.message || 'Failed to send');
      }
      return data as { deposit_request_id: string };
    },
    onSuccess: (data) => {
      toast({
        title: 'Deposit link sent',
        description: `Buyer emailed; deposit request ${data.deposit_request_id}.`,
      });
      queryClient.invalidateQueries({ queryKey });
      if (selectedId)
        queryClient.invalidateQueries({ queryKey: ['puppy-inquiry-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-needs-attention'] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Could not send deposit link',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const canSendDepositLink =
    !!inquiry?.customer_id &&
    !!inquiry?.puppy_id &&
    UUID_RE.test(inquiry.puppy_id ?? '');

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < listRows.length - 1 && listRows.length > 1;
  const prevInquiry = hasPrev ? listRows[currentIndex - 1] : null;
  const nextInquiry = hasNext ? listRows[currentIndex + 1] : null;

  if (!inquiry) return null;

  const createdDate = inquiry.created_at
    ? new Date(inquiry.created_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Puppy Inquiry</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!hasPrev}
                onClick={() => prevInquiry && onSelectIndex(currentIndex - 1)}
                aria-label="Previous inquiry"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-normal text-muted-foreground tabular-nums">
                {currentIndex + 1} / {listRows.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!hasNext}
                onClick={() => nextInquiry && onSelectIndex(currentIndex + 1)}
                aria-label="Next inquiry"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Section title="Received">
            <Field label="Date" value={createdDate} />
            <Field label="Puppy" value={inquiry.puppy_name ?? inquiry.puppy_name_at_submit ?? (inquiry.puppy_id ? 'Puppy selected' : null)} />
          </Section>

          <Section title="Contact">
            <Field label="Name" value={inquiry.name} />
            <Field label="Email" value={inquiry.email} />
            <Field label="Phone" value={inquiry.phone} />
            <Field label="City" value={inquiry.city} />
            <Field label="State" value={inquiry.state} />
          </Section>

          <Section title="Details">
            <Field label="Timeline" value={inquiry.timeline} />
            <Field label="Experience" value={inquiry.experience} />
            <Field label="Household" value={inquiry.household_description} />
            {inquiry.additional_comments && (
              <Field label="Additional comments" value={inquiry.additional_comments} />
            )}
          </Section>

          {inquiry.customer_id ? (
            <CustomerHistorySection
              customerId={inquiry.customer_id}
              currentInquiryId={inquiry.id ?? null}
            />
          ) : null}

          <Section title="Admin">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="puppy-admin-notes">Note</Label>
                <Textarea
                  id="puppy-admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add a note about this inquiry…"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="puppy-followed-up-at">Followed up (date & time)</Label>
                <Input
                  id="puppy-followed-up-at"
                  type="datetime-local"
                  value={followedUpAt}
                  onChange={(e) => setFollowedUpAt(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save changes
              </Button>
            </div>
          </Section>

          {canSendDepositLink && (
            <Section title="Quick action">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Mint a deposit_requests row in <code>deposit_link_sent</code>{' '}
                  state and email the buyer the gated{' '}
                  <code>/deposit?requestId=…</code> link in one click. Skips the
                  manual review pass; only available when the inquiry is linked
                  to a known customer and a specific puppy.
                </p>
                <Button
                  type="button"
                  onClick={() => sendDepositLinkMutation.mutate()}
                  disabled={sendDepositLinkMutation.isPending}
                  className="gap-2"
                >
                  {sendDepositLinkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send deposit link
                </Button>
              </div>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerHistorySection({
  customerId,
  currentInquiryId,
}: {
  customerId: string;
  currentInquiryId: string | null;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-history', customerId],
    queryFn: () => fetchCustomerHistory(customerId),
    enabled: !!customerId,
  });
  if (isLoading) {
    return (
      <Section title="Customer history">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </Section>
    );
  }
  if (isError) return null;
  const rows = (data ?? []).filter((r) => r.id !== currentInquiryId);
  if (rows.length === 0) {
    return (
      <Section title="Customer history">
        <p className="text-sm text-muted-foreground">
          No other submissions for this customer yet.
        </p>
      </Section>
    );
  }
  return (
    <Section title="Customer history">
      <ul className="space-y-1.5 text-sm">
        {rows.map((r) => (
          <li key={`${r.source}-${r.id}`} className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="font-medium">
              {r.source === 'puppy_inquiry' ? 'Inquiry' : 'Deposit request'}
            </span>
            {r.puppy_name ? (
              <span className="text-muted-foreground">— {r.puppy_name}</span>
            ) : null}
            {r.status ? (
              <span className="ml-auto text-xs text-muted-foreground">
                {r.status}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}
