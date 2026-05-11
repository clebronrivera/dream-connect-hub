// /breeder/litters/:litterId — router for one litter.
//
// Branches on lifecycle_status:
//   pre_birth  → "Are they born?" question, leading to /setup
//   post_birth → manage actions (puppies, edit dates)

import { useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Camera,
  CircleDollarSign,
  Loader2,
  PawPrint,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createPuppy,
  listLitterPuppies,
  loadBreederHome,
} from "@/lib/breeder/api";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { getSuggestedPuppyName } from "@/lib/puppy-name-generator";
import type { BreederLitterSummary } from "@/types/breeder";

const HOME_QK = ["breeder", "home"] as const;
const PUPPIES_QK = (litterId: string) => ["breeder", "litterPuppies", litterId] as const;

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-md bg-muted/40 p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-base font-bold">{value}</div>
    </div>
  );
}

export default function BreederLitter() {
  const { litterId } = useParams<{ litterId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  // Fetch the puppy roster too — used for the boys/girls breakdown and the
  // add-another-puppy buttons. Cheap; cached query.
  const { data: puppies = [] } = useQuery({
    queryKey: litterId ? PUPPIES_QK(litterId) : ["breeder", "litterPuppies", "none"],
    enabled: !!session && !!litterId,
    queryFn: async () => {
      if (!session || !litterId) return [];
      const res = await listLitterPuppies(session.token, litterId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const addPuppyMut = useMutation({
    mutationFn: async (gender: "Male" | "Female") => {
      if (!session || !litterId) throw new Error("Missing session");
      const name = getSuggestedPuppyName(gender, puppies.map((p) => p.name));
      const res = await createPuppy(session.token, {
        upcomingLitterId: litterId,
        name,
        gender,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      if (!litterId) return;
      queryClient.invalidateQueries({ queryKey: PUPPIES_QK(litterId) });
      queryClient.invalidateQueries({ queryKey: HOME_QK });
      navigate(`/breeder/puppies/${data.id}/capture?from=${litterId}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
    // Live stats from the puppies roster (source of truth). Fall back to
    // the upcoming_litters counters only if the roster query hasn't
    // settled yet — those counters get auto-synced after every create.
    const males = puppies.filter((p) => p.gender === "Male").length;
    const females = puppies.filter((p) => p.gender === "Female").length;
    const totalActual = puppies.length;
    const expectedMale = row.male_puppy_count ?? 0;
    const expectedFemale = row.female_puppy_count ?? 0;
    const totalExpected = Math.max(
      row.total_puppy_count ?? 0,
      expectedMale + expectedFemale,
      totalActual,
    );

    return (
      <div className="mx-auto max-w-screen-sm space-y-5 px-4 py-6">
        <section className="space-y-1">
          <Badge variant="secondary" className="text-xs">
            {parents}
          </Badge>
          <h1 className="text-2xl font-bold">{row.breed || "Litter"}</h1>
        </section>

        {/* Summary card — boys / girls / total / price / dates. */}
        <Card className="grid grid-cols-3 gap-3 p-4">
          <Stat label="Boys" value={`${males}${expectedMale ? ` / ${expectedMale}` : ""}`} />
          <Stat label="Girls" value={`${females}${expectedFemale ? ` / ${expectedFemale}` : ""}`} />
          <Stat
            label="Total"
            value={`${totalActual}${totalExpected > totalActual ? ` / ${totalExpected}` : ""}`}
          />
          <Stat
            label="Price each"
            value={
              row.litter_base_price != null
                ? `$${Number(row.litter_base_price).toLocaleString()}`
                : "—"
            }
            icon={<CircleDollarSign className="h-3 w-3" />}
          />
          <Stat
            label="DOB"
            value={formatShortDate(row.litter_date_of_birth ?? row.upcoming_date_of_birth) ?? "—"}
          />
          <Stat label="Ready" value={formatShortDate(row.ready_date) ?? "—"} />
        </Card>

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
            Edit dates &amp; price
          </Button>
        </div>

        {/* Quick add-a-boy / add-a-girl directly from the litter overview,
            mirroring the buttons on the wizard. */}
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Add another puppy</h2>
          <p className="text-xs text-muted-foreground">
            Litter count auto-bumps so the wizard's progress stays accurate.
            New puppies start hidden from the public site until you publish on
            the status step.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-12"
              disabled={addPuppyMut.isPending}
              onClick={() => addPuppyMut.mutate("Male")}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add a boy
            </Button>
            <Button
              variant="outline"
              className="h-12"
              disabled={addPuppyMut.isPending}
              onClick={() => addPuppyMut.mutate("Female")}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add a girl
            </Button>
          </div>
        </Card>

        <Card className="bg-muted/40 p-4 text-xs text-muted-foreground">
          Editing the litter's ready date or price will shift every puppy in
          this litter to match, unless a puppy's value was manually overridden.
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
