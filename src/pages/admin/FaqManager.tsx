import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Seo } from '@/components/seo/Seo';
import { fetchAllFaqItems } from '@/lib/admin/faq-service';
import {
  createFaqItem,
  updateFaqItem,
  deleteFaqItem,
  toggleFaqActive,
} from '@/lib/admin/faq-service';
import type { FaqItem } from '@/lib/faq-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const FAQ_SECTIONS = [
  { key: 'deposits', label: 'Deposits' },
  { key: 'process', label: 'The Process' },
  { key: 'pickup', label: 'Pickup & Timing' },
  { key: 'food_care', label: 'Food & Care' },
  { key: 'health', label: 'Health & Vets' },
  { key: 'first_days', label: 'First Days Home' },
] as const;

type FormState = {
  section_key: string;
  section_label: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
};

const emptyForm: FormState = {
  section_key: 'deposits',
  section_label: 'Deposits',
  question: '',
  answer: '',
  display_order: 0,
  is_active: true,
};

export default function FaqManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-faq-items'],
    queryFn: fetchAllFaqItems,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-faq-items'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await updateFaqItem(editingId, form);
      } else {
        await createFaqItem(form);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'FAQ item updated' : 'FAQ item created');
      invalidate();
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaqItem,
    onSuccess: () => {
      toast.success('FAQ item deleted');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleFaqActive(id, active),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: FaqItem) {
    setEditingId(item.id);
    setForm({
      section_key: item.section_key,
      section_label: item.section_label,
      question: item.question,
      answer: item.answer,
      display_order: item.display_order,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  const filtered = items.filter((item) => {
    if (filter === 'active') return item.is_active;
    if (filter === 'inactive') return !item.is_active;
    return true;
  });

  // Group by section for display
  const grouped = FAQ_SECTIONS.map((s) => ({
    ...s,
    items: filtered.filter((item) => item.section_key === s.key),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <Seo pageId="admin" canonicalPath="/admin/faq" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">FAQ Manager</h1>
            <p className="text-sm text-muted-foreground">{items.length} items total</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                  className="capitalize"
                >
                  {f}
                </Button>
              ))}
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : grouped.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">No FAQ items found.</p>
        ) : (
          <div className="space-y-8">
            {grouped.map((section) => (
              <div key={section.key}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {section.label}
                  <Badge variant="secondary">{section.items.length}</Badge>
                </h2>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 rounded-lg border p-4 ${
                        !item.is_active ? 'opacity-50 bg-muted/30' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.question}</p>
                        <p className="text-sm text-muted-foreground truncate">{item.answer}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: item.id, active: checked })
                          }
                        />
                        <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Delete this FAQ item?')) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit FAQ Item' : 'Add FAQ Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Section</label>
              <Select
                value={form.section_key}
                onValueChange={(val) => {
                  const match = FAQ_SECTIONS.find((s) => s.key === val);
                  setForm((f) => ({
                    ...f,
                    section_key: val,
                    section_label: match?.label ?? val,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAQ_SECTIONS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Question</label>
              <Input
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                placeholder="e.g. Are deposits refundable?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Answer</label>
              <Textarea
                value={form.answer}
                onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                placeholder="Supports markdown formatting..."
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Display Order</label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="text-sm font-medium">Active</label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.question.trim() || !form.answer.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
