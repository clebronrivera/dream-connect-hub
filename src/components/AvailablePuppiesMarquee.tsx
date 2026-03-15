import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAvailablePuppies } from "@/lib/puppies-api";
import type { Puppy } from "@/lib/supabase";
import { Dog, Loader2 } from "lucide-react";

function getPuppyImage(puppy: Puppy): string | null {
  if (puppy.primary_photo) return puppy.primary_photo;
  if (puppy.photos?.length) return puppy.photos[0];
  return null;
}

function PuppyCard({ puppy }: { puppy: Puppy }) {
  const imgUrl = getPuppyImage(puppy);
  const id = puppy.id ?? puppy.puppy_id;
  const to = id ? `/puppies/${id}` : "/puppies";

  return (
    <Link
      to={to}
      className="flex shrink-0 w-[180px] sm:w-[200px] flex-col items-center gap-2 rounded-xl border bg-card p-3 shadow-sm transition hover:shadow-md hover:border-primary/40"
    >
      <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full bg-muted">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={puppy.name || "Puppy"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Dog className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="w-full min-w-0 text-center">
        <p className="truncate text-sm font-medium text-foreground">
          {puppy.name || "Puppy"}
        </p>
        <p className="truncate text-xs text-muted-foreground">{puppy.breed}</p>
      </div>
    </Link>
  );
}

export function AvailablePuppiesMarquee() {
  const { data: puppies = [], isLoading, isError } = useQuery({
    queryKey: ["puppies"],
    queryFn: fetchAvailablePuppies,
    retry: 1,
  });

  if (isLoading) {
    return (
      <section className="border-y bg-muted/30 py-6">
        <div className="container flex justify-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (isError || !puppies.length) {
    return null;
  }

  // Duplicate list for seamless infinite scroll
  const items = [...puppies, ...puppies];

  return (
    <section className="border-y bg-muted/30 py-6 overflow-hidden" aria-label="Available puppies">
      <div className="flex gap-4 animate-marquee w-max">
        {items.map((puppy, index) => (
          <PuppyCard key={`${puppy.id ?? puppy.puppy_id}-${index}`} puppy={puppy} />
        ))}
      </div>
    </section>
  );
}
