// /breeder/litters/:litterId — router for one litter.
//
// Branches on lifecycle_status:
//   pre_birth  → "Are they born?" question, leading to /setup
//   post_birth → manage actions (puppies, edit dates)

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Camera,
  Loader2,
  PawPrint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadBreederHome } from "@/lib/breeder/api";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import type { BreederLitterSummary } from "@/types/breeder";

const HOME_QK = ["breeder", "home"] as const;

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BreederLitter() {
  const { litterId } = useParams<{ litterId: string }>();
  const navigate = useNavigate();
  const { session } = useBreederAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: HOME_QK,
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await loadBreederHome(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const row = useMemo<BreederLitterSummary | undefined>(
    () => data?.find((r) => r.upcoming_litter_id === litterId),
    [data, litterId],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (error || !row) {
    return (
      <div className="mx-auto max-w-screen-sm space-y-4 px-4 py-6">
        <p className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
          Litter not found. Tap the back arrow to return to the home screen.
        </p>
      </div>
    );
  }

  const parents = [row.dam_name, row.sire_name].filter(Boolean).join(" × ") || "Parents TBD";

  if (row.lifecycle_status === "post_birth") {
    return (
      <div className="mx-auto max-w-screen-sm space-y-5 px-4 py-6">
        <section className="space-y-1">
          <Badge variant="secondary" className="text-xs">
            {parents}
          </Badge>
          <h1 className="text-2xl font-bold">{row.breed || "Litter"}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {formatDate(row.litter_date_of_birth ?? row.upcoming_date_of_birth) && (
              <span>DOB {formatDate(row.litter_date_of_birth ?? row.upcoming_date_of_birth)}</span>
            )}
            {formatDate(row.ready_date) && <span>Ready {formatDate(row.ready_date)}</span>}
            <span>
              {row.total_puppies} {row.total_puppies === 1 ? "puppy" : "puppies"}
              {row.puppies_missing_photos > 0 && (
                <span className="text-rose-700">
                  {" "}· {row.puppies_missing_photos} missing photos
                </span>
              )}
            </span>
          </div>
        </section>

        <div className="space-y-3">
          <Button
            className="h-14 w-full text-base"
            onClick={() => navigate(`/breeder/litters/${row.upcoming_litter_id}/wizard`)}
          >
            <PawPrint className="mr-2 h-5 w-5" />
            Manage these puppies
            <ArrowRight className="ml-auto h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            className="h-14 w-full text-base"
            onClick={() => navigate(`/breeder/litters/${row.upcoming_litter_id}/dates`)}
          >
            <CalendarDays className="mr-2 h-5 w-5" />
            Edit dates
          </Button>
        </div>

        <Card className="bg-muted/40 p-4 text-xs text-muted-foreground">
          Editing the litter's ready date will shift every puppy in this litter to
          match, unless a puppy's ready date was manually overridden.
        </Card>
      </div>
    );
  }

  // pre_birth
  const due = formatDate(row.expected_whelping_date);
  return (
    <div className="mx-auto max-w-screen-sm space-y-5 px-4 py-6">
      <section className="space-y-1">
        <Badge variant="secondary" className="text-xs">
          {parents}
        </Badge>
        <h1 className="text-2xl font-bold">{row.breed || "Litter"}</h1>
        {due && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            Due {due}
          </p>
        )}
      </section>

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Are they born?</h2>
        <p className="text-sm text-muted-foreground">
          Tap <strong>Yes</strong> to add the puppies and start capturing photos.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            className="h-14 text-base"
            onClick={() => navigate(`/breeder/litters/${row.upcoming_litter_id}/setup`)}
          >
            <Camera className="mr-2 h-5 w-5" />
            Yes — start
          </Button>
          <Button variant="outline" className="h-14 text-base" asChild>
            <Link to="/breeder">Not yet</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
