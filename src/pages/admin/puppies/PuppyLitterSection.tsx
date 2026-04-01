import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, Users, UserPlus, Sparkles } from 'lucide-react';
import type { Puppy } from '@/lib/supabase';

interface Props {
  puppy: Puppy | undefined;
  createLitterPending: boolean;
  onCreateLitter: () => void;
  onAddLittermate: () => void;
  onGenerateLittermates: () => void;
}

export function PuppyLitterSection({
  puppy,
  createLitterPending,
  onCreateLitter,
  onAddLittermate,
  onGenerateLittermates,
}: Props) {
  return (
    <div className="mb-8 rounded-lg border border-border bg-muted/40 p-4 shadow-sm">
      <h2 className="text-base font-semibold mb-2">Litter</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Create a litter from this puppy, then add littermates so shared fields (breed, dates,
        price, etc.) are prefilled.
      </p>
      {!puppy ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : !puppy.litter_id ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onCreateLitter}
            disabled={createLitterPending}
          >
            {createLitterPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Create Litter From Puppy
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="default" size="sm" onClick={onAddLittermate}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Littermate
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onGenerateLittermates}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Littermates
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to={`/admin/litters/${puppy.litter_id}/edit`}>Edit Litter Defaults</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
