// "Needs your attention" card on the admin dashboard.
//
// Surfaces three priority buckets, newest first within each:
//   1. Inquiries with preferences.deposit_interest = 'true' and admin_viewed_at IS NULL
//   2. Other new (admin_viewed_at IS NULL) puppy inquiries
//   3. Pending deposit_requests (request_status = 'pending')
//
// Each row routes to /admin/inquiries?open=<id>&source=<slug> (puppy inquiries)
// or /admin/deposit-requests?open=<id> (deposit requests).

import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BellRing, ArrowRight, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AlertItem {
  kind: "deposit_interest" | "new_inquiry" | "pending_deposit_request";
  id: string;
  created_at: string;
  customer_name: string;
  puppy_name: string | null;
}

async function fetchAlerts(): Promise<AlertItem[]> {
  const [inquiriesRes, depositsRes] = await Promise.all([
    supabase
      .from("puppy_inquiries")
      .select("id, created_at, name, puppy_name, puppy_name_at_submit, preferences, admin_viewed_at")
      .is("admin_viewed_at", null)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("deposit_requests")
      .select("id, created_at, customer_name, puppy_name, request_status")
      .eq("request_status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (inquiriesRes.error) throw inquiriesRes.error;
  if (depositsRes.error) throw depositsRes.error;

  const items: AlertItem[] = [];
  for (const r of inquiriesRes.data ?? []) {
    const depositInterest =
      r.preferences &&
      typeof r.preferences === "object" &&
      (r.preferences as Record<string, unknown>).deposit_interest === true;
    items.push({
      kind: depositInterest ? "deposit_interest" : "new_inquiry",
      id: r.id,
      created_at: r.created_at,
      customer_name: r.name ?? "Unknown",
      puppy_name: r.puppy_name ?? r.puppy_name_at_submit ?? null,
    });
  }
  for (const r of depositsRes.data ?? []) {
    items.push({
      kind: "pending_deposit_request",
      id: r.id,
      created_at: r.created_at,
      customer_name: r.customer_name ?? "Unknown",
      puppy_name: r.puppy_name ?? null,
    });
  }
  const priority: Record<AlertItem["kind"], number> = {
    deposit_interest: 0,
    new_inquiry: 1,
    pending_deposit_request: 2,
  };
  items.sort((a, b) => {
    if (priority[a.kind] !== priority[b.kind]) {
      return priority[a.kind] - priority[b.kind];
    }
    return a.created_at < b.created_at ? 1 : -1;
  });
  return items.slice(0, 12);
}

function labelForKind(kind: AlertItem["kind"]): { label: string; tone: string } {
  switch (kind) {
    case "deposit_interest":
      return {
        label: "Deposit interest",
        tone: "border-amber-400/40 bg-amber-100/60 text-amber-900",
      };
    case "new_inquiry":
      return {
        label: "New inquiry",
        tone: "border-blue-400/40 bg-blue-100/60 text-blue-900",
      };
    case "pending_deposit_request":
      return {
        label: "Pending deposit",
        tone: "border-emerald-400/40 bg-emerald-100/60 text-emerald-900",
      };
  }
}

export function NeedsAttentionCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-needs-attention"],
    queryFn: fetchAlerts,
    refetchInterval: 30_000,
  });

  const { mutate: dismiss, isPending: dismissPending, variables: dismissingId } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("puppy_inquiries")
        .update({ admin_viewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-needs-attention"] });
    },
  });

  return (
    <Card className="mb-8 border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <BellRing className="h-4 w-4 text-amber-600" />
        <CardTitle className="text-base font-semibold">
          Needs your attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Could not load alerts: {(error as Error).message}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All clear — nothing pending.
          </p>
        ) : (
          <ul className="divide-y divide-amber-200/60">
            {data.map((item) => {
              const { label, tone } = labelForKind(item.kind);
              const href =
                item.kind === "pending_deposit_request"
                  ? `/admin/deposit-requests?open=${encodeURIComponent(item.id)}`
                  : `/admin/inquiries?open=${encodeURIComponent(item.id)}&source=puppy-inquiry`;
              return (
                <li key={`${item.kind}-${item.id}`}>
                  <div className="flex w-full items-center gap-3 py-2">
                    <button
                      type="button"
                      onClick={() => navigate(href)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left hover:bg-amber-50/60"
                    >
                      <Badge variant="outline" className={`shrink-0 ${tone}`}>
                        {label}
                      </Badge>
                      <span className="truncate text-sm font-medium">
                        {item.customer_name}
                      </span>
                      {item.puppy_name ? (
                        <span className="truncate text-sm text-muted-foreground">
                          — {item.puppy_name}
                        </span>
                      ) : null}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                    {item.kind !== "pending_deposit_request" && (
                      <button
                        type="button"
                        aria-label="Dismiss"
                        onClick={() => dismiss(item.id)}
                        disabled={dismissPending && dismissingId === item.id}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-amber-100 hover:text-foreground disabled:opacity-40"
                      >
                        {dismissPending && dismissingId === item.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <X className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
