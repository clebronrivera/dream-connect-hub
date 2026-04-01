import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadPuppyPhoto } from '@/lib/puppy-photos';
import { createPuppyFromLitter } from '@/lib/litter-api';
import type { Puppy } from '@/lib/supabase';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  puppy: Puppy;
}

export function AddLittermateDialog({ open, onOpenChange, puppy }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [color, setColor] = useState('');
  const [name, setName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      let primaryPhoto: string | null = photoUrl;
      if (photoFile) {
        const { url } = await uploadPuppyPhoto(photoFile);
        primaryPhoto = url;
      }
      return createPuppyFromLitter(puppy.litter_id!, {
        gender,
        color: color || undefined,
        name: name || undefined,
        primaryPhoto: primaryPhoto ?? undefined,
      });
    },
    onSuccess: (newPuppyId) => {
      onOpenChange(false);
      setGender('Male');
      setColor('');
      setName('');
      setPhotoFile(null);
      setPhotoUrl(null);
      toast({ title: 'Littermate added', description: 'Redirecting to edit the new puppy.' });
      navigate(`/admin/puppies/${newPuppyId}/edit`);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Littermate</DialogTitle>
          <DialogDescription>
            New puppy will use this litter&apos;s shared fields. You only need to set gender;
            photo and color can be filled on the edit page.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Gender *</label>
            <Select value={gender} onValueChange={(v) => setGender(v as 'Male' | 'Female')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Color (optional)</label>
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Golden"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Name (optional)</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Leave blank for default"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Primary photo (optional)</label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPhotoFile(f ?? null);
                setPhotoUrl(null);
              }}
            />
            {(photoUrl || photoFile) && (
              <p className="text-xs text-muted-foreground">
                {photoFile ? photoFile.name : 'Uploaded'} — will upload on submit
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Add &amp; go to edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
