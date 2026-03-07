import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { addDays, format, parseISO, isValid } from 'date-fns';
import { supabase, type UpcomingLitter } from '@/lib/supabase';
import { uploadPuppyPhoto } from '@/lib/puppy-photos';
import { MAIN_BREEDS, OTHER_BREED_OPTION, getDisplayBreedFromParentBreeds, isMainBreed } from '@/lib/breed-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Loader2, Eye } from 'lucide-react';

const MAX_EXAMPLE_IMAGES = 3;

const schema = z
  .object({
    dam_breed_select: z.string().min(1, 'Dam breed is required'),
    dam_other_breed: z.string().optional(),
    sire_breed_select: z.string().min(1, 'Sire breed is required'),
    sire_other_breed: z.string().optional(),
    display_breed: z.string().min(1, 'Display breed is required'),
    due_label: z.string().optional(),
    price_label: z.string().optional(),
    deposit_amount: z.number().min(0),
    description: z.string().optional(),
    placeholder_image_path: z.string().optional(),
    deposit_link: z.string().optional(),
    cta_contact_link: z.string().optional(),
    is_active: z.boolean(),
    sort_order: z.number().int().min(0),
    dam_name: z.string().optional(),
    sire_name: z.string().optional(),
    dam_photo_path: z.string().optional(),
    sire_photo_path: z.string().optional(),
    example_puppy_image_paths: z.array(z.string()).max(MAX_EXAMPLE_IMAGES).optional(),
    breeding_date: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.dam_breed_select === OTHER_BREED_OPTION) return !!data.dam_other_breed?.trim();
      return true;
    },
    { message: 'Please enter dam breed', path: ['dam_other_breed'] }
  )
  .refine(
    (data) => {
      if (data.sire_breed_select === OTHER_BREED_OPTION) return !!data.sire_other_breed?.trim();
      return true;
    },
    { message: 'Please enter sire breed', path: ['sire_other_breed'] }
  );

type FormValues = z.infer<typeof schema>;

function getBirthWindow(breedingDateStr: string | null | undefined): { earliest: Date; latest: Date } | null {
  if (!breedingDateStr || !breedingDateStr.trim()) return null;
  try {
    const d = parseISO(breedingDateStr);
    if (isNaN(d.getTime())) return null;
    return { earliest: addDays(d, 60), latest: addDays(d, 67) };
  } catch {
    return null;
  }
}

function getGoHomeWindow(breedingDateStr: string | null | undefined): { earliest: Date; latest: Date } | null {
  const birth = getBirthWindow(breedingDateStr);
  if (!birth) return null;
  return { earliest: addDays(birth.earliest, 56), latest: addDays(birth.latest, 56) };
}

/** Compute due label from breeding (insemination) date: "Due MMM d, yyyy" (approx 63 days). */
function getDueLabelFromBreedingDate(breedingDateStr: string | null | undefined): string | null {
  if (!breedingDateStr?.trim()) return null;
  try {
    const d = parseISO(breedingDateStr);
    if (!isValid(d)) return null;
    const dueDate = addDays(d, 63);
    return `Due ${format(dueDate, 'MMM d, yyyy')}`;
  } catch {
    return null;
  }
}

export default function UpcomingLitterForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadingDam, setUploadingDam] = useState(false);
  const [uploadingSire, setUploadingSire] = useState(false);
  const [uploadingExample, setUploadingExample] = useState(false);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dam_breed_select: '',
      dam_other_breed: '',
      sire_breed_select: '',
      sire_other_breed: '',
      display_breed: '',
      due_label: '',
      price_label: '',
      deposit_amount: 0,
      description: '',
      placeholder_image_path: '',
      deposit_link: '',
      cta_contact_link: '/contact',
      is_active: true,
      sort_order: 0,
      dam_name: '',
      sire_name: '',
      dam_photo_path: '',
      sire_photo_path: '',
      example_puppy_image_paths: [],
      breeding_date: '',
    },
  });

  const breedingDate = form.watch('breeding_date');
  const birthWindow = getBirthWindow(breedingDate);
  const goHomeWindow = getGoHomeWindow(breedingDate);

  const damBreedSelect = form.watch('dam_breed_select');
  const damOtherBreed = form.watch('dam_other_breed');
  const sireBreedSelect = form.watch('sire_breed_select');
  const sireOtherBreed = form.watch('sire_other_breed');

  const resolvedDamBreed = damBreedSelect === OTHER_BREED_OPTION ? (damOtherBreed || '').trim() : damBreedSelect;
  const resolvedSireBreed = sireBreedSelect === OTHER_BREED_OPTION ? (sireOtherBreed || '').trim() : sireBreedSelect;

  useEffect(() => {
    const computed = getDueLabelFromBreedingDate(breedingDate);
    if (computed) form.setValue('due_label', computed);
  }, [breedingDate, form]);

  useEffect(() => {
    if (resolvedDamBreed || resolvedSireBreed) {
      const display = getDisplayBreedFromParentBreeds(resolvedDamBreed, resolvedSireBreed);
      if (display) form.setValue('display_breed', display);
    }
  }, [resolvedDamBreed, resolvedSireBreed, form]);

  useEffect(() => {
    if (row) {
      const mapDam = (b: string | null | undefined) => {
        if (!b?.trim()) return { select: '', other: '' };
        if (isMainBreed(b)) return { select: b.trim(), other: '' };
        return { select: OTHER_BREED_OPTION, other: b.trim() };
      };
      const mapSire = (b: string | null | undefined) => {
        if (!b?.trim()) return { select: '', other: '' };
        if (isMainBreed(b)) return { select: b.trim(), other: '' };
        return { select: OTHER_BREED_OPTION, other: b.trim() };
      };
      const dam = mapDam(row.dam_breed ?? row.breed);
      const sire = mapSire(row.sire_breed ?? row.breed);
      form.reset({
        dam_breed_select: dam.select,
        dam_other_breed: dam.other,
        sire_breed_select: sire.select,
        sire_other_breed: sire.other,
        display_breed: (row.display_breed ?? row.breed) ?? '',
        due_label: row.due_label ?? '',
        price_label: row.price_label ?? '',
        deposit_amount: row.deposit_amount ?? 0,
        description: row.description ?? '',
        placeholder_image_path: row.placeholder_image_path ?? '',
        deposit_link: row.deposit_link ?? '',
        cta_contact_link: row.cta_contact_link ?? '/contact',
        is_active: row.is_active ?? true,
        sort_order: row.sort_order ?? 0,
        dam_name: row.dam_name ?? '',
        sire_name: row.sire_name ?? '',
        dam_photo_path: row.dam_photo_path ?? '',
        sire_photo_path: row.sire_photo_path ?? '',
        example_puppy_image_paths: row.example_puppy_image_paths ?? [],
        breeding_date: row.breeding_date ?? '',
      });
    }
  }, [row, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const due_label = getDueLabelFromBreedingDate(data.breeding_date) || data.due_label || null;
      const dam_breed = data.dam_breed_select === OTHER_BREED_OPTION ? (data.dam_other_breed || '').trim() : data.dam_breed_select;
      const sire_breed = data.sire_breed_select === OTHER_BREED_OPTION ? (data.sire_other_breed || '').trim() : data.sire_breed_select;
      const display_breed = (data.display_breed || '').trim() || getDisplayBreedFromParentBreeds(dam_breed, sire_breed);
      const breed = display_breed;
      const { error } = await supabase.from('upcoming_litters').insert({
        breed,
        display_breed,
        dam_breed,
        sire_breed,
        due_label,
        price_label: data.price_label || null,
        deposit_amount: data.deposit_amount,
        description: data.description || null,
        placeholder_image_path: data.placeholder_image_path || null,
        deposit_link: data.deposit_link || null,
        cta_contact_link: data.cta_contact_link || '/contact',
        is_active: data.is_active,
        sort_order: data.sort_order,
        dam_name: data.dam_name || null,
        sire_name: data.sire_name || null,
        dam_photo_path: data.dam_photo_path || null,
        sire_photo_path: data.sire_photo_path || null,
        example_puppy_image_paths: data.example_puppy_image_paths?.length ? data.example_puppy_image_paths : null,
        breeding_date: data.breeding_date || null,
      });
      if (error) throw error;
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
      const due_label = getDueLabelFromBreedingDate(data.breeding_date) || data.due_label || null;
      const dam_breed = data.dam_breed_select === OTHER_BREED_OPTION ? (data.dam_other_breed || '').trim() : data.dam_breed_select;
      const sire_breed = data.sire_breed_select === OTHER_BREED_OPTION ? (data.sire_other_breed || '').trim() : data.sire_breed_select;
      const display_breed = (data.display_breed || '').trim() || getDisplayBreedFromParentBreeds(dam_breed, sire_breed);
      const breed = display_breed;
      const { error } = await supabase
        .from('upcoming_litters')
        .update({
          breed,
          display_breed,
          dam_breed,
          sire_breed,
          due_label,
          price_label: data.price_label || null,
          deposit_amount: data.deposit_amount,
          description: data.description || null,
          placeholder_image_path: data.placeholder_image_path || null,
          deposit_link: data.deposit_link || null,
          cta_contact_link: data.cta_contact_link || '/contact',
          is_active: data.is_active,
          sort_order: data.sort_order,
          dam_name: data.dam_name || null,
          sire_name: data.sire_name || null,
          dam_photo_path: data.dam_photo_path || null,
          sire_photo_path: data.sire_photo_path || null,
          example_puppy_image_paths: data.example_puppy_image_paths?.length ? data.example_puppy_image_paths : null,
          breeding_date: data.breeding_date || null,
        })
        .eq('id', id!);
      if (error) throw error;
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
                <p className="text-xs text-muted-foreground">Date the dogs tied or insemination occurred. Shown at top of public card; drives birth and go-home windows.</p>
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
          <FormField
            control={form.control}
            name="due_label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due label</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Auto-filled from breeding date, or e.g. Late March 2026" />
                </FormControl>
                <p className="text-xs text-muted-foreground">Optional; derived from breeding date when set.</p>
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
            <FormField
              control={form.control}
              name="dam_breed_select"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dam breed *</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      if (v !== OTHER_BREED_OPTION) form.setValue('dam_other_breed', '');
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
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                      <SelectItem value={OTHER_BREED_OPTION}>{OTHER_BREED_OPTION}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {damBreedSelect === OTHER_BREED_OPTION && (
              <FormField
                control={form.control}
                name="dam_other_breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dam other breed *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter breed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="dam_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dam (female parent) name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Name of female parent" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dam_photo_path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dam photo (optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={uploadingDam}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingDam(true);
                          try {
                            const { path } = await uploadPuppyPhoto(file);
                            field.onChange(path);
                            toast({ title: 'Dam photo uploaded' });
                          } catch (err) {
                            toast({ title: 'Upload failed', description: (err as Error).message, variant: 'destructive' });
                          } finally {
                            setUploadingDam(false);
                            e.target.value = '';
                          }
                        }}
                      />
                      {field.value && (
                        <div className="flex items-center gap-2">
                          <img
                            src={supabase.storage.from('puppy-photos').getPublicUrl(field.value).data.publicUrl}
                            alt="Dam"
                            className="h-20 w-20 rounded object-cover"
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange('')}>Remove</Button>
                        </div>
                      )}
                      {uploadingDam && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sire_breed_select"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sire breed *</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      if (v !== OTHER_BREED_OPTION) form.setValue('sire_other_breed', '');
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
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                      <SelectItem value={OTHER_BREED_OPTION}>{OTHER_BREED_OPTION}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {sireBreedSelect === OTHER_BREED_OPTION && (
              <FormField
                control={form.control}
                name="sire_other_breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sire other breed *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter breed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="sire_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sire (male parent) name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Name of male parent" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sire_photo_path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sire photo (optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={uploadingSire}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingSire(true);
                          try {
                            const { path } = await uploadPuppyPhoto(file);
                            field.onChange(path);
                            toast({ title: 'Sire photo uploaded' });
                          } catch (err) {
                            toast({ title: 'Upload failed', description: (err as Error).message, variant: 'destructive' });
                          } finally {
                            setUploadingSire(false);
                            e.target.value = '';
                          }
                        }}
                      />
                      {field.value && (
                        <div className="flex items-center gap-2">
                          <img
                            src={supabase.storage.from('puppy-photos').getPublicUrl(field.value).data.publicUrl}
                            alt="Sire"
                            className="h-20 w-20 rounded object-cover"
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange('')}>Remove</Button>
                        </div>
                      )}
                      {uploadingSire && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Example puppy images (up to 3)</h3>
            <p className="text-sm text-muted-foreground">Photos from previous litters to show what puppies from this pairing typically look like.</p>
            <FormField
              control={form.control}
              name="example_puppy_image_paths"
              render={({ field }) => {
                const paths = field.value ?? [];
                return (
                  <FormItem>
                    <FormControl>
                      <div className="space-y-2">
                        {paths.length < MAX_EXAMPLE_IMAGES && (
                          <Input
                            type="file"
                            accept="image/*"
                            disabled={uploadingExample}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingExample(true);
                              try {
                                const { path } = await uploadPuppyPhoto(file);
                                field.onChange([...paths, path].slice(0, MAX_EXAMPLE_IMAGES));
                                toast({ title: 'Example image uploaded' });
                              } catch (err) {
                                toast({ title: 'Upload failed', description: (err as Error).message, variant: 'destructive' });
                              } finally {
                                setUploadingExample(false);
                                e.target.value = '';
                              }
                            }}
                          />
                        )}
                        {uploadingExample && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
                        <div className="flex flex-wrap gap-2">
                          {paths.map((p, i) => (
                            <div key={p} className="relative">
                              <img
                                src={supabase.storage.from('puppy-photos').getPublicUrl(p).data.publicUrl}
                                alt={`Example ${i + 1}`}
                                className="h-20 w-20 rounded object-cover"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0"
                                onClick={() => field.onChange(paths.filter((_, j) => j !== i))}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

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
