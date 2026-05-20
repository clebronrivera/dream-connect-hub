import * as React from 'react';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form';
import { Loader2, Camera } from 'lucide-react';
import { resolvePuppyPhotosPublicUrl } from '@/lib/puppy-photos';
import { BreederBadge } from './BreederBadge';

// Slot conventions mirror src/pages/breeder/BreederPuppyCapture.tsx (PHOTO_STEPS).
// Face is the primary/cover shot and stays in sync with puppies.primary_photo.
const SLOTS = [
  { key: 'face', label: 'Face photo', note: 'Used as the primary photo on the public site' },
  { key: 'back', label: 'Back shot', note: null },
  { key: 'top', label: 'Top-down', note: null },
  { key: 'paw', label: 'Paw print', note: null },
] as const;

interface Props {
  /** Stored photos array (dense, in face/back/top/paw order — same convention as breeder side). */
  photos: string[];
  /** puppies.primary_photo — used as the canonical face URL when present. */
  primaryPhotoUrl: string | undefined;
  /** Whether any upload is in flight (disables all slot inputs). */
  uploadingPhoto: boolean;
  /**
   * Called when the operator picks a file for slot N. Caller is responsible for
   * uploading, then updating both `photos` and (if slotIndex===0) `primary_photo`.
   */
  onSlotFileSelect: (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PuppyFormPhotoSection({
  photos,
  primaryPhotoUrl,
  uploadingPhoto,
  onSlotFileSelect,
}: Props) {
  // Map dense photos[] back to positional slots. Matches BreederPuppyCapture.tsx:259.
  const slotUrls: (string | undefined)[] = [
    primaryPhotoUrl?.trim() ? primaryPhotoUrl : photos[0],
    photos[1],
    photos[2],
    photos[3],
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <FormLabel className="text-base">
          Breeder Photos <BreederBadge />
        </FormLabel>
        {uploadingPhoto && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading…
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Yolanda uploads these from the breeder portal. You can also replace any slot here.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SLOTS.map((slot, idx) => {
          const stored = slotUrls[idx];
          const displayUrl = stored?.trim()
            ? (resolvePuppyPhotosPublicUrl(stored) ?? stored)
            : null;
          return (
            <div
              key={slot.key}
              className="flex flex-col gap-2 rounded-md border border-line bg-muted/20 p-3"
            >
              <div className="flex items-center gap-1 text-sm font-medium">
                {slot.label}
              </div>
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt={slot.label}
                  className="aspect-square w-full rounded object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded border-2 border-dashed border-line bg-background text-muted-foreground">
                  <Camera className="h-6 w-6" aria-hidden />
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => onSlotFileSelect(idx, e)}
                disabled={uploadingPhoto}
                className="text-xs"
                aria-label={`Upload ${slot.label}`}
              />
              {slot.note && (
                <p className="text-[11px] leading-tight text-muted-foreground">{slot.note}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
