import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { replaceProductPhoto } from '@/lib/product-photos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Image as ImageIcon, Upload, X, Plus, Trash2 } from 'lucide-react';
import type { Kit } from '@/lib/supabase';

const kitSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or greater'),
  status: z.enum(['available', 'sold_out', 'inactive']),
  badge: z.string().optional(),
  featured: z.boolean().default(false),
  display_order: z.number().default(0),
  items: z
    .array(
      z.object({
        item_text: z.string().min(1, 'Item text is required'),
        display_order: z.number(),
      })
    )
    .min(1, 'Kit must have at least 1 item')
    .max(10, 'Kit can have maximum 10 items'),
});

type KitFormData = z.infer<typeof kitSchema>;

export default function KitForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: kit, isLoading } = useQuery({
    queryKey: ['kit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data: kitData, error: kitError } = await supabase
        .from('kits')
        .select('*')
        .eq('id', id)
        .single();

      if (kitError) throw kitError;
      if (kitData?.photo) setPhotoPreview(kitData.photo);
      return kitData as Kit;
    },
    enabled: isEdit,
  });

  const { data: kitItems } = useQuery({
    queryKey: ['kit-items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('kit_items')
        .select('*')
        .eq('kit_id', id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: isEdit && !!kit,
  });

  const form = useForm<KitFormData>({
    resolver: zodResolver(kitSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      status: 'available',
      badge: '',
      featured: false,
      display_order: 0,
      items: [{ item_text: '', display_order: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (kit && kitItems) {
      form.reset({
        name: kit.name,
        description: kit.description || '',
        price: Number(kit.price),
        status: kit.status,
        badge: kit.badge || '',
        featured: kit.featured,
        display_order: kit.display_order ?? 0,
        items:
          kitItems.length > 0
            ? kitItems.map((item, i) => ({
                item_text: item.item_text,
                display_order: item.display_order ?? i,
              }))
            : [{ item_text: '', display_order: 0 }],
      });
    }
  }, [kit, kitItems, form]);

  const mutation = useMutation({
    mutationFn: async (data: KitFormData) => {
      setUploading(true);

      let photoUrl: string | null = kit?.photo ?? null;

      if (clearPhoto) {
        photoUrl = null;
      } else if (photoFile) {
        const result = await replaceProductPhoto(
          photoFile,
          kit?.photo ?? null,
          id
        );
        if (result) {
          photoUrl = result.url;
        }
      }

      const kitPayload = {
        name: data.name,
        description: data.description || null,
        price: data.price,
        status: data.status,
        badge: data.badge || null,
        featured: data.featured,
        display_order: data.display_order,
        photo: photoUrl,
      };

      if (isEdit && id) {
        const { data: updated, error } = await supabase
          .from('kits')
          .update(kitPayload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Replace kit items
        await supabase.from('kit_items').delete().eq('kit_id', id);

        const itemsToInsert = data.items
          .filter((i) => i.item_text.trim())
          .map((item, i) => ({
            kit_id: id,
            item_text: item.item_text,
            display_order: item.display_order ?? i,
          }));

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from('kit_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }

        return updated;
      } else {
        const { data: created, error } = await supabase
          .from('kits')
          .insert([kitPayload])
          .select()
          .single();

        if (error) throw error;

        const newKitId = created.id;

        const itemsToInsert = data.items
          .filter((i) => i.item_text.trim())
          .map((item, i) => ({
            kit_id: newKitId,
            item_text: item.item_text,
            display_order: item.display_order ?? i,
          }));

        if (itemsToInsert.length > 0) {
          await supabase.from('kit_items').insert(itemsToInsert);
        }

        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kits'] });
      toast({
        title: `Kit ${isEdit ? 'updated' : 'created'} successfully`,
      });
      navigate('/admin/inventory/kits');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setClearPhoto(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setClearPhoto(true);
  };

  const addItem = () => {
    if (fields.length < 10) {
      append({
        item_text: '',
        display_order: fields.length,
      });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {isEdit ? 'Edit Kit' : 'Add New Kit'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isEdit
            ? 'Update kit details and items'
            : 'Create a new starter kit bundle'}
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
          className="space-y-6"
        >
          {/* Photo Upload */}
          <div className="space-y-2">
            <FormLabel>Kit Photo</FormLabel>
            <div className="flex items-start gap-4">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-32 w-32 rounded-lg object-cover border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="h-32 w-32 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}

              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="kit-photo-upload"
                />
                <label htmlFor="kit-photo-upload">
                  <Button type="button" variant="outline" asChild>
                    <span className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </span>
                  </Button>
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  Optional. Recommended: Square image, at least 500x500px
                </p>
                {clearPhoto && (
                  <p className="text-sm text-amber-600 mt-1">
                    Photo will be removed when you save.
                  </p>
                )}
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kit Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Essential Kit" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Everything a new puppy needs to get started"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price*</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="79.99"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? 0
                            : parseFloat(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="sold_out">Sold Out</SelectItem>
                      <SelectItem value="inactive">
                        Inactive (Hidden)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="badge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Badge (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Most Popular"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>e.g. &quot;Most Popular&quot;</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="display_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? 0
                            : parseInt(e.target.value, 10)
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>Lower numbers appear first</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="featured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Featured Kit</FormLabel>
                  <FormDescription>
                    Show this kit prominently on the Essentials page
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Kit Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FormLabel>Kit Items* (1-10 items)</FormLabel>
              {fields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              )}
            </div>
            {form.formState.errors.items && (
              <p className="text-sm text-destructive">
                {form.formState.errors.items.message}
              </p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <FormField
                  control={form.control}
                  name={`items.${index}.item_text`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder={`Item ${index + 1}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.display_order`}
                  render={({ field }) => (
                    <FormItem className="w-20">
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? index}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? index
                                : parseInt(e.target.value, 10)
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={mutation.isPending || uploading}
            >
              {mutation.isPending || uploading
                ? uploading
                  ? 'Uploading photo...'
                  : 'Saving...'
                : isEdit
                  ? 'Update Kit'
                  : 'Create Kit'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/inventory/kits')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
