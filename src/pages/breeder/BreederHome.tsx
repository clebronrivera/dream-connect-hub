// /breeder — Yolanda's home screen. Four-ish litter cards from
// breeder_litter_summary, with a phone-first single-column layout.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LitterCard } from "@/components/breeder/LitterCard";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { loadBreederHome } from "@/lib/breeder/api";

const HOME_QK = ["breeder", "home"] as const;
const TICK_MS = 60_000;

export default function BreederHome() {
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
        if (res.status === 403) {
          signOut();
          navigate("/breeder/login", { replace: true });
        }
        throw new Error(res.error);
      }
      return res.data;
    },
  });

  return (
    <div className="mx-auto max-w-screen-sm space-y-4 px-4 py-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">Litters</h1>
          <p className="text-sm text-muted-foreground">
            Tap a card to update photos or confirm a birth.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isRefetching}
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
        </Button>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "Failed to load litters"}
        </div>
      )}

      {!isLoading && data && data.length === 0 && (
        <div className="rounded-md border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          No litters set up yet. Add one in /admin/upcoming-litters and it'll appear here.
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

      <div className="pt-4">
        <Button asChild variant="outline" className="w-full">
          <Link to="/breeder/parents">
            <Users className="mr-2 h-4 w-4" />
            Manage Mom &amp; Dad dogs
          </Link>
        </Button>
      </div>
    </div>
  );
}
