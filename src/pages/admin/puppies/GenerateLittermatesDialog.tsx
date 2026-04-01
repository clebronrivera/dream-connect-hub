import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bulkCreatePuppiesFromLitter } from '@/lib/litter-api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  litterId: string;
}

export function GenerateLittermatesDialog({ open, onOpenChange, litterId }: Props) {
  const { toast } = useToast();
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [baseName, setBaseName] = useState('Littermate');
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      bulkCreatePuppiesFromLitter({
        litterId,
        counts: { male: maleCount, female: femaleCount },
        baseName: baseName || undefined,
      }),
    onSuccess: (ids) => {
      setCreatedIds(ids);
      if (ids.length > 0) {
        setMaleCount(0);
        setFemaleCount(0);
        setBaseName('Littermate');
        toast({ title: 'Littermates created', description: `${ids.length} puppy(ies) added.` });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) setCreatedIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Littermates</DialogTitle>
          <DialogDescription>
            Create multiple puppies from this litter. Names will be &quot;
            {baseName || 'Littermate'} 1&quot;, &quot;2&quot;, etc. You can add photos and colors
            on each puppy&apos;s edit page.
          </DialogDescription>
        </DialogHeader>
        {createdIds.length > 0 ? (
          <div className="py-4 space-y-2">
            <p className="text-sm font-medium">
              Created {createdIds.length} puppy(ies). Open to add photo and color:
            </p>
            <ul className="list-disc list-inside space-y-1">
              {createdIds.map((pid) => (
                <li key={pid}>
                  <Link to={`/admin/puppies/${pid}/edit`} className="text-primary underline">
                    Edit puppy
                  </Link>
                </li>
              ))}
            </ul>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Male count</label>
                <Input
                  type="number"
                  min={0}
                  value={maleCount}
                  onChange={(e) => setMaleCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Female count</label>
                <Input
                  type="number"
                  min={0}
                  value={femaleCount}
                  onChange={(e) => setFemaleCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Base name (optional)</label>
                <Input
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  placeholder="Littermate"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || maleCount + femaleCount <= 0}
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create {maleCount + femaleCount} puppy(ies)
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
