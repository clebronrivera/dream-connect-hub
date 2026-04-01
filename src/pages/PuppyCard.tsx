import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dog, Heart, Share2 } from 'lucide-react';
import { getDisplayAgeWeeks } from '@/lib/puppy-utils';
import { getPuppyImage, getDisplayPrice, getSizeCategory } from '@/lib/puppy-display-utils';
import type { Puppy } from '@/lib/supabase';

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
      className="overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
      onClick={onOpenDetail}
    >
      <div className="relative aspect-square overflow-hidden bg-muted cursor-pointer">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={puppy.name || 'Puppy'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dog className="h-24 w-24 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {puppy.discount_active &&
            puppy.discount_amount != null &&
            Number(puppy.discount_amount) > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs shrink-0">
                ${Number(puppy.discount_amount).toLocaleString()} OFF
              </Badge>
            )}
          <div className="flex gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isAvailable
                  ? 'bg-primary/90 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {status}
            </span>
            {sizeCat && (
              <Badge variant="secondary" className="capitalize text-xs">
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
            className="p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`h-5 w-5 transition-colors ${isFav ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
            aria-label="Share on Facebook or Instagram"
          >
            <Share2 className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>
      <CardHeader className="cursor-pointer" onClick={onOpenDetail}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{puppy.name || 'Unnamed'}</CardTitle>
        </div>
        <CardDescription>
          {puppy.breed || 'Unknown Breed'}
          {puppy.gender && ` • ${puppy.gender}`}
          {(() => {
            const w = getDisplayAgeWeeks(puppy);
            return w != null && ` • ${w} weeks`;
          })()}
        </CardDescription>
        {puppy.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{puppy.description}</p>
        )}
      </CardHeader>
      <CardContent onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          {price != null ? (
            <span className="flex flex-wrap items-baseline gap-2">
              {puppy.discount_active &&
              (puppy.base_price != null || puppy.discount_amount != null) ? (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    $
                    {Number(
                      puppy.base_price ?? price + Number(puppy.discount_amount ?? 0)
                    ).toLocaleString()}
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    ${Number(price).toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-foreground">
                  ${Number(price).toLocaleString()}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Price on request</span>
          )}
          <Button onClick={onSendInterest}>
            <Heart className="h-4 w-4 mr-2" />
            Send Interest
          </Button>
        </div>
        {puppy.discount_note && (
          <p className="text-xs text-primary mt-2">{puppy.discount_note}</p>
        )}
      </CardContent>
    </Card>
  );
}
