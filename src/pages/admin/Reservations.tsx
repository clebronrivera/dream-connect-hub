// /admin/reservations — unified reservation list replacing the separate
// "Agreements" and "Deposit Requests" pages. Surfaces both deposit_request
// rows that haven't yet been signed and full deposit_agreement rows in a
// single timeline, filtered by the 8 unified reservation statuses defined
// in reservations-service.ts.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { AgreementDetailPanel } from '@/pages/admin/AgreementDetailPanel';
import { ReservationRequestCard } from '@/components/admin/ReservationRequestCard';
import { AdminInitiateDepositDialog } from '@/components/admin/AdminInitiateDepositDialog';
import {
  fetchReservations,
  tallyReservations,
  STATUS_LABELS,
  STATUS_TONE,
  type ReservationStatus,
} from '@/lib/admin/reservations-service';

type FilterKey = 'all' | ReservationStatus;

export default function Reservations() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [initiateOpen, setInitiateOpen] = useState(false);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: fetchReservations,
    refetchInterval: 30_000,
  });

  const counts = useMemo(() => tallyReservations(reservations), [reservations]);

  const visible = reservations.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [r.displayId, r.buyerName, r.puppyName ?? '', r.buyerEmail]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Filter tabs in the order admin most likely scans them.
  const tabs: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'all', label: 'All', count: counts.total },
    { key: 'needs_countersign', label: STATUS_LABELS.needs_countersign, count: counts.needs_countersign },
    { key: 'awaiting_payment', label: STATUS_LABELS.awaiting_payment, count: counts.awaiting_payment },
    { key: 'link_ready', label: STATUS_LABELS.link_ready, count: counts.link_ready },
    { key: 'link_sent', label: STATUS_LABELS.link_sent, count: counts.link_sent },
    { key: 'payment_confirmed', label: STATUS_LABELS.payment_confirmed, count: counts.payment_confirmed },
    { key: 'picked_up', label: STATUS_LABELS.picked_up, count: counts.picked_up },
    { key: 'cancelled', label: STATUS_LABELS.cancelled, count: counts.cancelled },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservations</h1>
          <p className="text-sm text-muted-foreground">
            Everything from first request through pickup. Click a row to act.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/deposit" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1.5" /> Open wizard
            </Button>
          </a>
          <Button
            size="sm"
            className="bg-primaryDeep hover:bg-primaryDeep/90 text-white"
            onClick={() => setInitiateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" /> New reservation
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(active ? 'all' : t.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'border-primaryDeep bg-primaryDeep text-white'
                  : 'border-line bg-card text-foreground hover:border-primaryDeep/50'
              }`}
            >
              <span>{t.label}</span>
              {t.count > 0 && (
                <span
                  className={`rounded-full px-1.5 text-xs font-semibold ${
                    active ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <Input
        placeholder="Search by reservation #, buyer name, puppy name, or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* List */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading reservations…</p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground">No reservations match this filter.</p>
      ) : (
        <div className="space-y-2">
          {/* Column headers (desktop only) */}
          <div className="hidden md:grid grid-cols-6 gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Reservation</span>
            <span>Buyer</span>
            <span>Puppy</span>
            <span>Status</span>
            <span>Amount</span>
            <span>Updated</span>
          </div>

          {visible.map((r) => {
            const expanded = expandedId === r.id;
            return (
              <Card key={r.id} className={expanded ? 'ring-2 ring-primaryDeep/40' : ''}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                >
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-center text-sm">
                      <span className="font-mono font-medium">{r.displayId}</span>
                      <span className="truncate">
                        {r.buyerName}
                        <span className="hidden lg:inline text-muted-foreground">
                          {' '}
                          · {r.buyerEmail}
                        </span>
                      </span>
                      <span className="truncate">
                        {r.puppyName ?? '—'}
                        {r.breed && (
                          <span className="hidden lg:inline text-muted-foreground"> · {r.breed}</span>
                        )}
                      </span>
                      <StatusBadge status={r.status} />
                      <span className="font-medium">
                        {r.amount != null ? `$${r.amount.toFixed(2)}` : '—'}
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{shortDate(r.updatedAt)}</span>
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>
                {expanded && (
                  <div className="border-t border-line">
                    {r.agreement ? (
                      <AgreementDetailPanel agreement={r.agreement} />
                    ) : r.request ? (
                      <ReservationRequestCard request={r.request} />
                    ) : null}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AdminInitiateDepositDialog open={initiateOpen} onOpenChange={setInitiateOpen} />
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const tone = STATUS_TONE[status];
  const classes = {
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    gray: 'bg-muted text-muted-foreground border-line',
  }[tone];
  return (
    <Badge className={`${classes} border font-medium`} variant="outline">
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
