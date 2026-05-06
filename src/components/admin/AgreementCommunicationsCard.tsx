// src/components/admin/AgreementCommunicationsCard.tsx
// Wave H phase 3 (H5). Communications timeline + manual-log form for the
// admin agreement detail panel. Reads from agreement_communications;
// writes via insertManualCommunication (admin-only RLS).

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
  fetchAgreementCommunications,
  insertManualCommunication,
  MANUAL_LOG_CHANNELS,
  type AgreementCommunication,
  type CommunicationChannel,
  type CommunicationDirection,
} from '@/lib/admin/communications-service';

const SUMMARY_MAX = 500;

const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: 'Email',
  phone: 'Phone',
  sms: 'SMS',
  in_person_note: 'In-person',
};

const DIRECTION_LABELS: Record<CommunicationDirection, string> = {
  inbound: 'From buyer',
  outbound: 'To buyer',
};

interface Props {
  agreementId: string;
}

export function AgreementCommunicationsCard({ agreementId }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState<CommunicationDirection>('outbound');
  const [channel, setChannel] = useState<typeof MANUAL_LOG_CHANNELS[number]>('phone');
  const [summary, setSummary] = useState('');

  const listQ = useQuery({
    queryKey: ['agreement-communications', agreementId],
    queryFn: () => fetchAgreementCommunications(agreementId),
  });

  const logMut = useMutation({
    mutationFn: () =>
      insertManualCommunication({ agreementId, direction, channel, summary }),
    onSuccess: (row) => {
      // Optimistic prepend for instant feedback. The query will re-fetch on
      // next focus / invalidate; this just makes the UI feel responsive.
      queryClient.setQueryData<AgreementCommunication[]>(
        ['agreement-communications', agreementId],
        (prev) => [row, ...(prev ?? [])],
      );
      setSummary('');
      setShowForm(false);
      toast.success('Communication logged');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const grouped = useMemo(() => groupByDay(listQ.data ?? []), [listQ.data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Communications</CardTitle>
          <Button
            size="sm"
            variant={showForm ? 'ghost' : 'outline'}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Cancel' : 'Log entry'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-3 rounded border bg-muted/30 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Direction</Label>
                <Select
                  value={direction}
                  onValueChange={(v) => setDirection(v as CommunicationDirection)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">{DIRECTION_LABELS.outbound}</SelectItem>
                    <SelectItem value="inbound">{DIRECTION_LABELS.inbound}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Channel</Label>
                <Select
                  value={channel}
                  onValueChange={(v) =>
                    setChannel(v as typeof MANUAL_LOG_CHANNELS[number])
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_LOG_CHANNELS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CHANNEL_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="comms-summary" className="text-xs">
                Summary
              </Label>
              <Textarea
                id="comms-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value.slice(0, SUMMARY_MAX))}
                placeholder="What was discussed? Keep it factual; this is audit-grade."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {summary.length} / {SUMMARY_MAX}
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => logMut.mutate()}
                disabled={logMut.isPending || !summary.trim()}
              >
                {logMut.isPending ? 'Saving…' : 'Save entry'}
              </Button>
            </div>
          </div>
        )}

        {listQ.isLoading ? (
          <p className="text-xs text-muted-foreground italic">Loading timeline…</p>
        ) : listQ.error ? (
          <p className="text-xs text-red-700">Failed to load communications.</p>
        ) : grouped.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No communications recorded yet.
          </p>
        ) : (
          <ul className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {grouped.map(({ label, rows }) => (
              <li key={label} className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground sticky top-0 bg-background py-0.5">
                  {label}
                </div>
                <ul className="space-y-2">
                  {rows.map((row) => (
                    <CommunicationRow key={row.id} row={row} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── helpers ────────────────────────────────────────────────────────────

function groupByDay(rows: AgreementCommunication[]): Array<{
  label: string;
  rows: AgreementCommunication[];
}> {
  const groups = new Map<string, AgreementCommunication[]>();
  for (const r of rows) {
    const d = new Date(r.occurred_at);
    const key = format(d, 'yyyy-MM-dd');
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    label: dayLabel(new Date(`${key}T12:00:00`)),
    rows: items,
  }));
}

function dayLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, MMM d, yyyy');
}

function CommunicationRow({ row }: { row: AgreementCommunication }) {
  const recordedBy = row.recorded_by_user_id ? 'Admin' : 'System';
  return (
    <li className="flex items-start gap-2 rounded border bg-card p-2 text-sm">
      <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
        <ChannelIcon channel={row.channel} />
        <DirectionIcon direction={row.direction} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">
            {CHANNEL_LABELS[row.channel]}
          </span>
          <span>·</span>
          <span>{DIRECTION_LABELS[row.direction]}</span>
          <span className="ml-auto">{format(new Date(row.occurred_at), 'h:mm a')}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words">{row.summary}</p>
        <p className="text-xs text-muted-foreground mt-1">Recorded by: {recordedBy}</p>
      </div>
    </li>
  );
}

function ChannelIcon({ channel }: { channel: CommunicationChannel }) {
  const cls = 'h-3.5 w-3.5 text-muted-foreground';
  switch (channel) {
    case 'email':
      return <Mail className={cls} />;
    case 'phone':
      return <Phone className={cls} />;
    case 'sms':
      return <MessageSquare className={cls} />;
    case 'in_person_note':
      return <NotebookPen className={cls} />;
  }
}

function DirectionIcon({ direction }: { direction: CommunicationDirection }) {
  return direction === 'outbound' ? (
    <ArrowUpRight className="h-3 w-3 text-blue-600" />
  ) : (
    <ArrowDownLeft className="h-3 w-3 text-green-700" />
  );
}
