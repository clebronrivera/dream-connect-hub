// Admin page for managing deposit requests.
// Pattern mirrors AgreementsPage: status badges, search, expandable cards.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
  Send,
  CheckCircle,
  XCircle,
  Plus,
  Phone,
  Mail,
} from "lucide-react";
import { DepositRequestDetailPanel } from "@/components/admin/DepositRequestDetailPanel";
import { AdminInitiateDepositDialog } from "@/components/admin/AdminInitiateDepositDialog";
import {
  fetchDepositRequests,
  fetchDepositRequestCounts,
} from "@/lib/admin/deposit-requests-service";
import type {
  DepositRequest,
  DepositRequestStatus,
} from "@/types/deposit-request";

type FilterKey = "all" | DepositRequestStatus;

const STATUS_LABELS: Record<DepositRequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  deposit_link_sent: "Link Sent",
  converted: "Converted",
  declined: "Declined",
};

const STATUS_BADGE_VARIANT: Record<
  DepositRequestStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  accepted: "default",
  deposit_link_sent: "default",
  converted: "outline",
  declined: "destructive",
};

export default function DepositRequests() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [initiateOpen, setInitiateOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["deposit-requests"],
    queryFn: () => fetchDepositRequests(),
  });

  const { data: counts } = useQuery({
    queryKey: ["deposit-requests-counts"],
    queryFn: fetchDepositRequestCounts,
    refetchInterval: 30_000,
  });

  const filtered = requests.filter((r: DepositRequest) => {
    if (filter !== "all" && r.request_status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matches =
        r.customer_name.toLowerCase().includes(q) ||
        r.customer_email.toLowerCase().includes(q) ||
        (r.upcoming_litter_label ?? "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Deposit Requests</h1>
          <p className="text-sm text-muted-foreground">
            {requests.length} total · {counts?.pending ?? 0} awaiting review
          </p>
        </div>
        <Button onClick={() => setInitiateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Request
        </Button>
      </div>

      {/* Status badges */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <ActionBadge
            icon={<Clock className="h-4 w-4" />}
            label="Pending"
            count={counts.pending}
            active={filter === "pending"}
            onClick={() => setFilter((f) => (f === "pending" ? "all" : "pending"))}
          />
          <ActionBadge
            icon={<Check className="h-4 w-4" />}
            label="Accepted"
            count={counts.accepted}
            active={filter === "accepted"}
            onClick={() => setFilter((f) => (f === "accepted" ? "all" : "accepted"))}
          />
          <ActionBadge
            icon={<Send className="h-4 w-4" />}
            label="Link Sent"
            count={counts.deposit_link_sent}
            active={filter === "deposit_link_sent"}
            onClick={() =>
              setFilter((f) => (f === "deposit_link_sent" ? "all" : "deposit_link_sent"))
            }
          />
          <ActionBadge
            icon={<CheckCircle className="h-4 w-4" />}
            label="Converted"
            count={counts.converted}
            active={filter === "converted"}
            onClick={() => setFilter((f) => (f === "converted" ? "all" : "converted"))}
          />
          <ActionBadge
            icon={<XCircle className="h-4 w-4" />}
            label="Declined"
            count={counts.declined}
            active={filter === "declined"}
            onClick={() => setFilter((f) => (f === "declined" ? "all" : "declined"))}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by customer name, email, or litter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        {filter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>
            Clear filter
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading requests...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No deposit requests found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r: DepositRequest) => {
            const isExpanded = expandedId === r.id;
            return (
              <Card key={r.id} className={isExpanded ? "ring-2 ring-blue-300" : ""}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{r.customer_name}</span>
                          <Badge
                            variant={STATUS_BADGE_VARIANT[r.request_status]}
                            className="text-xs"
                          >
                            {STATUS_LABELS[r.request_status]}
                          </Badge>
                          {r.origin === "admin_initiated" && (
                            <Badge variant="outline" className="text-[10px]">
                              Admin-initiated
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {r.customer_email}
                          </span>
                          {r.customer_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {r.customer_phone}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.upcoming_litter_label ?? "—"}
                          {r.upcoming_puppy_placeholder_summary
                            ? ` · ${r.upcoming_puppy_placeholder_summary}`
                            : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>
                {isExpanded && (
                  <div className="border-t">
                    <DepositRequestDetailPanel request={r} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AdminInitiateDepositDialog
        open={initiateOpen}
        onOpenChange={setInitiateOpen}
      />
    </div>
  );
}

function ActionBadge({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-gray-200 hover:border-gray-300 text-gray-600"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
      {count > 0 && (
        <Badge variant={active ? "default" : "secondary"} className="ml-auto text-xs px-1.5 py-0">
          {count}
        </Badge>
      )}
    </button>
  );
}
