import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdminRevenueMonthly } from '@/hooks/use-admin-revenue-monthly';
import { formatUsd, formatUsdCompact } from '@/lib/format/currency';

function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function RevenueTimeseriesChart() {
  const { data, isLoading, error } = useAdminRevenueMonthly();

  const rows = (data ?? []).slice(-12).map((r) => ({
    month: monthLabel(r.month),
    Deposits: r.deposits_collected_amount,
    Balances: r.balances_collected_amount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue, last 12 months</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-4">Could not load revenue history.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatUsdCompact(Number(v))} tick={{ fontSize: 12 }} width={64} />
                <Tooltip
                  formatter={(v: number | string) => formatUsd(Number(v))}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Deposits" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Balances" stackId="a" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
