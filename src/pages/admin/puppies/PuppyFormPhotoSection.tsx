import * as React from 'react';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

interface Props {
  primaryPhotoUrl: string | undefined;
  uploadingPhoto: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PuppyFormPhotoSection({ primaryPhotoUrl, uploadingPhoto, onFileSelect }: Props) {
  return (
    <div className="space-y-4">
      <FormLabel>Primary Photo</FormLabel>
      <Input
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        disabled={uploadingPhoto}
      />
      {primaryPhotoUrl && (
        <div className="mt-2">
          <img
            src={primaryPhotoUrl}
            alt="Primary photo"
            className="h-32 w-32 object-cover rounded"
          />
        </div>
      )}
      {uploadingPhoto && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </div>
      )}
    </div>
  );
}
