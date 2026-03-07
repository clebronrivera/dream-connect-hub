import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PuppyInquiryDetailDialog } from '@/components/admin/PuppyInquiryDetailDialog';
import type { PuppyInquiry } from '@/lib/supabase';
import type { StatusFilter } from '@/pages/admin/leads/LeadsList';
import { Eye, Loader2 } from 'lucide-react';

interface PuppyInquiryInboxListProps {
  statusFilter: StatusFilter;
  /** If true, show the status filter toggle (All/Active/Inactive) above the list. Default true. */
  showStatusFilter?: boolean;
  title?: string;
  /** When set (e.g. from dashboard link), open the detail dialog for this id and clear the URL param. */
  initialOpenId?: string | null;
}

export function PuppyInquiryInboxList({
  statusFilter,
  showStatusFilter = true,
  title,
  initialOpenId,
}: PuppyInquiryInboxListProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<StatusFilter>(statusFilter);

  const effectiveFilter = showStatusFilter ? localStatus : statusFilter;

  const { data: inquiries = [], isLoading, error } = useQuery({
    queryKey: ['admin-puppy-inquiries', effectiveFilter],
    queryFn: async () => {
      let query = supabase
        .from('puppy_inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (effectiveFilter === 'active') {
        query = query.eq('status', 'active');
      } else if (effectiveFilter === 'inactive') {
        query = query.eq('status', 'inactive');
      }
      const { data, error: err } = await query;
      if (err) throw err;
      return (data ?? []) as PuppyInquiry[];
    },
  });

  const currentIndex = selectedId ? inquiries.findIndex((i) => i.id === selectedId) : -1;
  const currentInquiry = currentIndex >= 0 ? inquiries[currentIndex] ?? null : null;

  // When opened from dashboard link (?open=id&source=puppy-inquiry), select that inquiry and clear URL
  useEffect(() => {
    if (!initialOpenId || inquiries.length === 0) return;
    if (inquiries.some((i) => i.id === initialOpenId)) {
      setSelectedId(initialOpenId);
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      next.delete('source');
      const q = next.toString();
      navigate({ pathname: '/admin/inquiries', search: q ? `?${q}` : '' }, { replace: true });
    }
  }, [initialOpenId, inquiries, searchParams, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <p className="font-medium">Unable to load puppy inquiries</p>
        <p className="text-sm mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div>
      {title ? <h2 className="text-lg font-semibold mb-2">{title}</h2> : null}
      {showStatusFilter && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Status:</span>
          <ToggleGroup
            type="single"
            value={effectiveFilter}
            onValueChange={(v) => v && setLocalStatus(v as StatusFilter)}
            className="gap-0"
          >
            <ToggleGroupItem value="all" aria-label="All" className="text-sm">All</ToggleGroupItem>
            <ToggleGroupItem value="active" aria-label="Active" className="text-sm">Active</ToggleGroupItem>
            <ToggleGroupItem value="inactive" aria-label="Inactive" className="text-sm">Inactive</ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-[140px]">Phone</TableHead>
            <TableHead>Puppy</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inquiries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No inquiries
              </TableCell>
            </TableRow>
          ) : (
            inquiries.map((inq) => (
              <TableRow
                key={inq.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedId(inq.id ?? null)}
              >
                <TableCell className="text-sm text-muted-foreground">
                  {inq.created_at
                    ? new Date(inq.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </TableCell>
                <TableCell className="font-medium">{inq.name ?? '—'}</TableCell>
                <TableCell className="text-sm">{inq.phone ?? '—'}</TableCell>
                <TableCell className="text-sm">
                  {inq.puppy_name ?? inq.puppy_name_at_submit ?? (inq.puppy_id ? 'Puppy selected' : '—')}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedId(inq.id ?? null)}
                    className="gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <PuppyInquiryDetailDialog
        open={selectedId != null}
        onOpenChange={(open) => !open && setSelectedId(null)}
        inquiry={currentInquiry}
        allInquiries={inquiries}
        currentIndex={currentIndex < 0 ? 0 : currentIndex}
        onSelectIndex={(idx) => setSelectedId(inquiries[idx]?.id ?? null)}
        queryKey={['admin-puppy-inquiries', effectiveFilter]}
      />
    </div>
  );
}
