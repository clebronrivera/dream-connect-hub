// /breeder/litters/:litterId/wizard
//
// Orchestrates capturing puppies in sequence after BreederLitterSetup
// flips the litter to post_birth. Decides which slot to fill next based
// on the expected male/female counts vs. existing puppy rows.
//
// On "Start puppy N", we createPuppy (with an auto-generated name +
// the correct gender) and route to /breeder/puppies/:newId/capture.
// The capture page returns here when done, and we re-render with one
// more puppy in the list — until we've filled all expected slots.

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  Heart,
  Loader2,
  PawPrint,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import {
  createPuppy,
  listLitterPuppies,
  loadBreederHome,
  type BreederPuppyRow,
} from "@/lib/breeder/api";
import { getSuggestedPuppyName } from "@/lib/puppy-name-generator";

const HOME_QK = ["breeder", "home"] as const;
const PUPPIES_QK = (litterId: string) => ["breeder", "litterPuppies", litterId] as const;

interface PuppySlot {
  gender: "Male" | "Female";
  indexWithinGender: number; // 1-based: "Boy 1", "Boy 2"
  filledBy?: BreederPuppyRow;
}

function deriveSlots(
  expectedMale: number,
  expectedFemale: number,
  puppies: BreederPuppyRow[],
): PuppySlot[] {
  const males = puppies.filter((p) => p.gender === "Male").sort(
    (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
  const females = puppies.filter((p) => p.gender === "Female").sort(
    (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );

  const slots: PuppySlot[] = [];
  const totalMale = Math.max(expectedMale, males.length);
  const totalFemale = Math.max(expectedFemale, females.length);
  for (let i = 0; i < totalMale; i++) {
    slots.push({
      gender: "Male",
      indexWithinGender: i + 1,
      filledBy: males[i],
    });
  }
  for (let i = 0; i < totalFemale; i++) {
    slots.push({
      gender: "Female",
      indexWithinGender: i + 1,
      filledBy: females[i],
    });
  }
  return slots;
}

function slotIsComplete(slot: PuppySlot): boolean {
  const p = slot.filledBy;
  if (!p) return false;
  return !!p.primary_photo || (Array.isArray(p.photos) && p.photos.length > 0);
}

export default function BreederPuppiesWizard() {
  const { litterId } = useParams<{ litterId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useBreederAuth();

  const { data: home } = useQuery({
    queryKey: HOME_QK,
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await loadBreederHome(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const litterRow = useMemo(
    () => home?.find((r) => r.upcoming_litter_id === litterId),
    [home, litterId],
  );

  const { data: puppies = [], isLoading } = useQuery({
    queryKey: litterId ? PUPPIES_QK(litterId) : ["breeder", "litterPuppies", "none"],
    enabled: !!session && !!litterId,
    queryFn: async () => {
      if (!session || !litterId) throw new Error("Missing session or litter");
      const res = await listLitterPuppies(session.token, litterId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const expectedMale = litterRow?.male_puppy_count ?? 0;
  const expectedFemale = litterRow?.female_puppy_count ?? 0;
  const slots = useMemo(
    () => deriveSlots(expectedMale, expectedFemale, puppies),
    [expectedMale, expectedFemale, puppies],
  );

  // Use slot count (max of expected vs. existing). Falls back gracefully
  // when male/female counts aren't set — e.g. legacy litters where admin
  // flipped lifecycle_status but never recorded the breakdown.
  const totalExpected = slots.length;
  const completedCount = slots.filter(slotIsComplete).length;
  const nextSlotIdx = slots.findIndex((s) => !s.filledBy);
  const nextSlot = nextSlotIdx >= 0 ? slots[nextSlotIdx] : undefined;

  const createMut = useMutation({
    mutationFn: async (slot: PuppySlot) => {
      if (!session || !litterId) throw new Error("Missing session");
      const name = getSuggestedPuppyName(
        slot.gender,
        puppies.map((p) => p.name),
      );
      const res = await createPuppy(session.token, {
        upcomingLitterId: litterId,
        name,
        gender: slot.gender,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      if (!litterId) return;
      queryClient.invalidateQueries({ queryKey: PUPPIES_QK(litterId) });
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

  if (!litterRow) {
    return (
      <div className="mx-auto max-w-screen-sm px-4 py-6 text-sm text-muted-foreground">
        Litter not found.
      </div>
    );
  }

  const allDone = totalExpected > 0 && completedCount === totalExpected;

  return (
    <div className="mx-auto max-w-screen-sm space-y-5 px-4 py-6">
      <header className="space-y-1">
        <Badge variant="secondary" className="text-xs">
          <Heart className="mr-1 h-3 w-3" />
          {[litterRow.dam_name, litterRow.sire_name].filter(Boolean).join(" × ") || "—"}
        </Badge>
        <h1 className="text-2xl font-bold">{litterRow.breed || "Litter"}</h1>
        <p className="text-sm text-muted-foreground">
          {completedCount} of {totalExpected || "—"} puppies captured
          {litterRow.litter_base_price != null && (
            <>
              {" · "}
              <span className="font-medium text-foreground">
                ${Number(litterRow.litter_base_price).toLocaleString()} ea.
              </span>
            </>
          )}
        </p>
        <div className="mt-2 flex gap-1">
          {slots.map((s, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                slotIsComplete(s) ? "bg-emerald-500" : s.filledBy ? "bg-primary/60" : "bg-muted"
              }`}
              aria-label={`${s.gender} ${s.indexWithinGender}`}
            />
          ))}
        </div>
      </header>

      {allDone ? (
        <Card className="space-y-4 p-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold">All done!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every puppy has at least one photo. Tap below to head back.
            </p>
          </div>
          <Button asChild className="h-12 w-full">
            <Link to="/breeder">Back to litters</Link>
          </Button>
        </Card>
      ) : (
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <PawPrint className="h-6 w-6 text-primary" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold">
                Next: {nextSlot?.gender === "Male" ? "Boy" : "Girl"} #{nextSlot?.indexWithinGender}
              </h2>
              <p className="text-sm text-muted-foreground">
                We'll auto-suggest a name and start the photo flow.
              </p>
            </div>
          </div>
          <Button
            className="h-14 w-full text-base"
            onClick={() => nextSlot && createMut.mutate(nextSlot)}
            disabled={!nextSlot || createMut.isPending}
          >
            {createMut.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Plus className="mr-2 h-5 w-5" />
            )}
            Start this puppy
          </Button>
        </Card>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Puppies so far</h3>
        {puppies.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {puppies.map((p) => {
              const photosArr = p.photos ?? [];
              // primary_photo may exist independently of the photos array
              // (admin-uploaded puppies have this shape). Count it once.
              const photoCount =
                photosArr.length +
                (p.primary_photo && !photosArr.includes(p.primary_photo) ? 1 : 0);
              const captured = photoCount > 0;
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {p.gender}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {captured
                        ? `${photoCount} ${photoCount === 1 ? "photo" : "photos"}`
                        : "No photos yet"}
                      {p.base_price != null && (
                        <>
                          {" · "}
                          <span className="font-medium text-foreground">
                            ${Number(p.base_price).toLocaleString()}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    variant={captured ? "ghost" : "outline"}
                    size="sm"
                    onClick={() =>
                      navigate(`/breeder/puppies/${p.id}/capture?from=${litterId}`)
                    }
                  >
                    {captured ? "Update" : "Capture"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
