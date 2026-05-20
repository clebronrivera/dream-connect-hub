// /breeder/puppies — flat list of every puppy across all litters.
//
// Accessible from the persistent bottom nav bar in BreederLayout so
// Yolanda can jump here from anywhere in the breeder portal.

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BreederPuppiesPanel } from "@/components/breeder/BreederPuppiesPanel";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { loadBreederHome } from "@/lib/breeder/api";

const HOME_QK = ["breeder", "home"] as const;

export default function BreederPuppiesPage() {
  const { session, signOut } = useBreederAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
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
      <header>
        <h1 className="text-2xl font-bold">Puppies</h1>
        <p className="text-sm text-muted-foreground">
          All puppies across every litter.
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && !isLoading && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {error instanceof Error ? error.message : "Failed to load"}
        </div>
      )}

      {!isLoading && data && <BreederPuppiesPanel home={data} />}
    </div>
  );
}
