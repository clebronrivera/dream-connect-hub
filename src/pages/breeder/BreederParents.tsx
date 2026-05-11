// /breeder/parents — list of Mom & Dad dogs, grouped by role.
//
// Single page, two sections (Moms / Dads), Plus button to add a new one.
// Tap a row to /breeder/parents/:id/edit. Photos come from the photos
// array (PR 1 migration added it); legacy photo_path stays as a fallback
// for dogs that were created in /admin before the breeder tool shipped.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Plus, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { listBreederParents, type BreederParentRow } from "@/lib/breeder/api";

const PARENTS_QK = ["breeder", "parents"] as const;

export default function BreederParents() {
  const navigate = useNavigate();
  const { session } = useBreederAuth();

  const { data = [], isLoading, error } = useQuery({
    queryKey: PARENTS_QK,
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("No session");
      const res = await listBreederParents(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const dams = useMemo(() => data.filter((d) => d.role === "Dam"), [data]);
  const sires = useMemo(() => data.filter((d) => d.role === "Sire"), [data]);

  return (
    <div className="mx-auto max-w-screen-sm space-y-5 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Mom &amp; Dad dogs</h1>
        <p className="text-sm text-muted-foreground">
          Add or update the breeding parents. New photos here flow through to
          the litter pages on the public site.
        </p>
      </header>

      <Button
        className="h-12 w-full"
        onClick={() => navigate("/breeder/parents/new")}
      >
        <Plus className="mr-2 h-5 w-5" />
        Add a new parent
      </Button>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && !isLoading && (
        <p className="text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "Failed to load parents"}
        </p>
      )}

      <Section title="Moms" dogs={dams} onSelect={(id) => navigate(`/breeder/parents/${id}/edit`)} />
      <Section title="Dads" dogs={sires} onSelect={(id) => navigate(`/breeder/parents/${id}/edit`)} />

      {!isLoading && data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No parent dogs yet.{" "}
          <Link to="/breeder/parents/new" className="underline">
            Add the first one
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  dogs,
  onSelect,
}: {
  title: string;
  dogs: BreederParentRow[];
  onSelect: (id: string) => void;
}) {
  if (dogs.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <ul className="space-y-2">
        {dogs.map((d) => {
          const thumb = d.photo_path ?? d.photos?.[0];
          return (
            <li key={d.id}>
              <Card
                role="button"
                tabIndex={0}
                onClick={() => onSelect(d.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(d.id);
                  }
                }}
                className="flex cursor-pointer items-center gap-3 p-3 transition active:scale-[0.99] hover:shadow"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {thumb ? (
                    <img src={thumb} alt={d.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{d.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {d.role}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {[d.breed, d.color].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
