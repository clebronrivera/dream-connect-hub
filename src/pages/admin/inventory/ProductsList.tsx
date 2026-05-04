import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteProduct } from '@/lib/admin/inventory-service';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/supabase';
import { PRODUCT_CATEGORIES, PRODUCT_STATUS } from '@/lib/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

export default function ProductsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'Product deleted successfully' });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting product',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryDeep" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage individual product items</p>
        </div>
        <Link to="/admin/inventory/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div
          className="relative overflow-x-auto"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-border/60 to-transparent rounded-r-lg z-0" aria-hidden />
          <table className="min-w-full divide-y divide-line relative z-10">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Photo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Featured
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-line">
            {products?.map((product) => (
              <tr key={product.id} className="hover:bg-muted/40">
                <td className="px-6 py-4 whitespace-nowrap">
                  {product.photo ? (
                    <img
                      src={product.photo}
                      alt={product.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-foreground">
                    {product.name}
                  </div>
                  {product.description && (
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {product.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {PRODUCT_CATEGORIES[product.category]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                  ${Number(product.price).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : product.status === 'sold_out'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-muted text-foreground'
                    }`}
                  >
                    {PRODUCT_STATUS[product.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {product.featured ? '⭐ Yes' : 'No'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Link to={`/admin/inventory/products/${product.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(product.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>

        {products?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No products yet. Add your first product!
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
