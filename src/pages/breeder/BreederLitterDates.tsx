// /breeder/litters/:litterId/dates
//
// Edit the litter's date of birth + ready_date. The DB trigger
// propagate_litter_ready_date fans the ready_date change out to every
// linked puppy whose own ready_date hasn't been manually overridden —
// matching Carlos's stated requirement that "updating the litter's date
// updates all the puppies tied to that litter automatically."

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { loadBreederHome, updateLitterDates } from "@/lib/breeder/api";

const HOME_QK = ["breeder", "home"] as const;
const PUPPIES_QK = (litterId: string) => ["breeder", "litterPuppies", litterId] as const;

export default function BreederLitterDates() {
  const { litterId } = useParams<{ litterId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useBreederAuth();

  const { data: home, isLoading } = useQuery({
    queryKey: HOME_QK,
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await loadBreederHome(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const row = useMemo(
    () => home?.find((r) => r.upcoming_litter_id === litterId),
    [home, litterId],
  );

  if (isLoading || !row || !litterId) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <span>Litter not found.</span>}
      </div>
    );
  }

  return <DatesForm row={row} litterId={litterId} onSaved={() => {
    queryClient.invalidateQueries({ queryKey: HOME_QK });
    queryClient.invalidateQueries({ queryKey: PUPPIES_QK(litterId) });
    navigate(`/breeder/litters/${litterId}`, { replace: true });
  }} />;
}

function DatesForm({
  row,
  litterId,
  onSaved,
}: {
  row: {
    litter_date_of_birth: string | null;
    upcoming_date_of_birth: string | null;
    ready_date: string | null;
    total_puppies: number;
  };
  litterId: string;
  onSaved: () => void;
}) {
  const { session } = useBreederAuth();

  const initialDob = row.litter_date_of_birth ?? row.upcoming_date_of_birth ?? "";
  const initialReady = row.ready_date ?? "";

  const [dob, setDob] = useState(initialDob);
  const [ready, setReady] = useState(initialReady);

  const mut = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No session");
      const payload: { litterId: string; dateOfBirth?: string; readyDate?: string } = { litterId };
      if (dob && dob !== initialDob) payload.dateOfBirth = dob;
      if (ready && ready !== initialReady) payload.readyDate = ready;
      if (!payload.dateOfBirth && !payload.readyDate) {
        throw new Error("Change at least one date before saving");
      }
      const res = await updateLitterDates(session.token, payload);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Dates saved");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const willPropagate =
    !!ready && ready !== initialReady && row.total_puppies > 0;

  return (
    <div className="mx-auto max-w-screen-sm space-y-5 px-4 py-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Edit dates</p>
        <h1 className="text-2xl font-bold">Litter timing</h1>
        <p className="text-sm text-muted-foreground">
          Updating the ready date here will shift every puppy in this litter
          (except any with a manual override) so the public site stays in sync.
        </p>
      </header>

      <Card className="space-y-4 p-5">
        <div>
          <Label htmlFor="dob">Date of birth</Label>
          <Input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="ready">Ready by</Label>
          <Input
            id="ready"
            type="date"
            value={ready}
            min={dob || undefined}
            onChange={(e) => setReady(e.target.value)}
            className="mt-1"
          />
        </div>
        {willPropagate && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <CalendarDays className="mr-1 inline h-3 w-3" />
            Saving will update {row.total_puppies}{" "}
            {row.total_puppies === 1 ? "puppy" : "puppies"} in this litter.
          </p>
        )}
      </Card>

      <Button
        onClick={() => mut.mutate()}
        disabled={mut.isPending || (dob === initialDob && ready === initialReady)}
        className="h-12 w-full"
      >
        {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save dates
      </Button>
    </div>
  );
}
