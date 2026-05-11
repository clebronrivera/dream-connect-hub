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

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Heart,
  Loader2,
  PawPrint,
  Plus,
  Syringe,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import {
  createPuppy,
  listLitterPuppies,
  loadBreederHome,
  updatePuppy,
  type BreederPuppyRow,
} from "@/lib/breeder/api";
import { getSuggestedPuppyName } from "@/lib/puppy-name-generator";
import { getLastPuppyForLitter } from "@/lib/breeder/captureState";
import { resolvePuppyPhotosPublicUrl } from "@/lib/puppy-photos";

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

  // "Continue with [last puppy]" — always surface the most recently visited
  // puppy for this litter, regardless of capture state. Lets the operator
  // hit Home, come back later, and pick up exactly where they left off.
  const lastPuppyId = litterId ? getLastPuppyForLitter(litterId) : null;
  const resumeCandidate = lastPuppyId
    ? puppies.find((p) => p.id === lastPuppyId)
    : undefined;

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

      {resumeCandidate && (
        <Card
          role="button"
          tabIndex={0}
          onClick={() =>
            navigate(`/breeder/puppies/${resumeCandidate.id}/capture?from=${litterId}`)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(`/breeder/puppies/${resumeCandidate.id}/capture?from=${litterId}`);
            }
          }}
          className="flex cursor-pointer items-center gap-3 border-primary/40 bg-primary/5 p-4 transition hover:shadow"
        >
          <PawPrint className="h-5 w-5 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">
              Continue with {resumeCandidate.name}
            </div>
            <p className="text-xs text-muted-foreground">
              You were last working on this puppy. Tap to pick up where you left off.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
        </Card>
      )}

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
            {puppies.map((p) => (
              <PuppyListRow
                key={p.id}
                puppy={p}
                litterId={litterId ?? ""}
                onNavigate={(id) =>
                  navigate(`/breeder/puppies/${id}/capture?from=${litterId}`)
                }
                onUpdated={() => {
                  if (litterId) {
                    queryClient.invalidateQueries({ queryKey: PUPPIES_QK(litterId) });
                  }
                  // Also bust the home cache so the litter summary card
                  // (Boys/Girls/Total) reflects gender swaps immediately.
                  queryClient.invalidateQueries({ queryKey: HOME_QK });
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Add-another-puppy: lets the operator grow the litter beyond
          the initial count (e.g. surprise puppies, miscounted at setup). */}
      <section className="space-y-2 pt-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Add another puppy
        </h3>
        <p className="text-xs text-muted-foreground">
          Use this if the count from setup was off. The new puppy starts hidden
          from the public site until you publish on the status step.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-12"
            disabled={createMut.isPending}
            onClick={() =>
              createMut.mutate({ gender: "Male", indexWithinGender: 0 })
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add a boy
          </Button>
          <Button
            variant="outline"
            className="h-12"
            disabled={createMut.isPending}
            onClick={() =>
              createMut.mutate({ gender: "Female", indexWithinGender: 0 })
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add a girl
          </Button>
        </div>
      </section>
    </div>
  );
}

// Per-puppy row in the "Puppies so far" list. Surfaces gender/status/photo
// counts and lets the breeder set an optional "vaccinated on" date inline —
// the saved-summary use-case the operator hits after the capture sweep is
// done, when she has the actual vet card in front of her.
function PuppyListRow({
  puppy,
  onNavigate,
  onUpdated,
}: {
  puppy: BreederPuppyRow;
  litterId: string;
  onNavigate: (id: string) => void;
  onUpdated: () => void;
}) {
  const { session } = useBreederAuth();
  const initialVaccinatedAt = puppy.vaccinated_at ?? "";
  const [vaccinatedAt, setVaccinatedAt] = useState(initialVaccinatedAt);

  const updateMut = useMutation({
    mutationFn: async (val: string | null) => {
      if (!session) throw new Error("No breeder session");
      const res = await updatePuppy(session.token, puppy.id, {
        vaccinated_at: val,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => onUpdated(),
    onError: (err: Error) => {
      // Revert local state so the input shows what's actually persisted.
      setVaccinatedAt(initialVaccinatedAt);
      toast.error(err.message);
    },
  });

  const saveVaccinatedAt = () => {
    if (vaccinatedAt === initialVaccinatedAt) return;
    updateMut.mutate(vaccinatedAt ? vaccinatedAt : null);
  };

  const genderMut = useMutation({
    mutationFn: async (newGender: "Male" | "Female") => {
      if (!session) throw new Error("No breeder session");
      const res = await updatePuppy(session.token, puppy.id, {
        gender: newGender,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `${data.name} is now a ${data.gender === "Male" ? "boy" : "girl"}`,
      );
      onUpdated();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const newGender: "Male" | "Female" =
    puppy.gender === "Male" ? "Female" : "Male";
  const currentLabel = puppy.gender === "Male" ? "Boy" : "Girl";
  const newLabel = newGender === "Male" ? "Boy" : "Girl";

  const totalPhotos =
    (puppy.primary_photo ? 1 : 0) + (puppy.photos?.length ?? 0);
  const hasPhoto = totalPhotos > 0;
  // Show the same image the public site uses as the puppy's primary so the
  // breeder can confirm the face photo without opening the capture flow.
  const heroUrl = resolvePuppyPhotosPublicUrl(
    puppy.primary_photo ?? puppy.photos?.[0] ?? null,
  );

  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate(puppy.id)}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted"
          aria-label={`Open ${puppy.name}`}
        >
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
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-medium">{puppy.name}</span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={genderMut.isPending}
                  className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-2 py-0.5 text-[10px] font-medium transition hover:bg-muted disabled:opacity-50"
                  aria-label={`Change ${puppy.name}'s gender (currently ${currentLabel})`}
                >
                  {currentLabel}
                  <ArrowLeftRight
                    className="h-2.5 w-2.5 opacity-60"
                    aria-hidden
                  />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Switch {puppy.name} to a {newLabel.toLowerCase()}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Reassigns {puppy.name} from <strong>{currentLabel}</strong>{" "}
                    to <strong>{newLabel}</strong>. The litter's male and
                    female counts will shift by one to match.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => genderMut.mutate(newGender)}
                  >
                    Switch to {newLabel}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
          <div className="mt-0.5 text-xs text-muted-foreground">
            {hasPhoto
              ? `${totalPhotos} photo${totalPhotos === 1 ? "" : "s"}`
              : "No photos yet"}
            {puppy.base_price != null &&
              ` · $${Number(puppy.base_price).toLocaleString()}`}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onNavigate(puppy.id)}>
          Open
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Syringe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <label
          htmlFor={`vacc-${puppy.id}`}
          className="text-xs text-muted-foreground"
        >
          Vaccinated
        </label>
        <Input
          id={`vacc-${puppy.id}`}
          type="date"
          value={vaccinatedAt}
          onChange={(e) => setVaccinatedAt(e.target.value)}
          onBlur={saveVaccinatedAt}
          disabled={updateMut.isPending}
          className="h-8 max-w-[170px] text-xs"
        />
        {updateMut.isPending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
    </li>
  );
}
