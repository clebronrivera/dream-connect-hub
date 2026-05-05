import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PuppyPlaceholderSvg } from "@/components/redesign/PublicDesignPrimitives";
import { fetchAvailablePuppies } from "@/lib/puppies-api";
import type { Puppy } from "@/lib/supabase";
import { getPuppyImage } from "@/lib/puppy-display-utils";
import { cn } from "@/lib/utils";

function MarqueeCard({ puppy }: { puppy: Puppy }) {
  const imgUrl = getPuppyImage(puppy);
  const id = puppy.id ?? puppy.puppy_id;
  const to = id ? `/puppies/${id}` : "/puppies";

  return (
    <Link
      to={to}
      className="flex w-[160px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition hover:border-[#ff3399]/45 hover:bg-white/[0.1]"
    >
      <div className="relative h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/5">
        {imgUrl ? (
          <img src={imgUrl} alt={puppy.name || ""} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <PuppyPlaceholderSvg className="h-12 w-12 opacity-80" />
          </div>
        )}
      </div>
      <div className="w-full min-w-0 text-center">
        <p className="truncate text-sm font-semibold text-white">{puppy.name || "—"}</p>
        <p className="truncate text-xs text-white/60">{puppy.breed}</p>
      </div>
    </Link>
  );
}

type Props = {
  className?: string;
};

/** Infinite marquee of currently available puppies for the galactic home hero. */
export function GalacticHeroPuppiesMarquee({ className }: Props) {
  const { t } = useLanguage();
  const { data: puppies = [], isLoading, isError } = useQuery({
    queryKey: ["puppies"],
    queryFn: fetchAvailablePuppies,
  });

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex w-full justify-center border-y border-white/10 bg-black/25 py-6 backdrop-blur-md",
          className,
        )}
        aria-busy
      >
        <Loader2 className="size-7 animate-spin text-[#ff3399]" aria-hidden />
      </div>
    );
  }

  if (isError || puppies.length === 0) {
    return null;
  }

  const items = [...puppies, ...puppies];

  return (
    <div
      className={cn("w-full overflow-hidden border-y border-white/10 bg-black/25 py-5 backdrop-blur-md", className)}
      aria-label={t("serviceAvailablePuppiesTitle")}
    >
      <div className="flex w-max gap-4 animate-marquee hover:[animation-play-state:paused]">
        {items.map((puppy, index) => (
          <MarqueeCard key={`${puppy.id ?? puppy.puppy_id}-${index}`} puppy={puppy} />
        ))}
      </div>
    </div>
  );
}
