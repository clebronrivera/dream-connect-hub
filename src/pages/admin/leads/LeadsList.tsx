import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DataTable } from '@/components/admin/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { LeadRow } from '@/types/leads';

export type StatusFilter = 'all' | 'active' | 'inactive';

interface LeadsListProps {
  table: 'puppy_inquiries' | 'consultation_requests' | 'product_inquiries' | 'contact_messages';
  title: string;
  statusOptions: string[];
  /** Filter by status: active, inactive, or show all */
  statusFilter?: StatusFilter;
  extraColumns?: Array<{
    header: string;
    accessorKey?: string;
    cell?: (row: LeadRow) => React.ReactNode;
  }>;
  /** Optional actions column (e.g. View button). Receives row and returns cell content. */
  renderActions?: (row: LeadRow) => React.ReactNode;
}

export default function LeadsList({ table, title, statusOptions, statusFilter = 'all', extraColumns = [], renderActions }: LeadsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads, isLoading, error: queryError } = useQuery({
    queryKey: ['admin-leads', table, statusFilter],
    queryFn: async () => {
      let query = supabase.from(table).select('*').order('created_at', { ascending: false });
      if (statusFilter === 'active') {
        if (table === 'product_inquiries') {
          query = query.eq('status', 'new');
        } else {
          query = query.eq('status', 'active');
        }
      } else if (statusFilter === 'inactive') {
        if (table === 'product_inquiries') {
          query = query.in('status', ['reviewed', 'contacted']);
        } else {
          query = query.eq('status', 'inactive');
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // When admin updates status, mark as viewed (reduces unseen count on dashboard)
      const updates: Record<string, unknown> = { status };
      if (table !== 'product_inquiries') {
        updates.admin_viewed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads', table] });
      toast({ title: 'Status updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status.',
        variant: 'destructive',
      });
    },
  });

  const baseColumns = [
    {
      header: 'Date',
      accessorKey: 'created_at',
      cell: (row: LeadRow) => {
        const date = row.created_at ? new Date(row.created_at as string) : null;
        return date ? date.toLocaleDateString() : '-';
      },
    },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Email', accessorKey: 'email' },
    {
      header: 'Phone',
      accessorKey: 'phone',
      cell: (row: LeadRow) => (row.phone as string) || '-',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row: LeadRow) => (
        <Select
          value={(row.status as string) || statusOptions[0]}
          onValueChange={(status) => updateStatus.mutate({ id: row.id, status })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];

  const columns = [...baseColumns, ...extraColumns];
  if (renderActions) {
    columns.push({ header: 'Actions', cell: (row) => renderActions(row) });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <p className="font-medium">Unable to load inquiries</p>
        <p className="text-sm mt-1">{queryError.message || 'Check your connection and try again.'}</p>
      </div>
    );
  }

  return (
    <div>
      {title ? <h1 className="text-3xl font-bold mb-8">{title}</h1> : null}
      <DataTable columns={columns} data={leads || []} sortable />
    </div>
  );
}
