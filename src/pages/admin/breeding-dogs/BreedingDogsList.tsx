import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BreedingDog } from '@/lib/supabase';
import { deleteBreedingDog } from '@/lib/admin/breeding-dogs-service';
import { getBreedingDogPhotoUrl } from '@/lib/puppy-photos';
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

export default function BreedingDogsList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dogs, isLoading } = useQuery({
    queryKey: ['admin-breeding-dogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breeding_dogs')
        .select('*')
        .order('role', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BreedingDog[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteBreedingDog(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-breeding-dogs'] });
      queryClient.invalidateQueries({ queryKey: ['breeding-dogs'] });
      toast({ title: 'Breeding dog removed' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const columns = [
    {
      header: 'Photo',
      cell: (row: BreedingDog) => {
        const url = getBreedingDogPhotoUrl(row.photo_path);
        return url ? (
          <img src={url} alt={row.name} className="h-10 w-10 rounded object-cover border" />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    { header: 'Name', accessorKey: 'name' as keyof BreedingDog },
    {
      header: 'Role',
      cell: (row: BreedingDog) => (
        <Badge variant={row.role === 'Dam' ? 'secondary' : 'default'}>{row.role}</Badge>
      ),
    },
    { header: 'Breed', accessorKey: 'breed' as keyof BreedingDog },
    { header: 'Composition', accessorKey: 'composition' as keyof BreedingDog },
    { header: 'Color', accessorKey: 'color' as keyof BreedingDog },
    {
      header: 'Actions',
      cell: (row: BreedingDog) => (
        <div className="flex gap-2">
          <Link to={`/admin/breeding-dogs/${row.id}/edit`}>
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
                <AlertDialogTitle>Remove this breeding dog?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove &quot;{row.name}&quot; ({row.role}). Upcoming litters that reference this dog will need to be updated.
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
        <h1 className="text-3xl font-bold">Breeding Dogs</h1>
        <Link to="/admin/breeding-dogs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Breeding Dog
          </Button>
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Manage adult sires and dams. Use these when creating Upcoming Litters so dam and sire are selected from this list.
      </p>
      {isLoading ? (
        <div className="flex justify-center min-h-[300px] items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      ) : (
        <DataTable columns={columns} data={dogs ?? []} sortable storageKey="admin-breeding-dogs-sort" />
      )}
    </div>
  );
}
