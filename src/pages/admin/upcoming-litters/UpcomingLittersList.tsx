import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpcomingLitter, SiteSettings } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { fetchAdminUpcomingLitters, deleteUpcomingLitter } from '@/lib/admin/upcoming-litters-service';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

function getStoragePublicUrl(path: string): string {
  return supabase.storage.from('puppy-photos').getPublicUrl(path).data.publicUrl;
}

export default function UpcomingLittersList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: litters, isLoading } = useQuery({
    queryKey: ['admin-upcoming-litters'],
    queryFn: fetchAdminUpcomingLitters,
  });

  const { data: siteSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as SiteSettings;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (visibility: 'current_only' | 'previous_only' | 'both') => {
      const { error } = await supabase.from('site_settings').update({ previous_litters_visibility: visibility }).eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast({ title: 'Visibility updated' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteUpcomingLitter(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-upcoming-litters'] });
      toast({ title: 'Upcoming litter deleted' });
    },
    onError: (e: Error) => {
      const msg = e.message || '';
      const hint = msg.includes('foreign key') || msg.includes('violates foreign key')
        ? ' Contact messages may reference this litter; the database will be updated to allow deletion.'
        : '';
      toast({ title: 'Error', description: msg + hint, variant: 'destructive' });
    },
  });

  const columns = [
    {
      header: 'Display breed',
      cell: (row: UpcomingLitter) => row.display_breed || row.breed || '—',
    },
    {
      header: 'Dam / Sire',
      cell: (row: UpcomingLitter) =>
        [row.dam_name, row.sire_name].filter(Boolean).join(' / ') || '—',
    },
    { header: 'Due', accessorKey: 'due_label' as keyof UpcomingLitter },
    { header: 'Price', accessorKey: 'price_label' as keyof UpcomingLitter },
    {
      header: 'Deposit',
      cell: (row: UpcomingLitter) => (row.deposit_amount != null ? `$${row.deposit_amount}` : '-'),
    },
    {
      header: 'Refundable',
      cell: (row: UpcomingLitter) =>
        row.refundable_deposit_amount != null && row.refundable_deposit_amount > 0
          ? `$${row.refundable_deposit_amount}`
          : '-',
    },
    {
      header: 'Deposits (shown)',
      cell: (row: UpcomingLitter) =>
        `${row.deposits_reserved_count ?? 0} / ${row.max_deposit_slots ?? 4}`,
    },
    {
      header: 'Status',
      cell: (row: UpcomingLitter) => (
        <div className="flex flex-col gap-1 items-start">
          {row.is_active ? (
            <Badge variant="default">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {row.lifecycle_status === 'pre_birth' ? 'Pre-birth' : row.lifecycle_status === 'post_birth' ? 'Post-birth' : 'Previous'}
          </Badge>
        </div>
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
                  This will remove &quot;{row.display_breed || row.breed}{row.due_label ? `, ${row.due_label}` : ''}&quot; from the public page. Contact messages that referenced it will keep the link unless you added upcoming_litter_label.
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Upcoming Litters</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Public visibility:</span>
            <Select
              value={siteSettings?.previous_litters_visibility ?? 'both'}
              onValueChange={(v) => updateSettingsMutation.mutate(v as 'current_only' | 'previous_only' | 'both')}
              disabled={isLoadingSettings || updateSettingsMutation.isPending}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Show Both</SelectItem>
                <SelectItem value="current_only">Current Only</SelectItem>
                <SelectItem value="previous_only">Previous Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Link to="/admin/upcoming-litters/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Upcoming Litter
            </Button>
          </Link>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        These appear on the public Upcoming Litters page based on the visibility setting above. Only active rows are shown.
      </p>
      {isLoading ? (
        <div className="flex justify-center min-h-[300px] items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={litters ?? []}
          sortable
          storageKey="admin-upcoming-litters-sort"
          renderSubComponent={(row) => (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Past dogs from this line (Slots)</h3>
                <Link to={`/admin/upcoming-litters/${row.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Litter & Slots
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Note: These are from previous litters. You can add up to 3 images to show what puppies from this pairing look like.
              </p>
              {(!row.example_puppy_image_paths || row.example_puppy_image_paths.length === 0) ? (
                <div className="text-sm text-muted-foreground py-4 border-2 border-dashed rounded-lg text-center">
                  No previous litter photos uploaded yet.
                </div>
              ) : (
                <div className="flex gap-4">
                  {row.example_puppy_image_paths.map((path, i) => (
                    <img
                      key={i}
                      src={getStoragePublicUrl(path)}
                      alt={`Past dog ${i + 1}`}
                      className="h-24 w-24 rounded-lg object-cover border"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
