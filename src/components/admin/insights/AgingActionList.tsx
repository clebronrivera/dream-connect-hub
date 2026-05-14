import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, CalendarX2, Loader2, ChevronRight } from 'lucide-react';
import { useAdminAgingActions } from '@/hooks/use-admin-aging-actions';
import type { AgingActionKind } from '@/lib/admin/insights-service';
import { formatUsd } from '@/lib/format/currency';

function kindMeta(kind: AgingActionKind) {
  switch (kind) {
    case 'request_stale':
      return {
        label: 'Stale request',
        Icon: Clock,
        bgClass: 'bg-amber-50 dark:bg-amber-950/40',
        textClass: 'text-amber-700 dark:text-amber-400',
      };
    case 'agreement_unpaid_stale':
      return {
        label: 'Deposit overdue',
        Icon: AlertTriangle,
        bgClass: 'bg-orange-50 dark:bg-orange-950/40',
        textClass: 'text-orange-700 dark:text-orange-400',
      };
    case 'reservation_pickup_overdue':
      return {
        label: 'Pickup past deadline',
        Icon: CalendarX2,
        bgClass: 'bg-rose-50 dark:bg-rose-950/40',
        textClass: 'text-rose-700 dark:text-rose-400',
      };
  }
}

export function AgingActionList() {
  const { data, isLoading, error } = useAdminAgingActions();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Needs attention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Needs attention</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive py-4">Could not load aging items.</p>
        </CardContent>
      </Card>
    );
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Needs attention</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-2">All clear — nothing aging past threshold.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Needs attention ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {rows.map((r) => {
            const meta = kindMeta(r.kind);
            return (
              <li key={`${r.kind}-${r.id}`}>
                <Link
                  to={r.link_path}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-md ${meta.bgClass}`}>
                      <meta.Icon className={`h-4 w-4 ${meta.textClass}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {meta.label} · {r.days_stale} day{r.days_stale === 1 ? '' : 's'}
                        {r.dollars != null ? ` · ${formatUsd(r.dollars)}` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
