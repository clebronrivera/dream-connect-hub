import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdminPipelineFunnel } from '@/hooks/use-admin-pipeline-funnel';
import type { PipelineRow } from '@/lib/admin/insights-service';
import { formatUsd } from '@/lib/format/currency';

// Amber (early) → green (late). 7 stages.
const STAGE_COLORS = ['#f59e0b', '#fbbf24', '#facc15', '#a3e635', '#86efac', '#34d399', '#059669'];

function rightLabel(entry: PipelineRow): string {
  return entry.total_dollars != null ? formatUsd(entry.total_dollars) : '';
}

export function PipelineFunnelChart() {
  const { data, isLoading, error } = useAdminPipelineFunnel();

  const rows = (data ?? []).map((r, i) => ({
    ...r,
    fill: STAGE_COLORS[i % STAGE_COLORS.length],
    rightLabel: rightLabel(r),
  }));

  const hasAny = rows.some((r) => r.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline funnel</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-72">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-4">Could not load pipeline.</p>
        ) : !hasAny ? (
          <p className="text-sm text-muted-foreground py-4">No active reservations or requests yet.</p>
        ) : (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 80, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="stage_label"
                  type="category"
                  width={220}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(v: number | string, _name, ctx) => {
                    if (ctx && (ctx as { payload?: PipelineRow }).payload) {
                      const p = (ctx as { payload: PipelineRow }).payload;
                      return [`${v} (${p.total_dollars != null ? formatUsd(p.total_dollars) : '—'})`, 'Count'];
                    }
                    return [String(v), 'Count'];
                  }}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {rows.map((r, i) => (
                    <Cell key={r.stage_key} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="rightLabel"
                    position="right"
                    style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
