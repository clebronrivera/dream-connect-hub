import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarHeart, Heart, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { getDisplayAgeWeeks } from '@/lib/puppy-utils';
import {
  getDisplayPrice,
  getSizeCategory,
  isPoodleOrDoodle,
  isSmallBreed,
} from '@/lib/puppy-display-utils';
import {
  resolvePuppyPhotosPublicUrl,
  resolvePuppyVideoUrl,
} from '@/lib/puppy-photos';
import { PuppyMediaCollage } from '@/components/puppy/PuppyMediaCollage';
import type { Puppy } from '@/lib/supabase';

interface Props {
  puppy: Puppy | null;
  open: boolean;
  onClose: () => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  onShareClick: () => void;
  onSendInterest: (id?: string) => void;
}

export function PuppyDetailModal({
  puppy,
  open,
  onClose,
  favorites,
  onToggleFavorite,
  onShareClick,
  onSendInterest,
}: Props) {
  // Build the deduped, resolved photo list once per open. Falls back to the
  // primary photo when the photos array is empty so legacy puppies still
  // show their hero image.
  const resolvedPhotos = useMemo(() => {
    if (!puppy) return [] as string[];
    const all: (string | null | undefined)[] = [
      puppy.primary_photo,
      ...(puppy.photos ?? []),
    ];
    const resolved = all
      .map((p) => resolvePuppyPhotosPublicUrl(p))
      .filter((u): u is string => !!u);
    return Array.from(new Set(resolved));
  }, [puppy]);
  const resolvedVideo = useMemo(
    () => (puppy ? resolvePuppyVideoUrl(puppy.video_path) : null),
    [puppy],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {puppy && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl">{puppy.name || 'Unnamed'}</DialogTitle>
                  <DialogDescription>
                    {puppy.breed || 'Unknown Breed'}
                    {puppy.gender && ` • ${puppy.gender}`}
                    {puppy.color && ` • ${puppy.color}`}
                    {(() => {
                      const w = getDisplayAgeWeeks(puppy);
                      return w != null && ` • ${w} weeks`;
                    })()}
                  </DialogDescription>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onShareClick}
                    aria-label="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onToggleFavorite(String(puppy.id))}
                    aria-label={
                      favorites.has(String(puppy.id))
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                  >
                    <Heart
                      className={`h-4 w-4 ${favorites.has(String(puppy.id)) ? 'fill-primary text-primary' : ''}`}
                    />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <PuppyMediaCollage
                  photos={resolvedPhotos}
                  videoUrl={resolvedVideo}
                  alt={puppy.name || 'Puppy'}
                />
                <div className="absolute bottom-2 left-2 flex gap-2">
                  {getSizeCategory(puppy) && <Badge>{getSizeCategory(puppy)}</Badge>}
                  {isPoodleOrDoodle(puppy.breed || '') && (
                    <Badge variant="secondary">Poodle & Doodle</Badge>
                  )}
                  {isSmallBreed(puppy.breed || '') && (
                    <Badge variant="secondary">Small</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {(() => {
                  if (!puppy.ready_date) return null;
                  const d = new Date(puppy.ready_date);
                  if (Number.isNaN(d.getTime())) return null;
                  return (
                    <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                      <CalendarHeart className="h-4 w-4" aria-hidden />
                      Ready by{' '}
                      {d.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  );
                })()}
                {puppy.description && (
                  <p className="text-muted-foreground">{puppy.description}</p>
                )}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Health Certificate</span>
                    <span>Yes</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primaryDeep transition-all duration-700 ease-out"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vaccinations</span>
                    <span>First round included</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primaryDeep transition-all duration-700 ease-out"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Microchipped</span>
                    <span>{puppy.microchipped ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primaryDeep transition-all duration-700 ease-out"
                      style={{ width: puppy.microchipped ? '100%' : '0%' }}
                    />
                  </div>
                </div>
                <div className="pt-4">
                  {getDisplayPrice(puppy) != null ? (
                    <p className="mb-2 flex flex-wrap items-baseline gap-2">
                      {puppy.discount_active &&
                      (puppy.base_price != null || puppy.discount_amount != null) ? (
                        <>
                          <span className="text-sm text-muted-foreground line-through">
                            $
                            {Number(
                              puppy.base_price ??
                                Number(getDisplayPrice(puppy)) +
                                  Number(puppy.discount_amount ?? 0)
                            ).toLocaleString()}
                          </span>
                          <span className="text-2xl font-bold text-foreground">
                            ${Number(getDisplayPrice(puppy)).toLocaleString()}
                          </span>
                          {puppy.discount_amount != null &&
                            Number(puppy.discount_amount) > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                ${Number(puppy.discount_amount).toLocaleString()} OFF
                              </Badge>
                            )}
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-foreground">
                          ${Number(getDisplayPrice(puppy)).toLocaleString()}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-muted-foreground mb-2">Price on request</p>
                  )}
                  <Button className="w-full" onClick={() => onSendInterest(puppy.id)}>
                    <Heart className="h-4 w-4 mr-2" />
                    Send Interest
                  </Button>
                  <Button variant="outline" className="w-full mt-2" asChild>
                    <Link to="/contact">Contact Us</Link>
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
