import { useState, useEffect } from 'react';
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
import type { ContactMessage } from '@/lib/supabase';
import { toDatetimeLocal } from '@/lib/date-utils';
import { Field, Section } from '@/components/admin/InquiryDetailShared';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface ContactMessageDetailDialogProps {
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

export function ContactMessageDetailDialog({
  open,
  onOpenChange,
  selectedId,
  listRows,
  currentIndex,
  onSelectIndex,
  queryKey,
}: ContactMessageDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: message } = useQuery({
    queryKey: ['contact-message-detail', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('id', selectedId)
        .single();
      if (error) throw error;
      return data as ContactMessage;
    },
    enabled: open && !!selectedId,
  });

  const [status, setStatus] = useState<string>(message?.status ?? 'active');
  const [adminNotes, setAdminNotes] = useState(message?.admin_notes ?? '');

  const [followedUpAt, setFollowedUpAt] = useState(
    message?.followed_up_at ? toDatetimeLocal(message.followed_up_at) : ''
  );

  useEffect(() => {
    if (message) {
      setStatus(message.status ?? 'active');
      setAdminNotes(message.admin_notes ?? '');
      setFollowedUpAt(message.followed_up_at ? toDatetimeLocal(message.followed_up_at) : '');
    }
  }, [message?.id, message?.status, message?.admin_notes, message?.followed_up_at]);

  const updateMutation = useMutation({
    mutationFn: async (updates: { status?: string; admin_notes?: string; followed_up_at?: string | null }) => {
      if (!message?.id) throw new Error('No message selected');
      const { error } = await supabase
        .from('contact_messages')
        .update({
          ...updates,
          admin_viewed_at: new Date().toISOString(),
        })
        .eq('id', message.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ['contact-message-detail', selectedId] });
      toast({ title: 'Saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    const followedUpIso = followedUpAt
      ? new Date(followedUpAt).toISOString()
      : null;
    updateMutation.mutate({
      status,
      admin_notes: adminNotes || undefined,
      followed_up_at: followedUpIso,
    });
  };

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < listRows.length - 1 && listRows.length > 1;
  const prevMessage = hasPrev ? listRows[currentIndex - 1] : null;
  const nextMessage = hasNext ? listRows[currentIndex + 1] : null;

  if (!message) return null;

  const createdDate = message.created_at
    ? new Date(message.created_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
  const interestOpts = message.interest_options;
  const interestText = Array.isArray(interestOpts) && interestOpts.length
    ? interestOpts.join('; ')
    : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Message</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!hasPrev}
                onClick={() => prevMessage && onSelectIndex(currentIndex - 1)}
                aria-label="Previous message"
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
                onClick={() => nextMessage && onSelectIndex(currentIndex + 1)}
                aria-label="Next message"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Section title="Received">
            <Field label="Date" value={createdDate} />
            <Field label="Subject" value={message.subject} />
          </Section>

          <Section title="Contact">
            <Field label="Name" value={message.name} />
            <Field label="Email" value={message.email} />
            <Field label="Phone" value={message.phone} />
            {(message.city != null && message.city !== '') || (message.state != null && message.state !== '') ? (
              <>
                <Field label="City" value={message.city} />
                <Field label="State" value={message.state} />
              </>
            ) : null}
          </Section>

          {(message.upcoming_litter_label || message.upcoming_litter_id) && (
            <Section title="Upcoming litter">
              <Field label="Selected litter" value={message.upcoming_litter_label ?? (message.upcoming_litter_id ? 'Litter selected' : null)} />
              <Field label="Interest option(s)" value={interestText} />
            </Section>
          )}

          <Section title="Message">
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {message.message || '—'}
            </p>
          </Section>

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
                <Label htmlFor="admin-notes">Note</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add a note about this inquiry…"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followed-up-at">Followed up (date & time)</Label>
                <Input
                  id="followed-up-at"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
