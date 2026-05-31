import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Dog, Loader2, Receipt, Scale } from 'lucide-react';
import { useAdminKpiSummary } from '@/hooks/use-admin-kpi-summary';
import { formatUsd, formatPercent } from '@/lib/format/currency';

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-muted-foreground">No prior period</span>;
  }
  if (previous === 0) {
    return <span className="text-xs text-emerald-600 inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />New revenue</span>;
  }
  const pct = (current - previous) / previous;
  const positive = pct >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = positive ? 'text-emerald-600' : 'text-rose-600';
  return (
    <span className={`text-xs inline-flex items-center gap-1 ${color}`}>
      <Icon className="h-3 w-3" />
      {formatPercent(Math.abs(pct), 0)} vs prior 30d
    </span>
  );
}

export function RevenueKpiTiles() {
  const { data, isLoading, error } = useAdminKpiSummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-sm text-destructive py-4">Could not load revenue summary.</p>;
  }

  const netPositive = data.net_ytd >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue YTD</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatUsd(data.revenue_ytd)}</div>
          <p className="text-xs text-muted-foreground mt-1">Deposits + balances collected this year</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expenses YTD</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600">{formatUsd(data.expenses_ytd)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Puppy + parent-dog costs this year · {formatUsd(data.expenses_total)} all-time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net YTD</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatUsd(data.net_ytd)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Revenue − expenses this year</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last 30 days</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatUsd(data.revenue_last_30d)}</div>
          <div className="mt-1">
            <TrendBadge current={data.revenue_last_30d} previous={data.revenue_prev_30d} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pipeline value</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatUsd(data.pipeline_value)}</div>
          <p className="text-xs text-muted-foreground mt-1">Signed agreements not yet complete</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active reservations</CardTitle>
          <Dog className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.active_reservations_count}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.available_inventory_count} listed · {formatUsd(data.available_inventory_value)} listed value
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
