import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminPuppy,
  fetchPuppyNames,
  updatePuppy,
  createPuppy,
  upsertPuppyDeathExpense,
  fetchPuppyDeathExpense,
} from '@/lib/admin/puppies-service';
import { uploadPuppyPhoto } from '@/lib/puppy-photos';
import { createLitterFromPuppy } from '@/lib/litter-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getAgeWeeks, getReadyDateFromDob } from '@/lib/puppy-utils';
import { MAIN_BREEDS, OTHER_BREED_OPTION, PUPPY_GENDERS, GENDER_OTHER_OPTION } from '@/lib/breed-utils';
import { getSuggestedPuppyName } from '@/lib/puppy-name-generator';
import { generatePuppyDescription } from '@/lib/puppy-description-generator';
import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import * as React from 'react';
import { puppySchema, type PuppyFormValues } from './puppy-form-schema';
import { getPuppyFormDefaults, puppyToFormValues } from './puppy-form-defaults';
import { PuppyFormPhotoSection } from './PuppyFormPhotoSection';
import { BreederBadge } from './BreederBadge';
import { PuppyLitterSection } from './PuppyLitterSection';
import { AddLittermateDialog } from './AddLittermateDialog';
import { GenerateLittermatesDialog } from './GenerateLittermatesDialog';
import { ReservedForField } from './ReservedForField';

export default function PuppyForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addLittermateOpen, setAddLittermateOpen] = useState(false);
  const [generateLittermatesOpen, setGenerateLittermatesOpen] = useState(false);
  // Death-expense capture: shown only when "mark as deceased" is checked.
  // These live outside the puppy form schema because the cost is written to a
  // separate table (puppy_expenses), not a puppies column.
  const [deathHasCost, setDeathHasCost] = useState(false);
  const [deathCostAmount, setDeathCostAmount] = useState('');

  // Fetch existing puppy if editing
  const { data: puppy, isLoading } = useQuery({
    queryKey: ['puppy', id],
    queryFn: () => (id ? fetchAdminPuppy(id) : null),
    enabled: isEdit,
  });

  // Fetch existing puppy names for duplicate-aware suggestions (new puppy only)
  const { data: existingNames = [] } = useQuery({
    queryKey: ['puppy-names'],
    queryFn: fetchPuppyNames,
    enabled: !isEdit,
  });

  const form = useForm<PuppyFormValues>({
    resolver: zodResolver(puppySchema),
    defaultValues: getPuppyFormDefaults(),
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
    form.setValue('final_price', Math.max(0, base - amount));
  }, [basePrice, discountActive, discountAmount, form]);

  // Auto-fill name when gender is selected on new puppy and name is empty.
  // Only triggers for the canonical Male/Female values; custom gender text
  // intentionally skips the name suggester.
  const gender = form.watch('gender');
  useEffect(() => {
    if (isEdit || !gender) return;
    if (gender !== 'Male' && gender !== 'Female') return;
    const current = form.getValues('name');
    if (current != null && String(current).trim() !== '') return;
    form.setValue('name', getSuggestedPuppyName(gender, existingNames));
  }, [isEdit, gender, existingNames, form]);

  // Populate form when puppy data loads (edit mode)
  useEffect(() => {
    if (puppy) form.reset(puppyToFormValues(puppy));
  }, [puppy, form]);

  // Prefill the death-expense capture when editing an already-deceased puppy.
  useEffect(() => {
    if (!puppy?.id || !puppy.is_deceased) return;
    let cancelled = false;
    fetchPuppyDeathExpense(puppy.id)
      .then((cost) => {
        if (cancelled || cost == null) return;
        setDeathHasCost(cost > 0);
        setDeathCostAmount(cost > 0 ? String(cost) : '');
      })
      .catch(() => { /* non-fatal: operator can re-enter the amount */ });
    return () => { cancelled = true; };
  }, [puppy?.id, puppy?.is_deceased]);

  const mutation = useMutation({
    mutationFn: async (data: PuppyFormValues) => {
      const { breed_select, other_breed, ...rest } = data;
      const breed =
        breed_select === OTHER_BREED_OPTION ? (other_breed || '').trim() : breed_select;
      const payload = { ...rest, breed };
      if (!isEdit && !payload.listing_date) {
        payload.listing_date = new Date().toISOString().slice(0, 10);
      }
      if (payload.date_of_birth) {
        const ageWeeks = getAgeWeeks(payload.date_of_birth);
        if (ageWeeks != null && payload.age_weeks == null) payload.age_weeks = ageWeeks;
        const readyDate = getReadyDateFromDob(payload.date_of_birth);
        if (readyDate && (!payload.ready_date || !String(payload.ready_date).trim())) {
          payload.ready_date = readyDate;
        }
      }
      // Strip null/undefined optional numbers so Supabase doesn't receive null
      const optionalNumKeys = ['age_weeks', 'base_price', 'discount_amount', 'final_price', 'mom_weight_approx', 'dad_weight_approx', 'display_order'] as const;
      optionalNumKeys.forEach((k) => { if (payload[k] == null) delete payload[k]; });
      // Empty string is invalid for date columns
      const dateKeys = ['listing_date', 'date_of_birth', 'ready_date'] as const;
      dateKeys.forEach((k) => {
        const v = payload[k];
        if (v === '' || (typeof v === 'string' && !v.trim())) (payload as Record<string, unknown>)[k] = null;
      });
      // puppy_id is UNIQUE; empty string would duplicate — use null
      const pid = payload.puppy_id;
      if (pid === '' || (typeof pid === 'string' && !pid.trim())) {
        (payload as Record<string, unknown>).puppy_id = null;
      }
      // Clamp final price and force standard health inclusions
      const base = payload.base_price != null ? Number(payload.base_price) : 0;
      const discount = payload.discount_active && payload.discount_amount != null ? Number(payload.discount_amount) : 0;
      payload.final_price = Math.max(0, base - discount);
      payload.health_certificate = true;
      payload.vaccinations = payload.vaccinations || 'First round included';
      payload.microchipped = true;
      if (payload.is_deceased) {
        // A deceased puppy is hidden from the public site and its status is
        // forced to 'Deceased' so it drops out of all income/inventory metrics.
        payload.is_publicly_visible = false;
        payload.status = 'Deceased';
      } else if (payload.is_publicly_visible == null) {
        payload.is_publicly_visible = payload.status === 'Available';
      }

      const saved =
        isEdit && id
          ? await updatePuppy(id, payload as Record<string, unknown>)
          : await createPuppy(payload as Record<string, unknown>);

      // Record / correct / clear the death-related business expense. It lives in
      // puppy_expenses (category='death'), not on the puppy row.
      const savedId = saved.id ?? (isEdit ? id : undefined);
      if (savedId) {
        if (payload.is_deceased) {
          const cost = deathHasCost ? Number(deathCostAmount) || 0 : 0;
          await upsertPuppyDeathExpense(savedId, cost);
        } else if (puppy?.is_deceased) {
          // Puppy un-marked as deceased — drop any prior death expense.
          await upsertPuppyDeathExpense(savedId, 0);
        }
      }

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puppies'] });
      toast({ title: `Puppy ${isEdit ? 'updated' : 'created'} successfully`, description: `The puppy has been ${isEdit ? 'updated' : 'added'} to the database.` });
      navigate('/admin/puppies');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || `Failed to ${isEdit ? 'update' : 'create'} puppy.`, variant: 'destructive' });
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

  // Upload into one of the four breeder-aligned slots (0=face, 1=back, 2=top, 3=paw).
  // Mirrors the breeder side (BreederPuppyCapture.tsx:338-349): the stored `photos`
  // array is dense (filters out empty slots), and slot 0 also writes primary_photo.
  const handleSlotPhotoUpload = async (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { url } = await uploadPuppyPhoto(file);

      // Reconstruct positional 4-slot view from current dense photos + primary_photo.
      const currentPhotos = form.getValues('photos') ?? [];
      const currentPrimary = form.getValues('primary_photo');
      const slotView: (string | undefined)[] = [
        typeof currentPrimary === 'string' && currentPrimary.trim() ? currentPrimary : currentPhotos[0],
        currentPhotos[1],
        currentPhotos[2],
        currentPhotos[3],
      ];

      // Update the chosen slot, then collapse back to a dense array for storage.
      slotView[slotIndex] = url;
      const denseNext = slotView.filter((u): u is string => typeof u === 'string' && u.length > 0);

      form.setValue('photos', denseNext, { shouldDirty: true });
      if (slotIndex === 0) {
        form.setValue('primary_photo', url, { shouldDirty: true });
      }

      toast({ title: 'Photo uploaded', description: 'The photo has been uploaded successfully.' });
    } catch (error: unknown) {
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Failed to upload photo.', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
      // Reset the input so re-selecting the same file refires onChange.
      e.target.value = '';
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryDeep" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">{isEdit ? 'Edit Puppy' : 'Add New Puppy'}</h1>

      {isEdit && (
        <PuppyLitterSection
          puppy={puppy ?? undefined}
          createLitterPending={createLitterMutation.isPending}
          onCreateLitter={() => createLitterMutation.mutate()}
          onAddLittermate={() => setAddLittermateOpen(true)}
          onGenerateLittermates={() => setGenerateLittermatesOpen(true)}
        />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Name * <BreederBadge /></FormLabel>
                    {!isEdit && (
                      gender === 'Male' || gender === 'Female' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentName = form.getValues('name');
                            const exclude = [...existingNames];
                            if (currentName?.trim()) exclude.push(currentName.trim());
                            form.setValue('name', getSuggestedPuppyName(gender, exclude));
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
                  <FormControl><Input {...field} placeholder="e.g., PH001" /></FormControl>
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
                      <SelectTrigger><SelectValue placeholder="Select breed" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MAIN_BREEDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
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
                    <FormControl><Input {...field} placeholder="Enter breed name" /></FormControl>
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
                  <FormControl><Input type="date" {...field} placeholder="Date added to website" /></FormControl>
                  <p className="text-xs text-muted-foreground">Day this puppy was added to the website</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => {
                const value = field.value ?? '';
                const isOther =
                  value !== '' && value !== 'Male' && value !== 'Female';
                const selectValue = isOther
                  ? GENDER_OTHER_OPTION
                  : value || undefined;
                return (
                  <FormItem>
                    <FormLabel>Gender <BreederBadge /></FormLabel>
                    <Select
                      value={selectValue}
                      onValueChange={(v) => {
                        if (v === GENDER_OTHER_OPTION) {
                          // Clear so the user can type the custom value.
                          field.onChange('');
                        } else {
                          field.onChange(v);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PUPPY_GENDERS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                        <SelectItem value={GENDER_OTHER_OPTION}>
                          {GENDER_OTHER_OPTION}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectValue === GENDER_OTHER_OPTION && (
                      <Input
                        placeholder="Custom gender"
                        value={value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="mt-2"
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color <BreederBadge /></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status <BreederBadge /></FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Keep the deceased flag in lockstep with the status.
                      if (value === 'Deceased') {
                        form.setValue('is_deceased', true);
                        form.setValue('is_publicly_visible', false);
                      } else if (form.getValues('is_deceased')) {
                        form.setValue('is_deceased', false);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Sold">Sold</SelectItem>
                      <SelectItem value="Reserved">Reserved</SelectItem>
                      <SelectItem value="Deceased">Deceased</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reserved_for_customer_id"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Reserved for</FormLabel>
                  <ReservedForField
                    value={(field.value as string | null) ?? null}
                    onChange={(next) => field.onChange(next)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Attach a customer to this puppy so their inquiry history
                    and the eventual deposit agreement track together.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_publicly_visible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Show on public site <BreederBadge /></FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_deceased"
              render={({ field }) => (
                <FormItem className="md:col-span-2 space-y-3">
                  <div className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          field.onChange(isChecked);
                          if (isChecked) {
                            // Mark deceased → force status + hide from public.
                            form.setValue('status', 'Deceased');
                            form.setValue('is_publicly_visible', false);
                          } else {
                            // Un-mark → reset the death-expense capture and
                            // return the puppy to Available.
                            setDeathHasCost(false);
                            setDeathCostAmount('');
                            if (form.getValues('status') === 'Deceased') {
                              form.setValue('status', 'Available');
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mark as deceased (kept for accounting)</FormLabel>
                    </div>
                  </div>

                  {field.value && (
                    <div className="ml-7 rounded-md border border-line bg-muted/40 p-4 space-y-3">
                      <p className="text-sm font-medium">Was there an expense due to this?</p>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="death-has-cost"
                            checked={!deathHasCost}
                            onChange={() => { setDeathHasCost(false); setDeathCostAmount(''); }}
                          />
                          No
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="death-has-cost"
                            checked={deathHasCost}
                            onChange={() => setDeathHasCost(true)}
                          />
                          Yes
                        </label>
                      </div>
                      {deathHasCost && (
                        <div className="space-y-1">
                          <label className="text-sm text-muted-foreground" htmlFor="death-cost-amount">
                            Approximate cost (USD)
                          </label>
                          <div className="relative max-w-[12rem]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              id="death-cost-amount"
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              className="pl-7"
                              placeholder="0.00"
                              value={deathCostAmount}
                              onChange={(e) => setDeathCostAmount(e.target.value)}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Recorded as a business expense. This puppy is removed
                            from income and inventory totals on the dashboard.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth <BreederBadge /></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="age_weeks"
              render={({ field }) => {
                const dobVal = form.watch('date_of_birth');
                const computedWeeks = getAgeWeeks(dobVal);
                const hasDob = !!dobVal && computedWeeks != null;
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
                  <FormLabel>Ready Date <BreederBadge /></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
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
                  <FormLabel>Base Price <BreederBadge /></FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
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
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none"><FormLabel>Discount Active</FormLabel></div>
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
                    <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
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
                    <Input type="number" {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
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
                    <Input type="number" {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                  </FormControl>
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
                    <Input type="number" {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)} />
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
              const breed = breedSelect === OTHER_BREED_OPTION ? (form.watch('other_breed') || '').trim() : breedSelect;
              const name = form.watch('name')?.trim();
              const genderRaw = form.watch('gender');
              // Description generator only knows Male/Female pronouns; pass
              // undefined for custom values so it falls back to they/them.
              const genderVal: 'Male' | 'Female' | undefined =
                genderRaw === 'Male' || genderRaw === 'Female' ? genderRaw : undefined;
              const canGenerate = !!name && !!breed && !!genderRaw;
              const handleGenerate = () => {
                if (!canGenerate) return;
                const text = generatePuppyDescription(
                  { name: name || 'This puppy', breed, gender: genderVal, color: form.watch('color') || undefined, date_of_birth: form.watch('date_of_birth') || undefined, age_weeks: form.watch('age_weeks') ?? undefined },
                  { sentenceCount: 5 }
                );
                form.setValue('description', text);
                toast({ title: 'Description generated', description: 'You can edit the text before saving.' });
              };
              return (
                <FormItem>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FormLabel>Description <BreederBadge /></FormLabel>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={!canGenerate}>
                        <Sparkles className="h-4 w-4 mr-1" />Generate description
                      </Button>
                      {field.value && (
                        <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={!canGenerate}>
                          <RefreshCw className="h-4 w-4 mr-1" />Regenerate
                        </Button>
                      )}
                    </div>
                  </div>
                  {!canGenerate && <p className="text-xs text-muted-foreground">Set Name, Breed, and Gender to enable Generate / Regenerate.</p>}
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
                <FormControl><Textarea {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <PuppyFormPhotoSection
            photos={form.watch('photos') ?? []}
            primaryPhotoUrl={form.watch('primary_photo')}
            uploadingPhoto={uploadingPhoto}
            onSlotFileSelect={handleSlotPhotoUpload}
          />

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

      {isEdit && puppy && (
        <>
          <AddLittermateDialog
            open={addLittermateOpen}
            onOpenChange={setAddLittermateOpen}
            puppy={puppy}
          />
          {puppy.litter_id && (
            <GenerateLittermatesDialog
              open={generateLittermatesOpen}
              onOpenChange={setGenerateLittermatesOpen}
              litterId={puppy.litter_id}
            />
          )}
        </>
      )}
    </div>
  );
}
