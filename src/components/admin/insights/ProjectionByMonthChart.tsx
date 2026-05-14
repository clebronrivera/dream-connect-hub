import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdminForwardProjection } from '@/hooks/use-admin-forward-projection';
import { formatUsd, formatUsdCompact } from '@/lib/format/currency';

function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function ProjectionByMonthChart() {
  const { data, isLoading, error } = useAdminForwardProjection();

  const rows = (data ?? []).slice(0, 12).map((r) => ({
    month: monthLabel(r.month),
    Committed: r.from_reserved_amount,
    Listed: r.from_available_amount,
    Upcoming: r.from_upcoming_amount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Projected revenue, next 12 months</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-4">Could not load projections.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-committed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="g-listed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.25} />
                  </linearGradient>
                  <linearGradient id="g-upcoming" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatUsdCompact(Number(v))} tick={{ fontSize: 12 }} width={64} />
                <Tooltip
                  formatter={(v: number | string) => formatUsd(Number(v))}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Committed" stackId="1" stroke="#047857" fill="url(#g-committed)" />
                <Area type="monotone" dataKey="Listed" stackId="1" stroke="#10b981" fill="url(#g-listed)" />
                <Area type="monotone" dataKey="Upcoming" stackId="1" stroke="#64748b" fill="url(#g-upcoming)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
