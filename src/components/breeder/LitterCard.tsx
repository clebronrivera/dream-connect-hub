// Single litter card on the breeder Home screen.
//
// Three visual states, derived from breeder_litter_summary:
//   - Still waiting     — lifecycle_status='pre_birth'
//   - Born, needs photos — post_birth + at least one puppy missing photos
//   - Up to date         — post_birth + every puppy has at least one photo

import { ArrowRight, CalendarClock, Camera, CheckCircle2, Heart, PawPrint } from "lucide-react";
import { Card } from "@/components/ui/card";
import { resolvePuppyPhotosPublicUrl } from "@/lib/puppy-photos";
import type { BreederLitterSummary } from "@/types/breeder";

interface LitterCardState {
  label: string;
  tone: "waiting" | "needs-photos" | "up-to-date";
  Icon: typeof CalendarClock;
}

function deriveState(row: BreederLitterSummary, now: number): LitterCardState {
  if (row.lifecycle_status !== "post_birth") {
    return { label: "Still waiting", tone: "waiting", Icon: CalendarClock };
  }
  if (row.total_puppies === 0 || row.puppies_missing_photos > 0) {
    return { label: "Needs photos", tone: "needs-photos", Icon: Camera };
  }
  const updated = row.last_puppy_update
    ? formatRelative(row.last_puppy_update, now)
    : "just now";
  return {
    label: `Up to date · updated ${updated}`,
    tone: "up-to-date",
    Icon: CheckCircle2,
  };
}

function formatRelative(iso: string, now: number): string {
  const diffMs = now - new Date(iso).getTime();
  if (diffMs < 60_000) return "just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TONE_STYLES: Record<LitterCardState["tone"], string> = {
  waiting: "bg-amber-100 text-amber-900 border-amber-200",
  "needs-photos": "bg-rose-100 text-rose-900 border-rose-200",
  "up-to-date": "bg-emerald-100 text-emerald-900 border-emerald-200",
};

export interface LitterCardProps {
  row: BreederLitterSummary;
  now: number;
  onClick?: () => void;
}

export function LitterCard({ row, now, onClick }: LitterCardProps) {
  const state = deriveState(row, now);
  const expected = formatDate(row.expected_whelping_date);
  const dob = formatDate(row.litter_date_of_birth ?? row.upcoming_date_of_birth);
  const ready = formatDate(row.ready_date);
  const parents = [row.dam_name, row.sire_name].filter(Boolean).join(" × ") || "Parents TBD";
  // Prefer the dam's portrait — buyers + breeders both think of a litter
  // primarily by the mother. Fall back to the state-tone icon when no
  // portrait is on file yet.
  const damPhotoUrl = resolvePuppyPhotosPublicUrl(row.dam_photo_path);

  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex w-full cursor-pointer items-center gap-4 border p-4 transition active:scale-[0.99] hover:shadow-md ${
        onClick ? "" : "cursor-default"
      }`}
    >
      <div className="relative h-16 w-16 shrink-0">
        {damPhotoUrl ? (
          <img
            src={damPhotoUrl}
            alt={row.dam_name ? `Mom: ${row.dam_name}` : "Mom"}
            className="h-16 w-16 rounded-full border object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border bg-muted text-muted-foreground"
            aria-hidden
          >
            <PawPrint className="h-7 w-7" />
          </div>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background ${TONE_STYLES[state.tone]}`}
          aria-hidden
        >
          <state.Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-1.5 truncate text-lg font-semibold">
          <Heart className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
          {parents}
        </h2>
        {row.breed && (
          <p className="truncate text-xs text-muted-foreground">{row.breed}</p>
        )}
        <p
          className={`mt-1 text-sm ${
            state.tone === "needs-photos"
              ? "font-medium text-rose-700"
              : "text-muted-foreground"
          }`}
        >
          {state.label}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {state.tone === "waiting" && expected && <span>Due {expected}</span>}
          {state.tone !== "waiting" && dob && <span>DOB {dob}</span>}
          {ready && <span>Ready {ready}</span>}
          {row.total_puppies > 0 && (
            <span>
              {row.total_puppies} {row.total_puppies === 1 ? "puppy" : "puppies"}
              {row.puppies_missing_photos > 0 && (
                <span className="text-rose-700">
                  {" "}· {row.puppies_missing_photos} missing
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
    </Card>
  );
}
