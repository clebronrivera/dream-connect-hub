import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, type UpcomingLitter } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function UpcomingLittersList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: litters, isLoading } = useQuery({
    queryKey: ['admin-upcoming-litters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upcoming_litters')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as UpcomingLitter[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('upcoming_litters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-upcoming-litters'] });
      toast({ title: 'Upcoming litter deleted' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const columns = [
    { header: 'Breed', accessorKey: 'breed' as keyof UpcomingLitter },
    { header: 'Due', accessorKey: 'due_label' as keyof UpcomingLitter },
    { header: 'Price', accessorKey: 'price_label' as keyof UpcomingLitter },
    {
      header: 'Deposit',
      cell: (row: UpcomingLitter) => (row.deposit_amount != null ? `$${row.deposit_amount}` : '-'),
    },
    {
      header: 'Status',
      cell: (row: UpcomingLitter) =>
        row.is_active ? (
          <Badge variant="default">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
    { header: 'Sort', accessorKey: 'sort_order' as keyof UpcomingLitter },
    {
      header: 'Actions',
      cell: (row: UpcomingLitter) => (
        <div className="flex gap-2">
          <Link to={`/admin/upcoming-litters/${row.id}/edit`}>
            <Button variant="ghost" size="sm">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this upcoming litter?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove &quot;{row.breed}, {row.due_label}&quot; from the public page. Contact messages that referenced it will keep the link unless you added upcoming_litter_label.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => row.id && deleteMutation.mutate(row.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Upcoming Litters</h1>
        <Link to="/admin/upcoming-litters/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Upcoming Litter
          </Button>
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        These appear on the public Upcoming Litters page. Only active rows are shown to visitors.
      </p>
      {isLoading ? (
        <div className="flex justify-center min-h-[300px] items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      ) : (
        <DataTable columns={columns} data={litters ?? []} sortable storageKey="admin-upcoming-litters-sort" />
      )}
    </div>
  );
}
