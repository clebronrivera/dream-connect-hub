// /breeder/photos — Bulk puppy photo manager.
//
// One scrollable page that lists every puppy with all of its uploaded
// pictures. Under each picture the breeder can tap to replace it (pick from
// the phone's library or take a new shot) without ever leaving the page —
// minimising the back-and-forth of the per-puppy capture wizard. Replacing a
// photo uploads + swaps it in place and retires the old file server-side.
//
// Sortable by name, litter, age, or breed.

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PawPrint } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EditablePuppyPhoto } from "@/components/breeder/EditablePuppyPhoto";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import {
  listAllBreederPuppies,
  type BreederPuppyRow,
  type BreederPuppyWithLitter,
} from "@/lib/breeder/api";

const ALL_PUPPIES_QK = ["breeder", "allPuppies"] as const;

type SortKey = "name" | "litter" | "age" | "breed";
const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  litter: "Litter",
  age: "Age",
  breed: "Breed",
};

function litterLabel(p: BreederPuppyWithLitter): string {
  const parents = [p.dam_name, p.sire_name].filter(Boolean).join(" × ");
  return parents || p.breed || "Unassigned litter";
}

function ageLabel(dob: string | null): string {
  if (!dob) return "Age unknown";
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return "Age unknown";
  const days = Math.floor((Date.now() - born.getTime()) / 86_400_000);
  if (days < 0) return "Not born yet";
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} old`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} old`;
}

function dobMillis(dob: string | null): number {
  if (!dob) return Number.POSITIVE_INFINITY; // unknown DOB sorts last
  const t = new Date(dob).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function sortPuppies(list: BreederPuppyWithLitter[], key: SortKey): BreederPuppyWithLitter[] {
  const byName = (a: BreederPuppyWithLitter, b: BreederPuppyWithLitter) =>
    (a.name ?? "").localeCompare(b.name ?? "");
  const sorted = [...list];
  switch (key) {
    case "litter":
      sorted.sort((a, b) => litterLabel(a).localeCompare(litterLabel(b)) || byName(a, b));
      break;
    case "age":
      // Oldest first (earliest date of birth).
      sorted.sort((a, b) => dobMillis(a.date_of_birth) - dobMillis(b.date_of_birth) || byName(a, b));
      break;
    case "breed":
      sorted.sort((a, b) => (a.breed ?? "").localeCompare(b.breed ?? "") || byName(a, b));
      break;
    case "name":
    default:
      sorted.sort(byName);
      break;
  }
  return sorted;
}

export default function BreederPhotos() {
  const { session } = useBreederAuth();
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>("litter");
  const [showSold, setShowSold] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ALL_PUPPIES_QK,
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await listAllBreederPuppies(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  // Merge the saved puppy row back into the cached roster so the new photo
  // shows immediately without a refetch.
  function applyUpdate(updated: BreederPuppyRow) {
    queryClient.setQueryData<BreederPuppyWithLitter[]>(ALL_PUPPIES_QK, (prev) =>
      (prev ?? []).map((p) =>
        p.id === updated.id
          ? { ...p, photos: updated.photos, primary_photo: updated.primary_photo }
          : p,
      ),
    );
  }

  const visible = useMemo(() => {
    const all = data ?? [];
    const filtered = showSold ? all : all.filter((p) => p.status !== "Sold");
    return sortPuppies(filtered, sortKey);
  }, [data, sortKey, showSold]);

  const soldCount = (data ?? []).filter((p) => p.status === "Sold").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-screen-sm px-4 py-6">
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error instanceof Error ? error.message : "Failed to load puppies"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Update puppy pictures</h1>
        <p className="text-sm text-muted-foreground">
          Tap any photo to replace it — pick from your phone or take a new one.
          The old picture is retired automatically.
        </p>
      </header>

      {/* ── Sort control ── */}
      <div className="flex items-center gap-3">
        <label htmlFor="sort" className="text-sm font-medium text-muted-foreground">
          Sort by
        </label>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger id="sort" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border bg-muted/40 p-8 text-center">
          <PawPrint className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No puppies to show. Add puppies from the Puppies tab first.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((puppy) => {
            const photos = (puppy.photos ?? []).filter(
              (u): u is string => typeof u === "string" && u.length > 0,
            );
            return (
              <Card key={puppy.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                      {puppy.name || "(no name)"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[puppy.gender, puppy.breed].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {litterLabel(puppy)} · {ageLabel(puppy.date_of_birth)}
                    </p>
                  </div>
                  {puppy.status && puppy.status !== "Available" && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {puppy.status}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.map((url, i) => (
                    <EditablePuppyPhoto
                      key={url}
                      puppyId={puppy.id}
                      url={url}
                      isPrimary={i === 0}
                      onUpdated={applyUpdate}
                    />
                  ))}
                  {/* Trailing "add photo" slot */}
                  <EditablePuppyPhoto
                    puppyId={puppy.id}
                    url={null}
                    onUpdated={applyUpdate}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {soldCount > 0 && (
        <Button variant="outline" className="w-full" onClick={() => setShowSold((s) => !s)}>
          {showSold ? "Hide sold puppies" : `Show sold puppies (${soldCount})`}
        </Button>
      )}
    </div>
  );
}
