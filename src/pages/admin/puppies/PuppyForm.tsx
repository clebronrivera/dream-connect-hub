import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase, Puppy } from '@/lib/supabase';
import { uploadPuppyPhoto } from '@/lib/puppy-photos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getAgeWeeks } from '@/lib/puppy-utils';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

const puppySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  puppy_id: z.string().optional(),
  breed: z.string().min(1, 'Breed is required'),
  listing_date: z.string().optional(), // Date added to website (YYYY-MM-DD)
  gender: z.enum(['Male', 'Female']).optional(),
  color: z.string().optional(),
  date_of_birth: z.string().optional(),
  age_weeks: z.number().optional(),
  ready_date: z.string().optional(),
  base_price: z.number().min(0).optional(),
  discount_active: z.boolean().optional(),
  discount_amount: z.number().min(0).optional(),
  discount_note: z.string().optional(),
  final_price: z.number().min(0).optional(),
  status: z.enum(['Available', 'Pending', 'Sold', 'Reserved']).default('Available'),
  description: z.string().optional(),
  mom_weight_approx: z.number().optional(),
  dad_weight_approx: z.number().optional(),
  vaccinations: z.string().optional(),
  health_certificate: z.boolean().optional(),
  microchipped: z.boolean().optional(),
  featured: z.boolean().optional(),
  display_order: z.number().optional(),
  primary_photo: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

type PuppyFormValues = z.infer<typeof puppySchema>;

export default function PuppyForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fetch existing puppy if editing
  const { data: puppy, isLoading } = useQuery({
    queryKey: ['puppy', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('puppies')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Puppy;
    },
    enabled: isEdit,
  });

  const form = useForm<PuppyFormValues>({
    resolver: zodResolver(puppySchema),
    defaultValues: {
      status: 'Available',
      listing_date: new Date().toISOString().slice(0, 10),
      discount_active: false,
      health_certificate: false,
      microchipped: false,
      featured: false,
      display_order: 0,
      photos: [],
    },
  });

  // Update form when puppy data loads
  useEffect(() => {
    if (puppy) {
      form.reset({
        name: puppy.name || '',
        puppy_id: puppy.puppy_id || '',
        breed: puppy.breed || '',
        listing_date: puppy.listing_date ?? (puppy.created_at ? puppy.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        gender: puppy.gender,
        color: puppy.color || '',
        date_of_birth: puppy.date_of_birth || '',
        age_weeks: puppy.age_weeks,
        ready_date: puppy.ready_date || '',
        base_price: puppy.base_price,
        discount_active: puppy.discount_active || false,
        discount_amount: puppy.discount_amount,
        discount_note: puppy.discount_note || '',
        final_price: puppy.final_price,
        status: puppy.status || 'Available',
        description: puppy.description || '',
        mom_weight_approx: puppy.mom_weight_approx,
        dad_weight_approx: puppy.dad_weight_approx,
        vaccinations: puppy.vaccinations || '',
        health_certificate: puppy.health_certificate || false,
        microchipped: puppy.microchipped || false,
        featured: puppy.featured || false,
        display_order: puppy.display_order || 0,
        primary_photo: puppy.primary_photo || '',
        photos: puppy.photos || [],
      });
    }
  }, [puppy, form]);

  const mutation = useMutation({
    mutationFn: async (data: PuppyFormValues) => {
      const payload = { ...data };
      // On create, set listing_date to today if not provided
      if (!isEdit && !payload.listing_date) {
        payload.listing_date = new Date().toISOString().slice(0, 10);
      }
      if (isEdit && id) {
        const { data: result, error } = await supabase
          .from('puppies')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('puppies')
          .insert([payload])
          .select()
          .single();
        
        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      toast({ 
        title: `Puppy ${isEdit ? 'updated' : 'created'} successfully`,
        description: `The puppy has been ${isEdit ? 'updated' : 'added'} to the database.`,
      });
      navigate('/admin/puppies');
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message || `Failed to ${isEdit ? 'update' : 'create'} puppy.`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PuppyFormValues) => {
    mutation.mutate(data);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { url } = await uploadPuppyPhoto(file);
      form.setValue('primary_photo', url);
      const currentPhotos = form.getValues('photos') || [];
      form.setValue('photos', [...currentPhotos, url]);
      toast({
        title: 'Photo uploaded',
        description: 'The photo has been uploaded successfully.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload photo.';
      toast({
        title: 'Upload failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">
        {isEdit ? 'Edit Puppy' : 'Add New Puppy'}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="puppy_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puppy ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., PH001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="breed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Breed *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="listing_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} placeholder="Date added to website" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Day this puppy was added to the website</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Input {...field} />
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
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Sold">Sold</SelectItem>
                      <SelectItem value="Reserved">Reserved</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="age_weeks"
              render={({ field }) => {
                const dob = form.watch('date_of_birth');
                const computedWeeks = getAgeWeeks(dob);
                const hasDob = !!dob && computedWeeks != null;
                return (
                  <FormItem>
                    <FormLabel>Age (weeks)</FormLabel>
                    {hasDob ? (
                      <p className="text-sm text-muted-foreground py-2">
                        {computedWeeks} weeks <span className="text-xs">(from date of birth)</span>
                      </p>
                    ) : (
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Optional if no DOB"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="ready_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ready Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="base_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discount_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Discount Active</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discount_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Amount</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="final_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Final Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mom_weight_approx"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mom Weight (lbs)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dad_weight_approx"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dad Weight (lbs)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vaccinations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vaccinations</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="health_certificate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Health Certificate</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="microchipped"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Microchipped</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="featured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Featured</FormLabel>
                  </div>
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
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discount_note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Note</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormLabel>Primary Photo</FormLabel>
            <Input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
            />
            {form.watch('primary_photo') && (
              <div className="mt-2">
                <img
                  src={form.watch('primary_photo')}
                  alt="Primary photo"
                  className="h-32 w-32 object-cover rounded"
                />
              </div>
            )}
            {uploadingPhoto && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={mutation.isPending || uploadingPhoto}>
              {mutation.isPending ? 'Saving...' : 'Save Puppy'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/puppies')}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
