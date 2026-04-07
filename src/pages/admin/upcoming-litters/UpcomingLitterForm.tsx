import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase, type UpcomingLitter, type BreedingDog } from '@/lib/supabase';
import {
  createUpcomingLitter,
  updateUpcomingLitter,
} from '@/lib/admin/upcoming-litters-service';
import { getBirthWindow, getGoHomeWindow, getDueLabelFromBreedingDate, getExpectedWhelpingDate } from '@/lib/litter-timeline';
import { getDisplayBreedFromParentBreeds } from '@/lib/breed-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useRef } from 'react';
import { Loader2, Eye, Upload, X, Wand2 } from 'lucide-react';
import { getBreedingDogPhotoUrl, uploadPuppyPhoto } from '@/lib/puppy-photos';

function getStoragePublicUrl(path: string): string {
  return supabase.storage.from('puppy-photos').getPublicUrl(path).data.publicUrl;
}

const schema = z.object({
  dam_id: z.string().optional(),
  sire_id: z.string().optional(),
  display_breed: z.string().min(1, 'Display breed is required'),
  due_label: z.string().optional(),
  price_label: z.string().optional(),
  deposit_amount: z.number().min(0),
  refundable_deposit_amount: z.number().min(0).optional(),
  description: z.string().optional(),
  placeholder_image_path: z.string().optional(),
  deposit_link: z.string().optional(),
  cta_contact_link: z.string().optional(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0),
  breeding_date: z.string().optional(),
  expected_whelping_date: z.string().optional(),
  min_expected_puppies: z.number().int().min(0).optional(),
  max_expected_puppies: z.number().int().min(0).optional(),
  deposits_reserved_count: z.number().int().min(0).max(8),
  max_deposit_slots: z.number().int().min(1).max(8),
  lifecycle_status: z.enum(['pre_birth', 'post_birth', 'previous']),
  date_of_birth: z.string().optional(),
  total_puppy_count: z.number().int().min(0).optional(),
}).superRefine((data, ctx) => {
  if (data.deposits_reserved_count > data.max_deposit_slots) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Reserved count cannot exceed max deposit slots',
      path: ['deposits_reserved_count'],
    });
  }
});

type FormValues = z.infer<typeof schema>;

export default function UpcomingLitterForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: row, isLoading } = useQuery({
    queryKey: ['upcoming-litter', id],
    queryFn: async () => {
      if (!id || isNew) return null;
      const { data, error } = await supabase
        .from('upcoming_litters')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as UpcomingLitter;
    },
    enabled: !isNew,
  });

  const { data: breedingDogs = [] } = useQuery({
    queryKey: ['breeding-dogs'],
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

  const dams = breedingDogs.filter((d) => d.role === 'Dam');
  const sires = breedingDogs.filter((d) => d.role === 'Sire');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dam_id: '',
      sire_id: '',
      display_breed: '',
      due_label: '',
      price_label: '',
      deposit_amount: 0,
      refundable_deposit_amount: undefined,
      description: '',
      placeholder_image_path: '',
      deposit_link: '',
      cta_contact_link: '/contact',
      is_active: true,
      sort_order: 0,
      breeding_date: '',
      expected_whelping_date: '',
      min_expected_puppies: undefined,
      max_expected_puppies: undefined,
      deposits_reserved_count: 2,
      max_deposit_slots: 4,
      lifecycle_status: 'pre_birth',
      date_of_birth: '',
      total_puppy_count: undefined,
    },
  });

  const breedingDate = form.watch('breeding_date');
  const damId = form.watch('dam_id');
  const sireId = form.watch('sire_id');
  const birthWindow = getBirthWindow(breedingDate);
  const goHomeWindow = getGoHomeWindow(breedingDate);
  const selectedDam = damId ? dams.find((d) => d.id === damId) : null;
  const selectedSire = sireId ? sires.find((s) => s.id === sireId) : null;
  const selectedDamPhotoUrl = getBreedingDogPhotoUrl(selectedDam?.photo_path);
  const selectedSirePhotoUrl = getBreedingDogPhotoUrl(selectedSire?.photo_path);

  /** Past dogs from this line: up to 3 images. Each slot is existing path or new file. */
  type ExamplePuppySlot = { path?: string; file?: File };
  const [examplePuppySlots, setExamplePuppySlots] = useState<ExamplePuppySlot[]>([]);
  const examplePuppyInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<(string | null)[]>([]);
  useEffect(() => {
    const urls: (string | null)[] = examplePuppySlots.map((s) =>
      s.file ? URL.createObjectURL(s.file) : null
    );
    setFilePreviewUrls((prev) => {
      prev.forEach((u) => u && URL.revokeObjectURL(u));
      return urls;
    });
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [examplePuppySlots]);

  useEffect(() => {
    const computed = getDueLabelFromBreedingDate(breedingDate);
    if (computed) form.setValue('due_label', computed);
    const whelping = getExpectedWhelpingDate(breedingDate);
    if (whelping) form.setValue('expected_whelping_date', whelping);
  }, [breedingDate, form]);

  useEffect(() => {
    if (selectedDam?.breed || selectedSire?.breed) {
      const display = getDisplayBreedFromParentBreeds(selectedDam?.breed ?? '', selectedSire?.breed ?? '');
      if (display) form.setValue('display_breed', display);
    }
  }, [selectedDam?.breed, selectedSire?.breed, form]);

  useEffect(() => {
    if (row) {
      form.reset({
        dam_id: row.dam_id ?? '',
        sire_id: row.sire_id ?? '',
        display_breed: (row.display_breed ?? row.breed) ?? '',
        due_label: row.due_label ?? '',
        price_label: row.price_label ?? '',
        deposit_amount: row.deposit_amount ?? 0,
        refundable_deposit_amount: row.refundable_deposit_amount ?? undefined,
        description: row.description ?? '',
        placeholder_image_path: row.placeholder_image_path ?? '',
        deposit_link: row.deposit_link ?? '',
        cta_contact_link: row.cta_contact_link ?? '/contact',
        is_active: row.is_active ?? true,
        sort_order: row.sort_order ?? 0,
        breeding_date: row.breeding_date ?? '',
        expected_whelping_date: row.expected_whelping_date ?? '',
        min_expected_puppies: row.min_expected_puppies ?? undefined,
        max_expected_puppies: row.max_expected_puppies ?? undefined,
        deposits_reserved_count: row.deposits_reserved_count ?? 2,
        max_deposit_slots: row.max_deposit_slots ?? 4,
        lifecycle_status: row.lifecycle_status ?? 'pre_birth',
        date_of_birth: row.date_of_birth ?? '',
        total_puppy_count: row.total_puppy_count ?? undefined,
      });
      const paths = row.example_puppy_image_paths ?? [];
      setExamplePuppySlots(paths.slice(0, 3).map((path) => ({ path })));
    }
  }, [row, form]);

  const buildPayload = (data: FormValues, examplePuppyPaths: string[] | null) => {
    const due_label = getDueLabelFromBreedingDate(data.breeding_date) || data.due_label || null;
    const expected_whelping_date = getExpectedWhelpingDate(data.breeding_date) || data.expected_whelping_date || null;
    const dam = data.dam_id ? dams.find((d) => d.id === data.dam_id) : null;
    const sire = data.sire_id ? sires.find((s) => s.id === data.sire_id) : null;
    const display_breed = (data.display_breed || '').trim() || getDisplayBreedFromParentBreeds(dam?.breed ?? '', sire?.breed ?? '');
    const breed = display_breed;
    return {
      breed,
      display_breed,
      dam_id: data.dam_id || null,
      sire_id: data.sire_id || null,
      dam_name: dam?.name ?? null,
      dam_breed: dam?.breed ?? null,
      sire_name: sire?.name ?? null,
      sire_breed: sire?.breed ?? null,
      due_label,
      expected_whelping_date,
      min_expected_puppies: data.min_expected_puppies ?? null,
      max_expected_puppies: data.max_expected_puppies ?? null,
      price_label: data.price_label || null,
      deposit_amount: data.deposit_amount,
      refundable_deposit_amount: data.refundable_deposit_amount ?? null,
      description: data.description || null,
      placeholder_image_path: data.placeholder_image_path || null,
      deposit_link: data.deposit_link || null,
      cta_contact_link: data.cta_contact_link || '/contact',
      is_active: data.is_active,
      sort_order: data.sort_order,
      breeding_date: data.breeding_date || null,
      deposits_reserved_count: data.deposits_reserved_count,
      max_deposit_slots: data.max_deposit_slots,
      lifecycle_status: data.lifecycle_status,
      date_of_birth: data.date_of_birth || null,
      total_puppy_count: data.total_puppy_count ?? null,
      // Keep denormalized fallback photo paths populated so upcoming litter cards
      // still render parent images if the join cannot be read in the browser.
      dam_photo_path: dam?.photo_path ?? null,
      sire_photo_path: sire?.photo_path ?? null,
      example_puppy_image_paths: examplePuppyPaths && examplePuppyPaths.length > 0 ? examplePuppyPaths : null,
    };
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const paths: string[] = [];
      for (const slot of examplePuppySlots) {
        if (slot.file) {
          const { path } = await uploadPuppyPhoto(slot.file);
          paths.push(path);
        } else if (slot.path) paths.push(slot.path);
      }
      const payload = buildPayload(data, paths.length ? paths : null);
      await createUpcomingLitter(payload as Record<string, unknown>);
    },
    onSuccess: () => {
      toast({ title: 'Upcoming litter added' });
      navigate('/admin/upcoming-litters');
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const paths: string[] = [];
      for (const slot of examplePuppySlots) {
        if (slot.file) {
          const { path } = await uploadPuppyPhoto(slot.file);
          paths.push(path);
        } else if (slot.path) paths.push(slot.path);
      }
      const payload = buildPayload(data, paths.length ? paths : null);
      await updateUpcomingLitter(id!, payload as Record<string, unknown>);
    },
    onSuccess: () => {
      toast({ title: 'Upcoming litter updated' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const generatePuppiesMutation = useMutation({
    mutationFn: async () => {
      if (!id || isNew) return;
      const count = form.getValues('total_puppy_count');
      if (!count || count <= 0) throw new Error('Enter a valid total puppy count first.');
      const dob = form.getValues('date_of_birth') || null;
      const breed = form.getValues('display_breed') || 'Unknown';
      
      // Fetch existing puppies to avoid duplicates or know where to start numbering
      const { data: existing } = await supabase
        .from('puppies')
        .select('id')
        .eq('upcoming_litter_id', id);
        
      const existingCount = existing?.length || 0;
      const toCreate = count - existingCount;
      if (toCreate <= 0) throw new Error(`Already have ${existingCount} puppies generated for this litter.`);

      const newPuppies = Array.from({ length: toCreate }).map((_, i) => ({
        upcoming_litter_id: id,
        name: `Puppy ${existingCount + i + 1}`,
        breed,
        gender: 'Unknown',
        date_of_birth: dob,
        status: 'Available',
      }));

      const { error } = await supabase.from('puppies').insert(newPuppies);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Puppy slots generated successfully!' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
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
    return <div className="text-destructive">Upcoming litter not found.</div>;
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">
        {isNew ? 'Add Upcoming Litter' : 'Edit Upcoming Litter'}
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-6 rounded-lg border p-4">
              <h3 className="font-medium text-lg border-b pb-2">General Information</h3>
              <FormField
                control={form.control}
                name="breeding_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Breeding date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">Date the dogs tied or insemination occurred. Drives due date (~63 days, 1-week range) and go-home (8 weeks after due).</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expected_whelping_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected whelping date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} readOnly className="bg-muted" />
                </FormControl>
                <p className="text-xs text-muted-foreground">Calculated as breeding date + 63 days.</p>
                <FormMessage />
              </FormItem>
            )}
          />
          {birthWindow && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <p className="font-medium text-muted-foreground">Estimated Birth Window</p>
              <p className="mt-1">{format(birthWindow.earliest, 'MMM d')} – {format(birthWindow.latest, 'MMM d')}</p>
            </div>
          )}
          {goHomeWindow && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <p className="font-medium text-muted-foreground">Estimated Go-Home Window</p>
              <p className="mt-1">{format(goHomeWindow.earliest, 'MMM d')} – {format(goHomeWindow.latest, 'MMM d')}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="min_expected_puppies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min expected puppies</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value || '0', 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="max_expected_puppies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max expected puppies</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value || '0', 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="due_label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due label</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Auto-filled: due approx. 63 days from breeding, 1-week range" />
                </FormControl>
                <p className="text-xs text-muted-foreground">Optional; derived from breeding date (avg 63-day pregnancy, ~1 week range).</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price_label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price label</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. $1,500 to $2,000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deposit_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit amount ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value || '0', 10))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="refundable_deposit_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Refundable deposit amount ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Optional"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === '' ? undefined : parseInt(v, 10));
                    }}
                  />
                </FormControl>
                <p className="text-sm text-muted-foreground">Refundable up to the date of birth.</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deposits_reserved_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deposits shown as filled</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={8}
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value || '0', 10))
                    }
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Public site shows “X of Y reserve spots” for urgency. Must not exceed max slots below.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="max_deposit_slots"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max deposit slots offered</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value || '4', 10))
                    }
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Typically 4: we only collect deposits for up to four picks per litter.
                </p>
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
                  <Textarea {...field} rows={3} placeholder="Short description of typical puppy traits" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Parents</h3>
            <p className="text-sm text-muted-foreground">Select from Breeding Dogs. Add dams and sires in the Breeding Dogs tab if needed.</p>
            <FormField
              control={form.control}
              name="dam_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dam (female parent)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dam" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dams.map((d) => (
                        <SelectItem key={d.id} value={d.id!}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDam && (
                    <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
                      {selectedDamPhotoUrl && (
                        <img
                          src={selectedDamPhotoUrl}
                          alt={selectedDam.name}
                          className="mb-2 h-24 w-24 rounded-lg object-cover border"
                        />
                      )}
                      <p><span className="font-medium text-foreground">Breed:</span> {selectedDam.breed}</p>
                      <p><span className="font-medium text-foreground">Composition:</span> {selectedDam.composition}</p>
                      <p><span className="font-medium text-foreground">Color:</span> {selectedDam.color}</p>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sire_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sire (male parent)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sire" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sires.map((s) => (
                        <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSire && (
                    <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
                      {selectedSirePhotoUrl && (
                        <img
                          src={selectedSirePhotoUrl}
                          alt={selectedSire.name}
                          className="mb-2 h-24 w-24 rounded-lg object-cover border"
                        />
                      )}
                      <p><span className="font-medium text-foreground">Breed:</span> {selectedSire.breed}</p>
                      <p><span className="font-medium text-foreground">Composition:</span> {selectedSire.composition}</p>
                      <p><span className="font-medium text-foreground">Color:</span> {selectedSire.color}</p>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Past dogs from this line (up to 3 images)</h3>
            <p className="text-sm text-muted-foreground">
              Optional. These appear on the public Upcoming Litters page only when at least one image is added. If none are uploaded, that section is not shown.
            </p>
            <div className="flex flex-wrap gap-4">
              {examplePuppySlots.map((slot, index) => (
                <div key={index} className="flex flex-col items-start gap-2">
                  <input
                    ref={(el) => { examplePuppyInputRefs.current[index] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setExamplePuppySlots((prev) => {
                        const next = [...prev];
                        next[index] = { file };
                        return next;
                      });
                    }}
                  />
                  {(slot.file || slot.path) && (
                    <>
                      <img
                        src={slot.file ? (filePreviewUrls[index] ?? '') : getStoragePublicUrl(slot.path!)}
                        alt={`Past dog ${index + 1}`}
                        className="h-24 w-24 rounded-lg object-cover border"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => examplePuppyInputRefs.current[index]?.click()}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExamplePuppySlots((prev) => prev.filter((_, i) => i !== index));
                            examplePuppyInputRefs.current = examplePuppyInputRefs.current.filter((_, i) => i !== index);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                  {!slot.file && !slot.path && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => examplePuppyInputRefs.current[index]?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Add image
                    </Button>
                  )}
                </div>
              ))}
              {examplePuppySlots.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExamplePuppySlots((prev) => (prev.length < 3 ? [...prev, {}] : prev))}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Add image ({examplePuppySlots.length}/3)
                </Button>
              )}
            </div>
          </div>

          <FormField
            control={form.control}
            name="display_breed"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  Display breed (customer-facing)
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Goldendoodle — shown on public Upcoming Litters" />
                </FormControl>
                <p className="text-xs text-muted-foreground">What customers see on the front end. Auto-filled from parent breeds; you can override.</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="placeholder_image_path"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placeholder image path</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. puppy-placeholder/shih-tzu-default.png" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deposit_link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit link (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Stripe or other payment URL" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cta_contact_link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact CTA link</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="/contact" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value || '0', 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Right Column: Lifecycle & Post-Birth */}
          <div className="space-y-6">
            <div className="space-y-6 rounded-lg border p-4 sticky top-6 bg-card">
              <h3 className="font-medium text-lg border-b pb-2">Lifecycle & Post-Birth</h3>
              
              <FormField
                control={form.control}
                name="lifecycle_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pre_birth">Pre-birth (Upcoming)</SelectItem>
                        <SelectItem value="post_birth">Post-birth (Born)</SelectItem>
                        <SelectItem value="previous">Previous Litter</SelectItem>
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
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Leave empty if pre-birth.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_puppy_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total puppy count</FormLabel>
                    <div className="flex flex-col gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === '' ? undefined : parseInt(v, 10));
                          }}
                        />
                      </FormControl>
                      {!isNew && (field.value || 0) > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          onClick={() => generatePuppiesMutation.mutate()}
                          disabled={generatePuppiesMutation.isPending}
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          Generate Slots
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Actual number born.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active (Public)</FormLabel>
                      <p className="text-sm text-muted-foreground">Show this litter on the public site.</p>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isNew ? 'Add' : 'Save'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/admin/upcoming-litters')}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
