import { cn } from "@/lib/utils";

/** Decorative dog silhouette on a diagonal pink / blue split (gender-reveal style). */
export function UpcomingPuppySilhouette({
  className,
  title,
}: {
  className?: string;
  /** Accessible label, e.g. "Male puppy placeholder" */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("rounded-lg border border-border/60 shadow-sm", className)}
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <title>{title}</title>
      <polygon fill="#fbcfe8" points="0,0 120,0 120,120" />
      <polygon fill="#93c5fd" points="0,0 0,120 120,120" />
      <path
        fill="rgba(255,255,255,0.92)"
        d="M60 22c-10 0-19 6-23 15-5 12-2 27 8 36 3 3 7 5 11 5h8c4 0 8-2 11-5 10-9 13-24 8-36-4-9-13-15-23-15zm-18 52c-6 0-11 5-11 11v16c0 4 3 7 7 7h4c4 0 7-3 7-7V85c0-6-5-11-11-11h4zm32 0c-6 0-11 5-11 11v16c0 4 3 7 7 7h4c4 0 7-3 7-7V85c0-6-5-11-11-11h4zm-16 8c-10 0-18 6-20 14h40c-2-8-10-14-20-14z"
      />
    </svg>
  );
}
