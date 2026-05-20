// /breeder/litters/:litterId/setup
//
// Multi-step "are they born" confirmation:
//   1. Confirm/edit breed (pre-filled from upcoming_litters.breed)
//   2. Date of birth (default = today)
//   3. Ready-by date (default = dob + 8 weeks)
//   4. Male / female counts
//   5. Review + submit → confirmLitterBorn → routes to BreederLitter

import { useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { confirmLitterBorn, loadBreederHome } from "@/lib/breeder/api";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import type { BreederLitterSummary } from "@/types/breeder";

const HOME_QK = ["breeder", "home"] as const;
const PUPPY_GO_HOME_AGE_DAYS = 56; // 8 weeks; matches /admin's convention

type Step = "breed" | "dob" | "ready" | "counts" | "price" | "review";
const STEPS: Step[] = ["breed", "dob", "ready", "counts", "price", "review"];

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function BreederLitterSetup() {
  const { litterId } = useParams<{ litterId: string }>();
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

  const row = data?.find((r) => r.upcoming_litter_id === litterId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (error || !row || !litterId) {
    return (
      <div className="mx-auto max-w-screen-sm px-4 py-6 text-sm text-muted-foreground">
        Litter not found.
      </div>
    );
  }

  return <SetupForm row={row} litterId={litterId} />;
}

function SetupForm({ row, litterId }: { row: BreederLitterSummary; litterId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useBreederAuth();

  const [stepIdx, setStepIdx] = useState(0);
  const [breed, setBreed] = useState(row.breed ?? "");
  const [dob, setDob] = useState(isoToday());
  const [ready, setReady] = useState(addDays(isoToday(), PUPPY_GO_HOME_AGE_DAYS));
  const [male, setMale] = useState(0);
  const [female, setFemale] = useState(0);
  // Price is per-litter; pre-fills from breeder_litter_summary.litter_base_price
  // when the operator is re-running setup. Empty string = "leave unset for now".
  const [priceText, setPriceText] = useState<string>(
    row.litter_base_price != null ? String(row.litter_base_price) : "",
  );

  function handleDobChange(next: string) {
    // If the operator hasn't manually moved the ready date, follow dob.
    const prevAutoReady = addDays(dob, PUPPY_GO_HOME_AGE_DAYS);
    setDob(next);
    if (ready === prevAutoReady) setReady(addDays(next, PUPPY_GO_HOME_AGE_DAYS));
  }

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Missing session");
      const priceTrim = priceText.trim();
      const basePrice = priceTrim === "" ? null : Number(priceTrim);
      if (basePrice !== null && (!Number.isFinite(basePrice) || basePrice < 0)) {
        throw new Error("Price must be a non-negative number");
      }
      const res = await confirmLitterBorn(session.token, {
        upcomingLitterId: litterId,
        breed: breed.trim(),
        dateOfBirth: dob,
        readyDate: ready,
        maleCount: male,
        femaleCount: female,
        basePrice,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Litter saved");
      queryClient.invalidateQueries({ queryKey: HOME_QK });
      // Jump straight into the puppy wizard — the spec's "Yes → setup → capture" path.
      navigate(`/breeder/litters/${litterId}/wizard`, { replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const step = STEPS[stepIdx]!;
  const total = male + female;
  const canAdvance = (() => {
    switch (step) {
      case "breed":
        return breed.trim().length > 0;
      case "dob":
        return /^\d{4}-\d{2}-\d{2}$/.test(dob);
      case "ready":
        return /^\d{4}-\d{2}-\d{2}$/.test(ready) && ready >= dob;
      case "counts":
        return total > 0;
      case "price": {
        if (priceText.trim() === "") return true; // optional — operator can set later
        const n = Number(priceText);
        return Number.isFinite(n) && n >= 0 && n <= 100000;
      }
      case "review":
        return true;
    }
  })();

  return (
    <div className="mx-auto max-w-screen-sm space-y-5 px-4 py-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Step {stepIdx + 1} of {STEPS.length}
        </p>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i <= stepIdx ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </header>

      <Card className="space-y-4 p-5">
        {step === "breed" && (
          <>
            <h2 className="text-lg font-semibold">Confirm the breed</h2>
            <p className="text-sm text-muted-foreground">
              Pre-filled from the upcoming-litter slot. Edit if needed.
            </p>
            <div>
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="mt-1"
                placeholder="e.g. F1B Goldendoodle x Mini Poodle"
              />
            </div>
          </>
        )}

        {step === "dob" && (
          <>
            <h2 className="text-lg font-semibold">When were they born?</h2>
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => handleDobChange(e.target.value)}
                className="mt-1"
              />
            </div>
          </>
        )}

        {step === "ready" && (
          <>
            <h2 className="text-lg font-semibold">When are they ready to go home?</h2>
            <p className="text-sm text-muted-foreground">
              Default is 8 weeks after birth ({addDays(dob, PUPPY_GO_HOME_AGE_DAYS)}).
              This is the date the public site shows buyers.
            </p>
            <div>
              <Label htmlFor="ready">Ready by</Label>
              <Input
                id="ready"
                type="date"
                value={ready}
                min={dob}
                onChange={(e) => setReady(e.target.value)}
                className="mt-1"
              />
            </div>
          </>
        )}

        {step === "counts" && (
          <>
            <h2 className="text-lg font-semibold">How many puppies?</h2>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Counter label="Boys" value={male} setValue={setMale} />
              <Counter label="Girls" value={female} setValue={setFemale} />
            </div>
            <p className="pt-1 text-sm text-muted-foreground">
              {total === 0 ? "Add at least one" : `Total: ${total}`}
            </p>
          </>
        )}

        {step === "price" && (
          <>
            <h2 className="text-lg font-semibold">Price per puppy</h2>
            <p className="text-sm text-muted-foreground">
              This is the litter-wide price every puppy starts at. You can leave
              it blank and fill it in later, or override an individual puppy
              during capture.
            </p>
            <div>
              <Label htmlFor="price">Price (USD)</Label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="50"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  className="pl-7"
                  placeholder="1500"
                />
              </div>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <h2 className="text-lg font-semibold">Ready to save?</h2>
            <dl className="space-y-2 text-sm">
              <ReviewRow label="Breed" value={breed} />
              <ReviewRow label="Date of birth" value={dob} />
              <ReviewRow label="Ready" value={ready} />
              <ReviewRow label="Boys" value={String(male)} />
              <ReviewRow label="Girls" value={String(female)} />
              <ReviewRow label="Total" value={String(total)} />
              <ReviewRow
                label="Price per puppy"
                value={priceText.trim() === "" ? "—" : `$${Number(priceText).toLocaleString()}`}
              />
            </dl>
          </>
        )}
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => (stepIdx === 0 ? navigate(-1) : setStepIdx(stepIdx - 1))}
          disabled={submitMut.isPending}
          className="flex-1 h-12"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {step !== "review" ? (
          <Button
            onClick={() => setStepIdx(stepIdx + 1)}
            disabled={!canAdvance}
            className="flex-1 h-12"
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => submitMut.mutate()}
            disabled={submitMut.isPending}
            className="flex-1 h-12"
          >
            {submitMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save litter
          </Button>
        )}
      </div>
    </div>
  );
}

function Counter({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  // Functional setState — composes correctly under rapid clicks.
  setValue: Dispatch<SetStateAction<number>>;
}) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="mt-1 flex items-center justify-between rounded-md border bg-background">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12"
          onClick={() => setValue((v) => Math.max(0, v - 1))}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-5 w-5" />
        </Button>
        <span className="text-2xl font-bold tabular-nums" aria-live="polite">
          {value}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12"
          onClick={() =>
            setValue((v) => {
              if (v >= 20) {
                toast.info("Max 20 per category for one litter");
                return 20;
              }
              return v + 1;
            })
          }
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
