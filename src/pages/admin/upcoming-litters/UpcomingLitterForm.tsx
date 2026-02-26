import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase, type UpcomingLitter } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  breed: z.string().min(1, 'Breed is required'),
  due_label: z.string().min(1, 'Due label is required'),
  price_label: z.string().optional(),
  deposit_amount: z.number().min(0),
  description: z.string().optional(),
  placeholder_image_path: z.string().optional(),
  deposit_link: z.string().optional(),
  cta_contact_link: z.string().optional(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      breed: '',
      due_label: '',
      price_label: '',
      deposit_amount: 0,
      description: '',
      placeholder_image_path: '',
      deposit_link: '',
      cta_contact_link: '/contact',
      is_active: true,
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (row) {
      form.reset({
        breed: row.breed ?? '',
        due_label: row.due_label ?? '',
        price_label: row.price_label ?? '',
        deposit_amount: row.deposit_amount ?? 0,
        description: row.description ?? '',
        placeholder_image_path: row.placeholder_image_path ?? '',
        deposit_link: row.deposit_link ?? '',
        cta_contact_link: row.cta_contact_link ?? '/contact',
        is_active: row.is_active ?? true,
        sort_order: row.sort_order ?? 0,
      });
    }
  }, [row, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const { error } = await supabase.from('upcoming_litters').insert({
        breed: data.breed,
        due_label: data.due_label,
        price_label: data.price_label || null,
        deposit_amount: data.deposit_amount,
        description: data.description || null,
        placeholder_image_path: data.placeholder_image_path || null,
        deposit_link: data.deposit_link || null,
        cta_contact_link: data.cta_contact_link || '/contact',
        is_active: data.is_active,
        sort_order: data.sort_order,
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
      const { error } = await supabase
        .from('upcoming_litters')
        .update({
          breed: data.breed,
          due_label: data.due_label,
          price_label: data.price_label || null,
          deposit_amount: data.deposit_amount,
          description: data.description || null,
          placeholder_image_path: data.placeholder_image_path || null,
          deposit_link: data.deposit_link || null,
          cta_contact_link: data.cta_contact_link || '/contact',
          is_active: data.is_active,
          sort_order: data.sort_order,
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
            name="breed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Breed *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Shih Tzu" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="due_label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due label *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Late March 2026, Mid April 2026" />
                </FormControl>
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
                <FormLabel>Active (show on public page)</FormLabel>
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
