// Panel rendered inside the /breeder Puppies tab.
//
// Fans out across the active litters returned by loadBreederHome to fetch
// every puppy in one go, then renders them as a single scrollable list with
// thumbnails (PuppyHubRow). Tapping a row opens that puppy's capture flow
// so the breeder can edit photos, status, price, or notes.
//
// "Add a new puppy" opens a small dialog that lists post-birth litters; the
// breeder picks one and a gender, and we route to the wizard's create-and-
// capture path. We don't surface a "create without a litter" option — the
// puppies schema requires a litter parent, and the wizard already handles
// surprise additions to an existing litter.

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, PawPrint, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PuppyHubRow } from "@/components/breeder/PuppyHubRow";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import {
  createPuppy,
  listAllBreederPuppies,
} from "@/lib/breeder/api";
import { getSuggestedPuppyName } from "@/lib/puppy-name-generator";
import type { BreederLitterSummary } from "@/types/breeder";

const ALL_PUPPIES_QK = ["breeder", "allPuppies"] as const;

interface Props {
  home: BreederLitterSummary[];
}

export function BreederPuppiesPanel({ home }: Props) {
  const { session } = useBreederAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addGender, setAddGender] = useState<"Male" | "Female">("Female");

  // Only litters that already have a litters row can host new puppies
  // (the schema requires breed inheritance via createPuppy). Pre-birth
  // litters get filtered out — the breeder confirms birth via the litter
  // setup flow before they can add puppies.
  const eligibleLitters = useMemo(
    () =>
      home.filter((l) => l.lifecycle_status === "post_birth"),
    [home],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: [
      ...ALL_PUPPIES_QK,
      home.map((l) => l.upcoming_litter_id).join(","),
    ] as const,
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await listAllBreederPuppies(
        session.token,
        home.map((l) => ({
          upcoming_litter_id: l.upcoming_litter_id,
          dam_name: l.dam_name,
          sire_name: l.sire_name,
        })),
      );
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const addMut = useMutation({
    mutationFn: async (args: { litterId: string; gender: "Male" | "Female" }) => {
      if (!session) throw new Error("No breeder session");
      const existingNames = (data ?? [])
        .filter((p) => p.upcoming_litter_id === args.litterId)
        .map((p) => p.name);
      const name = getSuggestedPuppyName(args.gender, existingNames);
      const res = await createPuppy(session.token, {
        upcomingLitterId: args.litterId,
        name,
        gender: args.gender,
      });
      if (!res.ok) throw new Error(res.error);
      return { ...res.data, litterId: args.litterId };
    },
    onSuccess: (created) => {
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ALL_PUPPIES_QK });
      queryClient.invalidateQueries({ queryKey: ["breeder", "home"] });
      navigate(
        `/breeder/puppies/${created.id}/capture?from=${created.litterId}`,
      );
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

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
      >
        {error instanceof Error ? error.message : "Failed to load puppies"}
      </div>
    );
  }

  const puppies = data ?? [];

  return (
    <div className="space-y-3">
      <Button
        className="h-12 w-full text-base"
        onClick={() => setAddOpen(true)}
        disabled={eligibleLitters.length === 0}
      >
        <Plus className="mr-2 h-5 w-5" />
        Add a new puppy
      </Button>
      {eligibleLitters.length === 0 && (
        <p className="text-xs text-muted-foreground">
          You need a born litter before you can add a puppy. Open the Litters
          tab and confirm a birth first.
        </p>
      )}

      {puppies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border bg-muted/40 p-6 text-center">
          <PawPrint className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No puppies yet. Add one above, or open a litter from the Litters
            tab.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-md border">
          {puppies.map((p) => (
            <PuppyHubRow key={p.id} puppy={p} />
          ))}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a new puppy</DialogTitle>
            <DialogDescription>
              Pick the litter this puppy belongs to. We'll auto-suggest a name
              and open the photo flow next.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                Gender
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={addGender === "Male" ? "default" : "outline"}
                  onClick={() => setAddGender("Male")}
                >
                  Boy
                </Button>
                <Button
                  type="button"
                  variant={addGender === "Female" ? "default" : "outline"}
                  onClick={() => setAddGender("Female")}
                >
                  Girl
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                Litter
              </p>
              <ul className="max-h-64 divide-y overflow-auto rounded-md border">
                {eligibleLitters.map((l) => {
                  const parents = [l.dam_name, l.sire_name]
                    .filter(Boolean)
                    .join(" × ");
                  return (
                    <li key={l.upcoming_litter_id}>
                      <button
                        type="button"
                        disabled={addMut.isPending}
                        onClick={() =>
                          addMut.mutate({
                            litterId: l.upcoming_litter_id,
                            gender: addGender,
                          })
                        }
                        className="w-full px-3 py-3 text-left transition hover:bg-muted/50 disabled:opacity-50"
                      >
                        <div className="text-sm font-medium">
                          {parents || "Parents TBD"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {l.breed ?? "Litter"}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={addMut.isPending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
