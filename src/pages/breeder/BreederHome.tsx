// /breeder — Landing screen. Two big action cards let Yolanda pick
// whether she's working on litters or puppies. From here she can also
// jump straight to "Add litter" without going into the litters list.

import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, PawPrint, Heart, Users, ChevronRight, Plus, Camera } from "lucide-react";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { loadBreederHome } from "@/lib/breeder/api";
import { listAllBreederPuppies } from "@/lib/breeder/api";

const HOME_QK    = ["breeder", "home"] as const;
const PUPPIES_QK = ["breeder", "allPuppies"] as const;

export default function BreederHome() {
  const { session, signOut } = useBreederAuth();
  const navigate = useNavigate();

  const { data: litters, isLoading: littersLoading } = useQuery({
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

  const { data: puppies, isLoading: puppiesLoading } = useQuery({
    queryKey: PUPPIES_QK,
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await listAllBreederPuppies(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const isLoading = littersLoading || puppiesLoading;

  const litterCount   = litters?.length ?? 0;
  const needsPhotos   = litters?.filter(l => l.puppies_missing_photos > 0).length ?? 0;
  const preBirth      = litters?.filter(l => l.lifecycle_status === "pre_birth").length ?? 0;
  const activePuppies = puppies?.filter(p => p.status !== "Sold").length ?? 0;
  const soldPuppies   = puppies?.filter(p => p.status === "Sold").length ?? 0;
  const missingPhotos = puppies?.filter(p => p.status !== "Sold" && !(p.photos?.length)).length ?? 0;

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-6 space-y-6">
      {/* ── Greeting ── */}
      <header>
        <h1 className="text-2xl font-bold">Dream Puppies</h1>
        <p className="text-sm text-muted-foreground">What are you working on today?</p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">

          {/* ── Litters card ── */}
          <button
            type="button"
            onClick={() => navigate("/breeder/litters")}
            className="group flex items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <Heart className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold">Litters</p>
              <p className="text-sm text-muted-foreground">
                {litterCount === 0
                  ? "No litters yet"
                  : `${litterCount} litter${litterCount !== 1 ? "s" : ""}${needsPhotos > 0 ? ` · ${needsPhotos} need photos` : ""}${preBirth > 0 ? ` · ${preBirth} upcoming` : ""}`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
          </button>

          {/* ── Puppies card ── */}
          <button
            type="button"
            onClick={() => navigate("/breeder/puppies")}
            className="group flex items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
              <PawPrint className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold">Puppies</p>
              <p className="text-sm text-muted-foreground">
                {activePuppies === 0 && soldPuppies === 0
                  ? "No puppies yet"
                  : `${activePuppies} active${soldPuppies > 0 ? ` · ${soldPuppies} sold` : ""}`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
          </button>

          {/* ── Update puppy pictures card ── */}
          <button
            type="button"
            onClick={() => navigate("/breeder/photos")}
            className="group flex items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
              <Camera className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold">Update puppy pictures</p>
              <p className="text-sm text-muted-foreground">
                {activePuppies === 0
                  ? "Add puppies first"
                  : `Replace or add photos${missingPhotos > 0 ? ` · ${missingPhotos} need photos` : ""}`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
          </button>

          {/* ── Parents card ── */}
          <button
            type="button"
            onClick={() => navigate("/breeder/parents")}
            className="group flex items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Users className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold">Mom &amp; Dad Dogs</p>
              <p className="text-sm text-muted-foreground">Manage breeding parents</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
          </button>

          {/* ── Quick action ── */}
          <Link
            to="/breeder/upcoming-litters/new"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/30 p-4 text-sm font-medium text-muted-foreground transition hover:bg-muted/50"
          >
            <Plus className="h-4 w-4" />
            Add an upcoming litter
          </Link>
        </div>
      )}
    </div>
  );
}
