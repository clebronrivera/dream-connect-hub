import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const EVENT_CATEGORIES = [
  { value: 'seo', label: 'SEO' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'launch', label: 'Launch' },
  { value: 'other', label: 'Other' },
] as const;

export type BusinessEventCategory = (typeof EVENT_CATEGORIES)[number]['value'];

export interface BusinessEventRow {
  id: string;
  event_date: string;
  description: string;
  category: string | null;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BusinessModes() {
  const queryClient = useQueryClient();
  const [eventDate, setEventDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BusinessEventCategory | ''>('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['business-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_events')
        .select('id, event_date, description, category, created_at')
        .order('event_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BusinessEventRow[];
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (payload: {
      event_date: string;
      description: string;
      category: string | null;
    }) => {
      const { error } = await supabase.from('business_events').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events'] });
      setDescription('');
      setCategory('');
      setEventDate(todayISO());
      toast.success('Event added');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to add event'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events'] });
      toast.success('Event removed');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to remove event'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) {
      toast.error('Please enter a description');
      return;
    }
    insertMutation.mutate({
      event_date: eventDate,
      description: trimmed,
      category: category || null,
    });
  };

  const categoryLabel = (value: string | null) =>
    EVENT_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? '—';

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <BarChart2 className="h-8 w-8" />
        Business Modes
      </h1>
      <p className="text-muted-foreground mb-8">
        Log events (e.g. SEO launch, marketing campaigns) so you can look back and see how traffic or inquiries
        changed after each change.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Add event</CardTitle>
          <p className="text-sm text-muted-foreground">
            What happened? Add a short note and category to correlate with traffic later.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Date</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category || undefined} onValueChange={(v) => setCategory(v as BusinessEventCategory)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">What happened</Label>
              <Textarea
                id="description"
                placeholder="e.g. Implemented SEO on the website"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                required
              />
            </div>
            <Button type="submit" disabled={insertMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              Add event
            </Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Event timeline</h2>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground py-6">No events yet. Add one above to start tracking.</p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="w-[80px] p-3"></th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 whitespace-nowrap">{formatDate(ev.event_date)}</td>
                  <td className="p-3">
                    <span className="text-muted-foreground">{categoryLabel(ev.category)}</span>
                  </td>
                  <td className="p-3">{ev.description}</td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(ev.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
