import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase, type Litter } from '@/lib/supabase';
import { applyLitterDefaultsToLittermates } from '@/lib/litter-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { MAIN_BREEDS, normalizeBreedToCanonical } from '@/lib/breed-utils';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const litterSchema = z.object({
  breed: z.string().min(1, 'Breed is required'),
  listing_date: z.string().optional(),
  date_of_birth: z.string().optional(),
  ready_date: z.string().optional(),
  base_price: z.number().min(0).optional(),
  mom_weight_lbs: z.number().optional(),
  dad_weight_lbs: z.number().optional(),
  vaccinations: z.string().optional(),
  health_certificate_default: z.boolean().optional(),
  microchipped_default: z.boolean().optional(),
  status_default: z.string().optional(),
});

type LitterFormValues = z.infer<typeof litterSchema>;

export default function LitterForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: litter, isLoading } = useQuery({
    queryKey: ['litter', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('litters')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Litter;
    },
    enabled: !!id,
  });

  const form = useForm<LitterFormValues>({
    resolver: zodResolver(litterSchema),
    defaultValues: {
      status_default: 'Available',
      health_certificate_default: false,
      microchipped_default: false,
    },
  });

  useEffect(() => {
    if (litter) {
      form.reset({
        breed: litter.breed ?? '',
        listing_date: litter.listing_date ?? '',
        date_of_birth: litter.date_of_birth ?? '',
        ready_date: litter.ready_date ?? '',
        base_price: litter.base_price ?? 0,
        mom_weight_lbs: litter.mom_weight_lbs ?? undefined,
        dad_weight_lbs: litter.dad_weight_lbs ?? undefined,
        vaccinations: litter.vaccinations ?? '',
        health_certificate_default: litter.health_certificate_default ?? false,
        microchipped_default: litter.microchipped_default ?? false,
        status_default: litter.status_default ?? 'Available',
      });
    }
  }, [litter, form]);

  const mutation = useMutation({
    mutationFn: async (data: LitterFormValues) => {
      const { error } = await supabase
        .from('litters')
        .update({
          breed: data.breed,
          listing_date: data.listing_date || null,
          date_of_birth: data.date_of_birth || null,
          ready_date: data.ready_date || null,
          base_price: data.base_price ?? 0,
          mom_weight_lbs: data.mom_weight_lbs ?? null,
          dad_weight_lbs: data.dad_weight_lbs ?? null,
          vaccinations: data.vaccinations || null,
          health_certificate_default: data.health_certificate_default ?? false,
          microchipped_default: data.microchipped_default ?? false,
          status_default: data.status_default ?? 'Available',
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Litter updated', description: 'Defaults saved.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => applyLitterDefaultsToLittermates(id!),
    onSuccess: (count) => {
      toast({
        title: 'Defaults applied',
        description: `Updated ${count} littermate(s) with these defaults.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  if (id && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (id && !litter) {
    return (
      <div className="text-destructive">Litter not found.</div>
    );
  }

  const currentBreed = form.watch('breed');
  const canonicalBreed = normalizeBreedToCanonical(currentBreed || '');
  const isInMainList = MAIN_BREEDS.includes(canonicalBreed as (typeof MAIN_BREEDS)[number]);
  const breedOptions = currentBreed && !isInMainList ? [...MAIN_BREEDS, currentBreed] : [...MAIN_BREEDS];

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Edit Litter Defaults</h1>
      <p className="text-muted-foreground mb-6">
        These values are used when adding littermates. Use &quot;Apply to littermates&quot; to sync existing puppies in this litter.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="breed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Breed *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={(canonicalBreed || currentBreed) || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select breed" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {breedOptions.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input type="date" {...field} />
                  </FormControl>
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
              name="mom_weight_lbs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mom Weight (lbs)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dad_weight_lbs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dad Weight (lbs)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status_default"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Status</FormLabel>
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
          </div>

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

          <div className="flex flex-wrap gap-4">
            <FormField
              control={form.control}
              name="health_certificate_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Health certificate default</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="microchipped_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Microchipped default</FormLabel>
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-4 flex-wrap">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save defaults
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const values = form.getValues();
                await mutation.mutateAsync(values);
                await applyMutation.mutateAsync();
              }}
              disabled={mutation.isPending || applyMutation.isPending}
            >
              {(mutation.isPending || applyMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apply these defaults to littermates
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/admin/puppies')}>
              Back to puppies
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
