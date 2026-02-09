import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DataTable } from '@/components/admin/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface LeadsListProps {
  table: 'puppy_inquiries' | 'consultation_requests' | 'product_inquiries' | 'contact_messages';
  title: string;
  statusOptions: string[];
  extraColumns?: Array<{
    header: string;
    accessorKey?: string;
    cell?: (row: any) => React.ReactNode;
  }>;
}

export default function LeadsList({ table, title, statusOptions, extraColumns = [] }: LeadsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ['admin-leads', table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from(table)
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads', table] });
      toast({ title: 'Status updated' });
    },
    onError: (error: any) => {
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
      cell: (row: any) => {
        const date = row.created_at ? new Date(row.created_at) : null;
        return date ? date.toLocaleDateString() : '-';
      },
    },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Email', accessorKey: 'email' },
    {
      header: 'Phone',
      cell: (row: any) => row.phone || '-',
    },
    {
      header: 'Status',
      cell: (row: any) => (
        <Select
          value={row.status || statusOptions[0]}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{title}</h1>
      <DataTable columns={columns} data={leads || []} />
    </div>
  );
}
