import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, Puppy } from '@/lib/supabase';
import { uploadPuppyPhoto } from '@/lib/puppy-photos';
import {
  createLitterFromPuppy,
  createPuppyFromLitter,
  bulkCreatePuppiesFromLitter,
} from '@/lib/litter-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getAgeWeeks, getReadyDateFromDob } from '@/lib/puppy-utils';
import { MAIN_BREEDS, normalizeBreedToCanonical, isMainBreed, OTHER_BREED_OPTION } from '@/lib/breed-utils';
import { getSuggestedPuppyName } from '@/lib/puppy-name-generator';
import { generatePuppyDescription } from '@/lib/puppy-description-generator';
import { useState, useEffect } from 'react';
import { Loader2, Users, UserPlus, Sparkles, RefreshCw } from 'lucide-react';
import * as React from 'react';

// Coerce null to undefined so optional number fields don't fail validation
const optionalNumber = (s: z.ZodNumber) =>
  z.preprocess((v) => (v === null || v === '' ? undefined : v), s.optional());

const puppySchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    puppy_id: z.string().optional(),
    breed_select: z.string().min(1, 'Please select a breed'),
    other_breed: z.string().optional(),
    listing_date: z.string().optional(), // Date added to website (YYYY-MM-DD)
  gender: z.enum(['Male', 'Female']).optional(),
  color: z.string().optional(),
  date_of_birth: z.string().optional(),
  age_weeks: optionalNumber(z.number()),
  ready_date: z.string().optional(),
  base_price: optionalNumber(z.number().min(0)),
  discount_active: z.boolean().optional(),
  discount_amount: optionalNumber(z.number().min(0)),
  discount_note: z.string().optional(),
  final_price: optionalNumber(z.number().min(0)),
  status: z.enum(['Available', 'Pending', 'Sold', 'Reserved']).default('Available'),
  description: z.string().optional(),
  mom_weight_approx: optionalNumber(z.number()),
  dad_weight_approx: optionalNumber(z.number()),
  vaccinations: z.string().optional(),
  health_certificate: z.boolean().optional(),
  microchipped: z.boolean().optional(),
  featured: z.boolean().optional(),
  display_order: optionalNumber(z.number()),
  primary_photo: z.string().optional(),
  photos: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.breed_select === OTHER_BREED_OPTION) return !!data.other_breed?.trim();
      return true;
    },
    { message: 'Please enter the other breed', path: ['other_breed'] }
  );

type PuppyFormValues = z.infer<typeof puppySchema>;

export default function PuppyForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addLittermateOpen, setAddLittermateOpen] = useState(false);
  const [generateLittermatesOpen, setGenerateLittermatesOpen] = useState(false);
  // Add littermate form state
  const [littermateGender, setLittermateGender] = useState<'Male' | 'Female'>('Male');
  const [littermateColor, setLittermateColor] = useState('');
  const [littermateName, setLittermateName] = useState('');
  const [littermatePhotoFile, setLittermatePhotoFile] = useState<File | null>(null);
  const [littermatePhotoUrl, setLittermatePhotoUrl] = useState<string | null>(null);
  // Bulk form state
  const [bulkMaleCount, setBulkMaleCount] = useState(0);
  const [bulkFemaleCount, setBulkFemaleCount] = useState(0);
  const [bulkBaseName, setBulkBaseName] = useState('Littermate');
  const [bulkCreatedIds, setBulkCreatedIds] = useState<string[]>([]);

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

  // Fetch existing puppy names for duplicate-aware suggestions (new puppy only)
  const { data: existingNames = [] } = useQuery({
    queryKey: ['puppy-names'],
    queryFn: async () => {
      const { data, error } = await supabase.from('puppies').select('name').not('name', 'is', null);
      if (error) throw error;
      return (data ?? []).map((r) => (r as { name: string }).name).filter(Boolean);
    },
    enabled: !isEdit,
  });

  const form = useForm<PuppyFormValues>({
    resolver: zodResolver(puppySchema),
    defaultValues: {
      breed_select: '',
      other_breed: '',
      status: 'Available',
      listing_date: new Date().toISOString().slice(0, 10),
      discount_active: false,
      health_certificate: false,
      featured: false,
      display_order: 0,
      photos: [],
    },
  });

  // When DOB changes, set ready date to DOB + 8 weeks (user can override)
  const dob = form.watch('date_of_birth');
  useEffect(() => {
    if (!dob || typeof dob !== 'string' || !dob.trim()) return;
    const ready = getReadyDateFromDob(dob);
    if (ready) form.setValue('ready_date', ready);
  }, [dob, form]);

  // Auto-calculate final price when base price, discount toggle, or discount amount changes
  const basePrice = form.watch('base_price');
  const discountActive = form.watch('discount_active');
  const discountAmount = form.watch('discount_amount');
  useEffect(() => {
    const base = basePrice != null && basePrice !== '' ? Number(basePrice) : 0;
    const amount = discountActive && discountAmount != null && discountAmount !== '' ? Number(discountAmount) : 0;
    const final = Math.max(0, base - amount);
    form.setValue('final_price', final);
  }, [basePrice, discountActive, discountAmount, form]);

  // Auto-fill name when gender is selected on new puppy and name is empty
  const gender = form.watch('gender');
  useEffect(() => {
    if (isEdit || !gender) return;
    const current = form.getValues('name');
    if (current != null && String(current).trim() !== '') return;
    const suggested = getSuggestedPuppyName(gender, existingNames);
    form.setValue('name', suggested);
  }, [isEdit, gender, existingNames, form]);

  // Update form when puppy data loads
  useEffect(() => {
    if (puppy) {
      const savedBreed = (puppy.breed || '').trim();
      const canonical = normalizeBreedToCanonical(savedBreed);
      const useMainBreed = isMainBreed(savedBreed);
      form.reset({
        name: puppy.name || '',
        puppy_id: puppy.puppy_id || '',
        breed_select: useMainBreed ? canonical : OTHER_BREED_OPTION,
        other_breed: useMainBreed ? '' : savedBreed,
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
        featured: puppy.featured || false,
        display_order: puppy.display_order || 0,
        primary_photo: puppy.primary_photo || '',
        photos: puppy.photos || [],
      });
    }
  }, [puppy, form]);

  const mutation = useMutation({
    mutationFn: async (data: PuppyFormValues) => {
      const { breed_select, other_breed, ...rest } = data;
      const breed =
        breed_select === OTHER_BREED_OPTION ? (other_breed || '').trim() : breed_select;
      const payload = { ...rest, breed };
      // On create, set listing_date to today if not provided
      if (!isEdit && !payload.listing_date) {
        payload.listing_date = new Date().toISOString().slice(0, 10);
      }
      // When DOB is set: use computed age_weeks (present − DOB) and ready_date (DOB + 8 weeks) if missing
      if (payload.date_of_birth) {
        const ageWeeks = getAgeWeeks(payload.date_of_birth);
        if (ageWeeks != null && (payload.age_weeks == null || payload.age_weeks === undefined)) {
          payload.age_weeks = ageWeeks;
        }
        const readyDate = getReadyDateFromDob(payload.date_of_birth);
        if (readyDate && (!payload.ready_date || !String(payload.ready_date).trim())) {
          payload.ready_date = readyDate;
        }
      }
      // Strip null/undefined for optional numbers so Supabase doesn't receive null
      const optionalNumKeys = ['age_weeks', 'base_price', 'discount_amount', 'final_price', 'mom_weight_approx', 'dad_weight_approx', 'display_order'] as const;
      optionalNumKeys.forEach((k) => {
        const v = payload[k];
        if (v === null || v === undefined) delete payload[k];
      });
      // Empty string is invalid for date columns — send null instead
      const dateKeys = ['listing_date', 'date_of_birth', 'ready_date'] as const;
      dateKeys.forEach((k) => {
        const v = payload[k];
        if (v === '' || (typeof v === 'string' && !v.trim())) {
          (payload as Record<string, unknown>)[k] = null;
        }
      });
      // puppy_id is UNIQUE; empty string would duplicate. Use null so multiple puppies can have "no custom ID"
      const pid = payload.puppy_id;
      if (pid === '' || (typeof pid === 'string' && !pid.trim())) {
        (payload as Record<string, unknown>).puppy_id = null;
      }
      // Clamp final price to 0 (never persist negative)
      const base = payload.base_price != null ? Number(payload.base_price) : 0;
      const discount = payload.discount_active && payload.discount_amount != null ? Number(payload.discount_amount) : 0;
      payload.final_price = Math.max(0, base - discount);
      // All dogs come with first-round vaccinations, health certificate, and microchipping
      payload.health_certificate = true;
      payload.vaccinations = payload.vaccinations || 'First round included';
      payload.microchipped = true;
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
    onSuccess: (_data, _variables, _context) => {
      // Invalidate so list and profile show updated data (e.g. status Sold, discount, final price)
      queryClient.invalidateQueries({ queryKey: ['admin-puppies'] });
      queryClient.invalidateQueries({ queryKey: ['puppies'] });
      if (isEdit && id) {
        queryClient.invalidateQueries({ queryKey: ['puppy', id] });
      }
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

  const createLitterMutation = useMutation({
    mutationFn: () => createLitterFromPuppy(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puppy', id] });
      toast({ title: 'Litter created', description: 'This puppy is now part of a litter. Add littermates below.' });
    },
    onError: (error: Error) => {
      const msg = error.message || '';
      const hint = /relation.*litters|does not exist|column.*litter_id/i.test(msg)
        ? ' Run the database migration: Supabase SQL Editor → run supabase/migrations/20250224000000_litters_table_and_puppy_litter_id.sql'
        : '';
      toast({ title: 'Error', description: msg + hint, variant: 'destructive' });
    },
  });

  const addLittermateMutation = useMutation({
    mutationFn: async () => {
      let primaryPhoto: string | null = littermatePhotoUrl;
      if (littermatePhotoFile) {
        const { url } = await uploadPuppyPhoto(littermatePhotoFile);
        primaryPhoto = url;
      }
      return createPuppyFromLitter(puppy!.litter_id!, {
        gender: littermateGender,
        color: littermateColor || undefined,
        name: littermateName || undefined,
        primaryPhoto: primaryPhoto ?? undefined,
      });
    },
    onSuccess: (newPuppyId) => {
      setAddLittermateOpen(false);
      setLittermateGender('Male');
      setLittermateColor('');
      setLittermateName('');
      setLittermatePhotoFile(null);
      setLittermatePhotoUrl(null);
      toast({ title: 'Littermate added', description: 'Redirecting to edit the new puppy.' });
      navigate(`/admin/puppies/${newPuppyId}/edit`);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: () =>
      bulkCreatePuppiesFromLitter({
        litterId: puppy!.litter_id!,
        counts: { male: bulkMaleCount, female: bulkFemaleCount },
        baseName: bulkBaseName || undefined,
      }),
    onSuccess: (ids) => {
      setBulkCreatedIds(ids);
      if (ids.length > 0) {
        setBulkMaleCount(0);
        setBulkFemaleCount(0);
        setBulkBaseName('Littermate');
        toast({ title: 'Littermates created', description: `${ids.length} puppy(ies) added.` });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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

      {/* Litter actions: only when editing an existing puppy */}
      {isEdit && (
        <div className="mb-8 rounded-lg border border-border bg-muted/40 p-4 shadow-sm">
          <h2 className="text-base font-semibold mb-2">Litter</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Create a litter from this puppy, then add littermates so shared fields (breed, dates, price, etc.) are prefilled.
          </p>
          {!puppy ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : !puppy.litter_id ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => createLitterMutation.mutate()}
                disabled={createLitterMutation.isPending}
              >
                {createLitterMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Create Litter From Puppy
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setAddLittermateOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Littermate
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGenerateLittermatesOpen(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Littermates
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
              >
                <Link to={`/admin/litters/${puppy.litter_id}/edit`}>
                  Edit Litter Defaults
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Name *</FormLabel>
                    {!isEdit && (
                      gender ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentName = form.getValues('name');
                            const exclude = [...existingNames];
                            if (currentName?.trim()) exclude.push(currentName.trim());
                            const next = getSuggestedPuppyName(gender, exclude);
                            form.setValue('name', next);
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Regenerate name
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Select gender to generate a name</span>
                      )
                    )}
                  </div>
                  <FormControl>
                    <Input {...field} placeholder={!isEdit ? 'Select gender below to auto-fill, or type your own' : undefined} />
                  </FormControl>
                  {!isEdit && (
                    <p className="text-xs text-muted-foreground">
                      A suggested name will appear when you select Gender below. You can change it or use Regenerate name for another.
                    </p>
                  )}
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
              name="breed_select"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Breed *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== OTHER_BREED_OPTION) form.setValue('other_breed', '');
                    }}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select breed" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MAIN_BREEDS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                      <SelectItem value={OTHER_BREED_OPTION}>{OTHER_BREED_OPTION}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('breed_select') === OTHER_BREED_OPTION && (
              <FormField
                control={form.control}
                name="other_breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other breed *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter breed name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                  <p className="text-xs text-muted-foreground">Auto-calculated as 8 weeks after date of birth; you can change it.</p>
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
              render={({ field }) => {
                const value = field.value;
                const display = value != null && value !== '' ? Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '—';
                return (
                  <FormItem>
                    <FormLabel>Final Price</FormLabel>
                    <FormControl>
                      <span className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm font-medium">
                        {value != null && value !== '' ? `$${display}` : '—'}
                      </span>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Calculated from base price and discount (read-only)</p>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
            render={({ field }) => {
              const breedSelect = form.watch('breed_select');
              const breed =
                breedSelect === OTHER_BREED_OPTION
                  ? (form.watch('other_breed') || '').trim()
                  : breedSelect;
              const name = form.watch('name')?.trim();
              const gender = form.watch('gender');
              const canGenerate = !!name && !!breed && !!gender;
              const handleGenerateDescription = () => {
                if (!canGenerate) return;
                const input = {
                  name: name || 'This puppy',
                  breed,
                  gender: gender ?? undefined,
                  color: form.watch('color') || undefined,
                  date_of_birth: form.watch('date_of_birth') || undefined,
                  age_weeks: form.watch('age_weeks') ?? undefined,
                };
                const text = generatePuppyDescription(input, { sentenceCount: 5 });
                form.setValue('description', text);
                toast({ title: 'Description generated', description: 'You can edit the text before saving.' });
              };
              return (
                <FormItem>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FormLabel>Description</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateDescription}
                        disabled={!canGenerate}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Generate description
                      </Button>
                      {field.value && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateDescription}
                          disabled={!canGenerate}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Regenerate
                        </Button>
                      )}
                    </div>
                  </div>
                  {!canGenerate && (
                    <p className="text-xs text-muted-foreground">
                      Set Name, Breed, and Gender to enable Generate / Regenerate.
                    </p>
                  )}
                  <FormControl>
                    <Textarea {...field} rows={4} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
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

      {/* Add Littermate modal */}
      <Dialog open={addLittermateOpen} onOpenChange={setAddLittermateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Littermate</DialogTitle>
            <DialogDescription>
              New puppy will use this litter&apos;s shared fields. You only need to set gender; photo and color can be filled on the edit page.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Gender *</label>
              <Select value={littermateGender} onValueChange={(v) => setLittermateGender(v as 'Male' | 'Female')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Color (optional)</label>
              <Input
                value={littermateColor}
                onChange={(e) => setLittermateColor(e.target.value)}
                placeholder="e.g. Golden"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Name (optional)</label>
              <Input
                value={littermateName}
                onChange={(e) => setLittermateName(e.target.value)}
                placeholder="Leave blank for default"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Primary photo (optional)</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setLittermatePhotoFile(f ?? null);
                  setLittermatePhotoUrl(null);
                }}
              />
              {(littermatePhotoUrl || littermatePhotoFile) && (
                <p className="text-xs text-muted-foreground">
                  {littermatePhotoFile ? littermatePhotoFile.name : 'Uploaded'} — will upload on submit
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLittermateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addLittermateMutation.mutate()}
              disabled={addLittermateMutation.isPending}
            >
              {addLittermateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add &amp; go to edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Littermates modal */}
      <Dialog open={generateLittermatesOpen} onOpenChange={(open) => {
        setGenerateLittermatesOpen(open);
        if (!open) setBulkCreatedIds([]);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Littermates</DialogTitle>
            <DialogDescription>
              Create multiple puppies from this litter. Names will be &quot;{bulkBaseName || 'Littermate'} 1&quot;, &quot;2&quot;, etc. You can add photos and colors on each puppy&apos;s edit page.
            </DialogDescription>
          </DialogHeader>
          {bulkCreatedIds.length > 0 ? (
            <div className="py-4 space-y-2">
              <p className="text-sm font-medium">Created {bulkCreatedIds.length} puppy(ies). Open to add photo and color:</p>
              <ul className="list-disc list-inside space-y-1">
                {bulkCreatedIds.map((pid) => (
                  <li key={pid}>
                    <Link to={`/admin/puppies/${pid}/edit`} className="text-primary underline">
                      Edit puppy
                    </Link>
                  </li>
                ))}
              </ul>
              <Button variant="outline" onClick={() => setGenerateLittermatesOpen(false)}>Close</Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Male count</label>
                  <Input
                    type="number"
                    min={0}
                    value={bulkMaleCount}
                    onChange={(e) => setBulkMaleCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Female count</label>
                  <Input
                    type="number"
                    min={0}
                    value={bulkFemaleCount}
                    onChange={(e) => setBulkFemaleCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Base name (optional)</label>
                  <Input
                    value={bulkBaseName}
                    onChange={(e) => setBulkBaseName(e.target.value)}
                    placeholder="Littermate"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenerateLittermatesOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => bulkCreateMutation.mutate()}
                  disabled={bulkCreateMutation.isPending || (bulkMaleCount + bulkFemaleCount <= 0)}
                >
                  {bulkCreateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create {bulkMaleCount + bulkFemaleCount} puppy(ies)
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
