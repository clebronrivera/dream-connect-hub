// src/pages/admin/AgreementsPage.tsx
// Admin agreements management page with pending actions widget

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AgreementDetailPanel } from '@/pages/admin/AgreementDetailPanel';
import { fetchAgreements, fetchPendingActionCounts } from '@/lib/admin/agreements-service';
import type { DepositAgreement } from '@/types/deposit';
import {
  Clock, AlertCircle, PenTool, CalendarX, Eye,
  ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';

type FilterKey = 'all' | 'unconfirmed' | 'unsigned' | 'manual' | 'no_pickup' | 'manual_review';

export default function AgreementsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  // State-backed "24h ago" cutoff (refreshed every minute) — keeps the filter pure during render.
  const [twentyFourHoursAgo, setTwentyFourHoursAgo] = useState(0);
  useEffect(() => {
    const update = () => setTwentyFourHoursAgo(Date.now() - 24 * 60 * 60 * 1000);
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['agreements'],
    queryFn: fetchAgreements,
  });

  const { data: counts } = useQuery({
    queryKey: ['agreements-counts'],
    queryFn: fetchPendingActionCounts,
    refetchInterval: 30_000,
  });

  const filteredAgreements = agreements.filter((a: DepositAgreement) => {
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const matches =
        a.agreement_number.toLowerCase().includes(q) ||
        a.buyer_name.toLowerCase().includes(q) ||
        a.puppy_name.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // Badge filter
    switch (filter) {
      case 'unconfirmed':
        return a.deposit_status === 'pending' && new Date(a.created_at).getTime() < twentyFourHoursAgo;
      case 'unsigned':
        return a.agreement_status === 'sent' && !a.buyer_signed_at && new Date(a.created_at).getTime() < twentyFourHoursAgo;
      case 'manual':
        return ['cash', 'square'].includes(a.deposit_payment_method) && a.deposit_status === 'pending';
      case 'no_pickup':
        return !!a.buyer_signed_at && !!a.admin_signed_at && !a.confirmed_pickup_date;
      case 'manual_review':
        return a.requires_manual_review;
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Deposit Agreements</h1>
        <a href="/deposit" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-1" /> Open Deposit Form
          </Button>
        </a>
      </div>

      {/* Pending Actions Widget */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <ActionBadge
            icon={<Clock className="h-4 w-4" />}
            label="Unconfirmed"
            count={counts.unconfirmedDeposits}
            active={filter === 'unconfirmed'}
            onClick={() => setFilter(f => f === 'unconfirmed' ? 'all' : 'unconfirmed')}
          />
          <ActionBadge
            icon={<PenTool className="h-4 w-4" />}
            label="Unsigned"
            count={counts.unsignedBuyers}
            active={filter === 'unsigned'}
            onClick={() => setFilter(f => f === 'unsigned' ? 'all' : 'unsigned')}
          />
          <ActionBadge
            icon={<AlertCircle className="h-4 w-4" />}
            label="Manual Confirm"
            count={counts.manualConfirmPending}
            active={filter === 'manual'}
            onClick={() => setFilter(f => f === 'manual' ? 'all' : 'manual')}
          />
          <ActionBadge
            icon={<CalendarX className="h-4 w-4" />}
            label="No Pickup Date"
            count={counts.noPickupDate}
            active={filter === 'no_pickup'}
            onClick={() => setFilter(f => f === 'no_pickup' ? 'all' : 'no_pickup')}
          />
          <ActionBadge
            icon={<Eye className="h-4 w-4" />}
            label="Manual Review"
            count={counts.manualReview}
            active={filter === 'manual_review'}
            onClick={() => setFilter(f => f === 'manual_review' ? 'all' : 'manual_review')}
          />
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Search by agreement #, buyer name, or puppy name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-md"
      />

      {filter !== 'all' && (
        <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
          Clear filter
        </Button>
      )}

      {/* Agreements table */}
      {isLoading ? (
        <p className="text-gray-500">Loading agreements...</p>
      ) : filteredAgreements.length === 0 ? (
        <p className="text-gray-500">No agreements found.</p>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-8 gap-2 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Agreement #</span>
            <span>Buyer</span>
            <span>Puppy</span>
            <span>Deposit</span>
            <span>Tier</span>
            <span>Status</span>
            <span>Pickup</span>
            <span>Deadline</span>
          </div>

          {filteredAgreements.map((a: DepositAgreement) => (
            <Card key={a.id} className={expandedId === a.id ? 'ring-2 ring-blue-300' : ''}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
              >
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-8 gap-2 items-center text-sm">
                    <span className="font-mono font-medium">{a.agreement_number}</span>
                    <span className="truncate">{a.buyer_name}</span>
                    <span className="truncate">{a.puppy_name}</span>
                    <span className="font-medium">${a.deposit_amount.toFixed(2)}</span>
                    <Badge variant="outline" className="w-fit text-xs">
                      {a.deposit_tier === 'pre_8_weeks' ? '1/4' : '1/3'}
                    </Badge>
                    <div className="flex gap-1">
                      <Badge variant={a.deposit_status === 'admin_confirmed' ? 'default' : 'secondary'} className="text-[10px]">
                        {a.deposit_status}
                      </Badge>
                    </div>
                    <span className="text-xs">{a.proposed_pickup_date}</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{a.pickup_deadline}</span>
                      {expandedId === a.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardContent>
              </button>
              {expandedId === a.id && (
                <div className="border-t">
                  <AgreementDetailPanel agreement={a} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
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
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-200 hover:border-gray-300 text-gray-600'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
      {count > 0 && (
        <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0">
          {count}
        </Badge>
      )}
    </button>
  );
}
