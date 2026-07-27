// Inline status + public-visibility controls for one row of the admin puppies
// table.
//
// Why inline rather than "open the edit form": taking a puppy off the site is
// the single most time-critical thing the operator does — a puppy sells and it
// needs to stop showing as available immediately. Routing that through a full
// form page made a two-second job into a page load, a scroll, a save, and a
// trip back to the list.
//
// The two controls are not independent, and the database is what makes them so:
// `puppies_enforce_visibility` (a BEFORE trigger) forces is_publicly_visible to
// false whenever status is anything other than Available, or the puppy is
// deceased. So choosing "Sold" here also pulls the puppy off the site, in one
// write, with no second step to forget. The UI mirrors that rule rather than
// fighting it: the eye toggle is disabled unless the puppy is Available, with
// the reason in its tooltip.

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import type { Puppy } from '@/lib/supabase';
import { updatePuppy } from '@/lib/admin/puppies-service';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** The statuses the operator can set from the table. `Deceased` is deliberately
 *  not here — it has its own flow with an expense record attached. */
export const PUPPY_STATUSES = ['Available', 'Pending', 'Reserved', 'Sold'] as const;
export type PuppyStatus = (typeof PUPPY_STATUSES)[number];

function isAvailable(status: string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === 'available';
}

export interface PuppyStatusCellProps {
  puppy: Puppy;
  /** Fired after a status change lands, so the caller can offer close-out. */
  onSoldRecorded?: (puppy: Puppy) => void;
}

export function PuppyStatusCell({ puppy, onSoldRecorded }: PuppyStatusCellProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Mirror the row so the control reflects the change instantly; on failure we
  // snap back to what the database actually holds.
  const [status, setStatus] = useState<string>(puppy.status ?? 'Available');
  const [visible, setVisible] = useState<boolean>(!!puppy.is_publicly_visible);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updatePuppy(puppy.id!, payload),
    onSuccess: (saved) => {
      // Trust the saved row over local intent: the enforce-visibility trigger
      // may have overridden is_publicly_visible on the way in.
      setStatus(saved.status ?? 'Available');
      setVisible(!!saved.is_publicly_visible);
      queryClient.invalidateQueries({ queryKey: ['admin-puppies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-aging-actions'] });
    },
    onError: (error: Error) => {
      setStatus(puppy.status ?? 'Available');
      setVisible(!!puppy.is_publicly_visible);
      toast({
        title: 'Could not save',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  function handleStatusChange(next: string) {
    const prev = status;
    if (next === prev) return;
    setStatus(next);
    // The trigger will clear visibility for any non-Available status; reflect
    // that immediately so the row doesn't briefly lie.
    if (!isAvailable(next)) setVisible(false);

    mutation.mutate(
      { status: next },
      {
        onSuccess: (saved) => {
          const wentOffSite = !!puppy.is_publicly_visible && !saved.is_publicly_visible;
          toast({
            title: `${puppy.name} — ${next}`,
            description: wentOffSite
              ? 'Removed from the public site.'
              : undefined,
          });
          if (next === 'Sold') onSoldRecorded?.(saved);
        },
      },
    );
  }

  function handleVisibilityToggle() {
    const next = !visible;
    setVisible(next);
    mutation.mutate(
      { is_publicly_visible: next },
      {
        onSuccess: (saved) => {
          toast({
            title: saved.is_publicly_visible
              ? `${puppy.name} is on the site`
              : `${puppy.name} is hidden`,
          });
        },
      },
    );
  }

  const canBeVisible = isAvailable(status) && !puppy.is_deceased;
  const busy = mutation.isPending;

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={handleStatusChange} disabled={busy}>
        <SelectTrigger
          className="h-8 w-[112px] text-xs"
          aria-label={`Status for ${puppy.name}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PUPPY_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {s}
            </SelectItem>
          ))}
          {/* Preserve an out-of-band status (e.g. Deceased) so opening the
              dropdown can't silently rewrite it to something else. */}
          {!PUPPY_STATUSES.includes(status as PuppyStatus) && (
            <SelectItem value={status} className="text-xs">
              {status}
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* span wrapper: a disabled button doesn't emit the events the
                tooltip needs, and the disabled reason is the whole point. */}
            <span>
              <button
                type="button"
                onClick={handleVisibilityToggle}
                disabled={busy || !canBeVisible}
                aria-label={
                  visible ? `Hide ${puppy.name} from the site` : `Show ${puppy.name} on the site`
                }
                aria-pressed={visible}
                className={`flex h-8 w-8 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  visible
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-muted-foreground/20 bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : visible ? (
                  <Eye className="h-4 w-4" aria-hidden />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden />
                )}
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">
            {canBeVisible
              ? visible
                ? 'Showing on the public site — click to hide'
                : 'Hidden — click to show on the public site'
              : puppy.is_deceased
                ? 'Deceased puppies are always hidden'
                : `Only Available puppies can show on the site (this one is ${status})`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
