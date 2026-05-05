import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Share2 } from 'lucide-react';
import { getDisplayAgeWeeks } from '@/lib/puppy-utils';
import { getPuppyImage, getDisplayPrice, getSizeCategory } from '@/lib/puppy-display-utils';
import type { Puppy } from '@/lib/supabase';
import { PuppyPlaceholderSvg, StickerButton } from '@/components/redesign/PublicDesignPrimitives';

interface Props {
  puppy: Puppy;
  index: number;
  isFav: boolean;
  onToggleFavorite: () => void;
  onOpenDetail: () => void;
  onShare: () => void;
  onSendInterest: () => void;
}

export function PuppyCard({
  puppy,
  index,
  isFav,
  onToggleFavorite,
  onOpenDetail,
  onShare,
  onSendInterest,
}: Props) {
  const imageUrl = getPuppyImage(puppy);
  const price = getDisplayPrice(puppy);
  const status = puppy.status || 'Unknown';
  const isAvailable = status === 'Available';
  const sizeCat = getSizeCategory(puppy);

  return (
    <Card
      className="group animate-in overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-300 fade-in slide-in-from-bottom-4 hover:-translate-y-1 hover:border-[#ff3399]/40 hover:shadow-xl"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
      onClick={onOpenDetail}
    >
      <div className="relative aspect-square cursor-pointer overflow-hidden bg-white/5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={puppy.name || 'Puppy'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3">
            <PuppyPlaceholderSvg className="h-full w-full rounded-md" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {puppy.discount_active &&
            puppy.discount_amount != null &&
            Number(puppy.discount_amount) > 0 && (
              <Badge className="shrink-0 bg-[#ff3399] text-xs text-white">
                ${Number(puppy.discount_amount).toLocaleString()} OFF
              </Badge>
            )}
          <div className="flex gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isAvailable ? 'border border-emerald-300/30 bg-emerald-500/80 text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {status}
            </span>
            {sizeCat && (
              <Badge variant="secondary" className="bg-white/15 text-xs capitalize text-white">
                {sizeCat}
              </Badge>
            )}
          </div>
        </div>
        <div className="absolute top-2 left-2 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="rounded-full bg-black/45 p-2 transition-colors hover:bg-black/60"
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`h-5 w-5 transition-colors ${isFav ? 'fill-[#ff3399] text-[#ff3399]' : 'text-white/75'}`}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="rounded-full bg-black/45 p-2 transition-colors hover:bg-black/60"
            aria-label="Share on Facebook or Instagram"
          >
            <Share2 className="h-5 w-5 text-white/75" />
          </button>
        </div>
      </div>
      <CardHeader className="cursor-pointer" onClick={onOpenDetail}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-white">{puppy.name || 'Unnamed'}</CardTitle>
        </div>
        <CardDescription className="text-white/70">
          {puppy.breed || 'Unknown Breed'}
          {puppy.gender && ` • ${puppy.gender}`}
          {(() => {
            const w = getDisplayAgeWeeks(puppy);
            return w != null && ` • ${w} weeks`;
          })()}
        </CardDescription>
        {puppy.description && (
          <p className="mt-2 line-clamp-2 text-sm text-white/65">{puppy.description}</p>
        )}
      </CardHeader>
      <CardContent onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          {price != null ? (
            <span className="flex flex-wrap items-baseline gap-2">
              {puppy.discount_active &&
              (puppy.base_price != null || puppy.discount_amount != null) ? (
                <>
                  <span className="text-sm text-white/50 line-through">
                    $
                    {Number(
                      puppy.base_price ?? price + Number(puppy.discount_amount ?? 0)
                    ).toLocaleString()}
                  </span>
                  <span className="text-2xl font-bold text-white">
                    ${Number(price).toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-white">
                  ${Number(price).toLocaleString()}
                </span>
              )}
            </span>
          ) : (
            <span className="text-white/70">Price on request</span>
          )}
          <StickerButton onClick={onSendInterest}>
            <Heart className="h-4 w-4 mr-2" />
            Send Interest
          </StickerButton>
        </div>
        {puppy.discount_note && (
          <p className="text-xs text-primary mt-2">{puppy.discount_note}</p>
        )}
      </CardContent>
    </Card>
  );
}
