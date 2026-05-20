// /breeder/litters — full litter list with add-litter action.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LitterCard } from "@/components/breeder/LitterCard";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { loadBreederHome } from "@/lib/breeder/api";

const HOME_QK = ["breeder", "home"] as const;
const TICK_MS = 60_000;

export default function BreederLittersPage() {
  const { session, signOut } = useBreederAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, error, isRefetching, refetch } = useQuery({
    queryKey: HOME_QK,
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await loadBreederHome(session.token);
      if (!res.ok) {
        if (res.status === 403) { signOut(); navigate("/breeder/login", { replace: true }); }
        throw new Error(res.error);
      }
      return res.data;
    },
  });

  return (
    <div className="mx-auto max-w-screen-sm space-y-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Your Litters</h1>
          <p className="text-sm text-muted-foreground">Tap a litter to manage it.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => void refetch()} disabled={isRefetching} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild size="sm">
            <Link to="/breeder/upcoming-litters/new">
              <Plus className="mr-1 h-4 w-4" />
              Add litter
            </Link>
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "Failed to load litters"}
        </div>
      )}

      {!isLoading && data && data.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No litters yet.{" "}
            <Link to="/breeder/upcoming-litters/new" className="font-medium text-primary underline">
              Add one now
            </Link>
            .
          </p>
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.map((row) => (
            <LitterCard
              key={row.upcoming_litter_id}
              row={row}
              now={now}
              onClick={() => navigate(`/breeder/litters/${row.upcoming_litter_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
