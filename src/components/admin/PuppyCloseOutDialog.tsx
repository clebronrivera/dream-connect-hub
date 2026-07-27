// Record what a puppy actually sold for, without opening the full edit form.
//
// Marking a puppy Sold is a one-tap job done in the moment; the money details
// usually aren't to hand right then. That gap is why every sold puppy in the
// database had an empty sale_price. So the two are deliberately decoupled:
// status changes instantly, and this dialog closes the books later — reachable
// either straight after marking Sold, or from the "Needs sale price" queue on
// the Dashboard.
//
// Scope is intentionally narrow. Only the fields needed to call the sale done,
// nothing else the edit form already covers.

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { Puppy } from '@/lib/supabase';
import { updatePuppy } from '@/lib/admin/puppies-service';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** `YYYY-MM-DD` for a date input, from a date or timestamp string. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export interface PuppyCloseOutDialogProps {
  puppy: Puppy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PuppyCloseOutDialog({ puppy, open, onOpenChange }: PuppyCloseOutDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listed = puppy?.final_price ?? puppy?.base_price ?? null;
  const [salePrice, setSalePrice] = useState<string>(
    puppy?.sale_price != null ? String(puppy.sale_price) : '',
  );
  const [dateSold, setDateSold] = useState<string>(toDateInput(puppy?.date_sold));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updatePuppy(puppy!.id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-puppies'] });
      // The close-out queue is derived from sale_price, so it must refetch.
      queryClient.invalidateQueries({ queryKey: ['admin-aging-actions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kpi-summary'] });
      toast({ title: `${puppy?.name} closed out` });
      onOpenChange(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!puppy) return null;

  function handleSave() {
    setError(null);
    const trimmed = salePrice.trim();
    if (trimmed === '') {
      setError('Enter what the puppy sold for.');
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 100000) {
      setError('Sale price must be a number between 0 and 100,000.');
      return;
    }

    const payload: Record<string, unknown> = { sale_price: n };
    // Only send date_sold if the operator actually set one — the DB trigger
    // already stamps it on the Available -> Sold transition, and blanking it
    // here would undo that.
    if (dateSold) payload.date_sold = dateSold;

    mutation.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close out {puppy.name}</DialogTitle>
          <DialogDescription>
            Record what this puppy actually sold for. This is the only thing
            still outstanding — status and go-home date are already saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="sale-price">Sold for (USD)</Label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                $
              </span>
              <Input
                id="sale-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="50"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="pl-7"
                placeholder={listed != null ? String(listed) : '2000'}
                autoFocus
              />
            </div>
            {listed != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Listed at ${listed}. Enter the actual amount if it differed.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="date-sold">Date sold</Label>
            <Input
              id="date-sold"
              type="date"
              value={dateSold}
              onChange={(e) => setDateSold(e.target.value)}
              className="mt-1"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Not now
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
