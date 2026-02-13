import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Puppy } from '@/lib/supabase';
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

export default function PuppiesList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: puppies, isLoading } = useQuery({
    queryKey: ['admin-puppies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('puppies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Puppy[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('puppies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-puppies'] });
      toast({
        title: 'Puppy deleted',
        description: 'The puppy has been removed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete puppy.',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const columns = [
    {
      header: 'Photo',
      cell: (puppy: Puppy) => (
        <img
          src={puppy.primary_photo || '/placeholder.png'}
          alt={puppy.name}
          className="h-12 w-12 rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.png';
          }}
        />
      ),
    },
    { header: 'Name', accessorKey: 'name' as keyof Puppy },
    { header: 'Breed', accessorKey: 'breed' as keyof Puppy },
    { header: 'Gender', accessorKey: 'gender' as keyof Puppy },
    { header: 'Status', accessorKey: 'status' as keyof Puppy },
    { 
      header: 'Price', 
      accessorKey: 'final_price' as keyof Puppy,
      cell: (puppy: Puppy) => `$${puppy.final_price || puppy.base_price || 0}`
    },
    {
      header: 'Actions',
      cell: (puppy: Puppy) => (
        <div className="flex gap-2">
          <Link to={`/admin/puppies/${puppy.id}/edit`}>
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
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {puppy.name}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(puppy.id!)}
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
        <h1 className="text-3xl font-bold">Manage Puppies</h1>
        <Link to="/admin/puppies/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Puppy
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      ) : (
        <DataTable columns={columns} data={puppies || []} sortable />
      )}
    </div>
  );
}
