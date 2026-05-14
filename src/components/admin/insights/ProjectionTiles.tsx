import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarRange, Loader2 } from 'lucide-react';
import { useAdminKpiSummary } from '@/hooks/use-admin-kpi-summary';
import { useAdminForwardProjection } from '@/hooks/use-admin-forward-projection';
import { formatUsd, formatPercent } from '@/lib/format/currency';

function bucketSums(rows: { month: string; from_reserved_amount: number; from_available_amount: number; from_upcoming_amount: number }[], maxMonthsAhead: number) {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() + maxMonthsAhead, 1);
  let reserved = 0, available = 0, upcoming = 0;
  for (const r of rows) {
    const d = new Date(r.month);
    if (d >= cutoff) continue;
    reserved += r.from_reserved_amount;
    available += r.from_available_amount;
    upcoming += r.from_upcoming_amount;
  }
  return { reserved, available, upcoming, total: reserved + available + upcoming };
}

function Breakdown({ reserved, available, upcoming, total }: { reserved: number; available: number; upcoming: number; total: number }) {
  if (total === 0) {
    return <p className="text-xs text-muted-foreground mt-2">No projected revenue in this window yet.</p>;
  }
  const pct = (n: number) => (n / total) * 100;
  return (
    <div className="mt-3 space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-emerald-600" style={{ width: `${pct(reserved)}%` }} />
        <div className="bg-emerald-400" style={{ width: `${pct(available)}%` }} />
        <div className="bg-slate-300" style={{ width: `${pct(upcoming)}%` }} />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
          Committed {formatUsd(reserved)} ({formatPercent(reserved / total)})
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Listed {formatUsd(available)} ({formatPercent(available / total)})
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
          Upcoming litters {formatUsd(upcoming)} ({formatPercent(upcoming / total)})
        </span>
      </div>
    </div>
  );
}

export function ProjectionTiles() {
  const kpi = useAdminKpiSummary();
  const projection = useAdminForwardProjection();

  if (kpi.isLoading || projection.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (kpi.error || projection.error || !kpi.data || !projection.data) {
    return <p className="text-sm text-destructive py-4">Could not load projections.</p>;
  }

  const next90 = bucketSums(projection.data, 3);
  const next12 = bucketSums(projection.data, 12);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Next 90 days</CardTitle>
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatUsd(kpi.data.next_90d_projection)}</div>
          <p className="text-xs text-muted-foreground mt-1">Projected revenue from reservations + listings + expected litters</p>
          <Breakdown {...next90} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Next 12 months</CardTitle>
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatUsd(kpi.data.next_12mo_projection)}</div>
          <p className="text-xs text-muted-foreground mt-1">Annual projection horizon</p>
          <Breakdown {...next12} />
        </CardContent>
      </Card>
    </div>
  );
}
