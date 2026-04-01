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
import { Loader2, Eye, Upload, X } from 'lucide-react';
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
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">
        {isNew ? 'Add Upcoming Litter' : 'Edit Upcoming Litter'}
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>Visible on Upcoming Litters page</FormLabel>
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
          <div className="flex gap-4">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isNew ? 'Add' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/upcoming-litters')}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
