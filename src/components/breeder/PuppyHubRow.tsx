// One row in the breeder Puppies hub.
//
// Shows a primary-photo thumbnail, name, parents/breed context, and the
// status badges that influence what the public site shows. Tapping the
// row routes to the capture flow so the breeder can edit photos, status,
// price, or notes.

import { useNavigate } from "react-router-dom";
import { PawPrint, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolvePuppyPhotosPublicUrl } from "@/lib/puppy-photos";
import type { BreederPuppyWithLitter } from "@/lib/breeder/api";

export function PuppyHubRow({ puppy }: { puppy: BreederPuppyWithLitter }) {
  const navigate = useNavigate();
  const heroUrl = resolvePuppyPhotosPublicUrl(
    puppy.primary_photo ?? puppy.photos?.[0] ?? null,
  );
  const parents = [puppy.dam_name, puppy.sire_name]
    .filter(Boolean)
    .join(" × ");
  const totalPhotos =
    (puppy.primary_photo ? 1 : 0) + (puppy.photos?.length ?? 0);
  // Puppies that aren't tied to an active upcoming_litter still open in the
  // capture flow; the ?from= param just controls where the wizard's back
  // button lands. Fall back to /breeder when missing.
  const captureHref = puppy.upcoming_litter_id
    ? `/breeder/puppies/${puppy.id}/capture?from=${puppy.upcoming_litter_id}`
    : `/breeder/puppies/${puppy.id}/capture`;

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => navigate(captureHref)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(captureHref);
        }
      }}
      className="flex cursor-pointer items-center gap-3 p-3 transition hover:bg-muted/40"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
        {heroUrl ? (
          <img
            src={heroUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <PawPrint
            className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground/50"
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{puppy.name}</span>
          <Badge variant="outline" className="text-[10px]">
            {puppy.gender === "Male" ? "Boy" : "Girl"}
          </Badge>
          {puppy.status && puppy.status !== "Available" && (
            <Badge variant="secondary" className="text-[10px]">
              {puppy.status}
            </Badge>
          )}
          {puppy.is_publicly_visible === false && (
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground"
            >
              Hidden
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {parents || puppy.breed}
          {parents && puppy.breed && ` · ${puppy.breed}`}
          {totalPhotos > 0
            ? ` · ${totalPhotos} photo${totalPhotos === 1 ? "" : "s"}`
            : " · No photos yet"}
          {puppy.base_price != null &&
            ` · $${Number(puppy.base_price).toLocaleString()}`}
        </p>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </li>
  );
}
