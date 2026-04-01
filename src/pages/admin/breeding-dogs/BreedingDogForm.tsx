import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { BreedingDog } from '@/lib/supabase';
import {
  fetchBreedingDog,
  createBreedingDog,
  updateBreedingDog,
} from '@/lib/admin/breeding-dogs-service';
import { uploadBreedingDogPhoto, getBreedingDogPhotoUrl } from '@/lib/puppy-photos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useRef } from 'react';
import { Loader2, Upload, X } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['Sire', 'Dam']),
  breed: z.string().min(1, 'Breed is required'),
  composition: z.string().min(1, 'Composition is required'),
  color: z.string().min(1, 'Color is required'),
});

type FormValues = z.infer<typeof schema>;

export default function BreedingDogForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: row, isLoading } = useQuery({
    queryKey: ['breeding-dog', id],
    queryFn: () => fetchBreedingDog(id!),
    enabled: !isNew,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      role: 'Dam',
      breed: '',
      composition: '',
      color: '',
    },
  });

  useEffect(() => {
    if (row) {
      form.reset({
        name: row.name,
        role: row.role,
        breed: row.breed,
        composition: row.composition,
        color: row.color,
      });
    }
  }, [row, form]);

  const currentPhotoPath = row?.photo_path;
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (photoFile) {
      const url = URL.createObjectURL(photoFile);
      setFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setFilePreviewUrl(null);
  }, [photoFile]);
  const currentPhotoUrl = !removePhoto && (photoFile ? filePreviewUrl : getBreedingDogPhotoUrl(currentPhotoPath));
  const showPhotoPreview = !!currentPhotoUrl;

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const inserted = await createBreedingDog({
        name: data.name,
        role: data.role,
        breed: data.breed,
        composition: data.composition,
        color: data.color,
      });
      if (photoFile && inserted.id) {
        const { path } = await uploadBreedingDogPhoto(photoFile, inserted.id);
        await updateBreedingDog(inserted.id, { photo_path: path });
      }
    },
    onSuccess: () => {
      toast({ title: 'Breeding dog added' });
      navigate('/admin/breeding-dogs');
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      let photoPath: string | null | undefined = row?.photo_path;
      if (removePhoto) {
        photoPath = null;
      } else if (photoFile && id) {
        const { path } = await uploadBreedingDogPhoto(photoFile, id);
        photoPath = path;
      }
      await updateBreedingDog(id!, {
        name: data.name,
        role: data.role,
        breed: data.breed,
        composition: data.composition,
        color: data.color,
        photo_path: photoPath,
      });
    },
    onSuccess: () => {
      toast({ title: 'Breeding dog updated' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (isNew) createMutation.mutate(data);
    else updateMutation.mutate(data);
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isNew && !row) {
    return <div className="text-destructive">Breeding dog not found.</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">
        {isNew ? 'Add Breeding Dog' : 'Edit Breeding Dog'}
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Star" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Dam">Dam</SelectItem>
                    <SelectItem value="Sire">Sire</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="breed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Breed</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. F1B Goldendoodle" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="composition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Composition</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. 75% Poodle, 25% Golden Retriever" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Apricot" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Photo</FormLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPhotoFile(f ?? null);
                setRemovePhoto(false);
              }}
            />
            {showPhotoPreview && (
              <div className="flex items-start gap-4">
                <img
                  src={currentPhotoUrl!}
                  alt={row?.name ?? 'Dog'}
                  className="h-32 w-32 rounded-lg object-cover border"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Change photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPhotoFile(null);
                      setRemovePhoto(true);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove photo
                  </Button>
                </div>
              </div>
            )}
            {!showPhotoPreview && (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Add photo
              </Button>
            )}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isNew ? 'Add' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/breeding-dogs')}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
