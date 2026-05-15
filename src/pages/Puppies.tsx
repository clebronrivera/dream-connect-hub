import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PuppyInterestForm } from "@/components/PuppyInterestForm";
import { Dog, Loader2, Info, Heart } from "lucide-react";
import type { Puppy } from "@/lib/supabase";
import { fetchAvailablePuppies } from "@/lib/puppies-api";
import { getDisplayAgeWeeks } from "@/lib/puppy-utils";
import { getPuppyImage } from "@/lib/puppy-display-utils";
import { normalizeBreedToCanonical } from "@/lib/breed-utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFavorites } from "@/hooks/use-favorites";
import { usePuppyFilters } from "@/hooks/use-puppy-filters";
import { PuppyCard } from "./PuppyCard";
import { PuppyDetailModal } from "./PuppyDetailModal";
import { PuppyShareDialog } from "./PuppyShareDialog";
import { GalacticPawCanvas } from "@/components/GalacticPawCanvas";

const puppiesPageContainerClass = "mx-auto max-w-screen-2xl px-6 md:px-8";

const breedPillBaseClass =
  "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition";
const breedPillActiveClass =
  "border-transparent bg-[#ff3399] text-white shadow-[0_4px_0_#ff66b3]";
const breedPillInactiveClass =
  "border-white/25 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10";

export default function Puppies() {
  const { t } = useLanguage();
  const { id: puppyIdFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [interestFormOpen, setInterestFormOpen] = useState(false);
  const [interestFormPuppyId, setInterestFormPuppyId] = useState<string | undefined>(undefined);
  const [detailPuppy, setDetailPuppy] = useState<Puppy | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePuppy, setSharePuppy] = useState<Puppy | null>(null);

  const [favorites, toggleFavorite] = useFavorites();

  const { data: puppies, isLoading, isError, error } = useQuery({
    queryKey: ["puppies"],
    queryFn: fetchAvailablePuppies,
  });

  const {
    breedFilter,
    setBreedFilter,
    sortBy,
    setSortBy,
    filteredAndSorted,
    clearFilters,
  } = usePuppyFilters(puppies);

  // Pills are dynamic — only show breeds currently represented in the
  // Available inventory. Order matches MAIN_BREEDS by way of insertion.
  const availableBreedPills = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const p of puppies ?? []) {
      const canonical = normalizeBreedToCanonical(p.breed || "").trim();
      if (!canonical || seen.has(canonical)) continue;
      seen.add(canonical);
      ordered.push(canonical);
    }
    ordered.sort((a, b) => a.localeCompare(b));
    return ordered;
  }, [puppies]);

  // Open detail dialog when URL has /puppies/:id and we have data (adjust state during render)
  const detailSyncKey = `${puppyIdFromUrl ?? ''}|${puppies?.length ?? 0}`;
  const [prevDetailSyncKey, setPrevDetailSyncKey] = useState(detailSyncKey);
  if (detailSyncKey !== prevDetailSyncKey) {
    setPrevDetailSyncKey(detailSyncKey);
    if (puppyIdFromUrl && puppies?.length) {
      const puppy = puppies.find(
        (p) => String(p.id) === puppyIdFromUrl || p.id === puppyIdFromUrl
      );
      if (puppy) setDetailPuppy(puppy);
    }
  }

  const openInterestForm = (puppyId?: string) => {
    setInterestFormPuppyId(puppyId);
    setInterestFormOpen(true);
  };

  // Per-puppy SEO when viewing a shared link (/puppies/:id)
  const puppyForSeo =
    puppyIdFromUrl &&
    detailPuppy &&
    (String(detailPuppy.id) === puppyIdFromUrl || detailPuppy.id === puppyIdFromUrl)
      ? detailPuppy
      : null;

  return (
    <Layout>
      <Seo
        pageId="puppies"
        title={puppyForSeo ? `${puppyForSeo.name ?? "Puppy"} — ${puppyForSeo.breed}` : undefined}
        description={
          puppyForSeo
            ? `${puppyForSeo.breed}${puppyForSeo.gender ? ` • ${puppyForSeo.gender}` : ""}. Available at Dream Puppies.`
            : undefined
        }
        canonicalPath={puppyForSeo ? `/puppies/${puppyForSeo.id}` : undefined}
        imageUrl={puppyForSeo ? getPuppyImage(puppyForSeo) ?? undefined : undefined}
      />
      <div className="min-h-screen bg-[#0f041b] text-white">

      {/* Compact hero: H1 + disclaimer chip directly under the title. */}
      <section
        className="relative overflow-hidden py-10 md:py-12"
        style={{
          background:
            "radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, #0f041b 80%)",
        }}
      >
        <GalacticPawCanvas className="absolute inset-0 z-0 opacity-80" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80" />
        <div className={`relative z-20 ${puppiesPageContainerClass} text-center`}>
          <h1 className="font-display text-5xl uppercase leading-[0.92] tracking-tight text-white md:text-7xl">
            {t("puppiesHeroTitle")}
          </h1>
          <div className="mx-auto mt-5 max-w-3xl rounded-r-lg border-l-4 border-cyan-400 bg-cyan-500/10 p-3 text-left">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
              <p className="text-xs text-white/80 md:text-sm">
                <span className="font-semibold text-white/90">
                  {t("puppiesDisclaimerTitle")}
                </span>{" "}
                {t("puppiesDisclaimerBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pill filter row + sort + count, sticky to the page header. */}
      <section className="sticky top-[calc(3.5rem+2px)] z-40 border-b border-white/10 bg-[#12051f]/90 py-4 backdrop-blur">
        <div className={puppiesPageContainerClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="-mx-1 flex w-full gap-2 overflow-x-auto px-1 sm:flex-1">
              <button
                type="button"
                onClick={() => clearFilters()}
                className={`${breedPillBaseClass} ${
                  !breedFilter ? breedPillActiveClass : breedPillInactiveClass
                }`}
                aria-pressed={!breedFilter}
              >
                {t("puppiesAllBreedsPill")}
              </button>
              {availableBreedPills.map((breed) => {
                const active =
                  !!breedFilter &&
                  normalizeBreedToCanonical(breedFilter) === breed;
                return (
                  <button
                    key={breed}
                    type="button"
                    onClick={() => setBreedFilter(active ? undefined : breed)}
                    className={`${breedPillBaseClass} ${
                      active ? breedPillActiveClass : breedPillInactiveClass
                    }`}
                    aria-pressed={active}
                  >
                    {breed}
                  </button>
                );
              })}
            </div>
            <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
              <p className="text-sm text-white/70">
                {filteredAndSorted.length}{" "}
                {filteredAndSorted.length === 1
                  ? t("puppiesCountSingular")
                  : t("puppiesCountPlural")}
              </p>
              <Select
                value={sortBy}
                onValueChange={(v) =>
                  setSortBy(
                    v as
                      | "ready-soonest"
                      | "name"
                      | "breed"
                      | "price-low"
                      | "price-high",
                  )
                }
              >
                <SelectTrigger className="w-[170px] border-white/25 bg-white/5 text-white">
                  <SelectValue placeholder={t("puppiesSortBy")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ready-soonest">
                    {t("puppiesSortReadySoonest")}
                  </SelectItem>
                  <SelectItem value="name">{t("puppiesSortNameAZ")}</SelectItem>
                  <SelectItem value="breed">{t("puppiesSortBreed")}</SelectItem>
                  <SelectItem value="price-low">
                    {t("puppiesSortPriceLowHigh")}
                  </SelectItem>
                  <SelectItem value="price-high">
                    {t("puppiesSortPriceHighLow")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Available Puppies */}
      <section className={`${puppiesPageContainerClass} py-12`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff3399]" />
            <span className="ml-2 text-white/70">{t("puppiesLoading")}</span>
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
            <p className="mb-4 text-sm text-white/70">
              {error instanceof Error ? error.message : t("puppiesLoadErrorFallback")}
            </p>
            <Button asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        ) : filteredAndSorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSorted.map((puppy, index) => (
              <PuppyCard
                key={puppy.id}
                puppy={puppy}
                index={index}
                isFav={favorites.has(String(puppy.id))}
                onToggleFavorite={() => toggleFavorite(String(puppy.id))}
                onOpenDetail={() => {
                  const id = puppy.id ?? puppy.puppy_id;
                  if (id) navigate(`/puppies/${encodeURIComponent(String(id))}`);
                  setDetailPuppy(puppy);
                }}
                onShare={() => {
                  setSharePuppy(puppy);
                  setShareDialogOpen(true);
                }}
                onSendInterest={() => openInterestForm(puppy.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
            <Dog className="mx-auto mb-4 h-16 w-16 text-white/35" />
            <h3 className="mb-2 font-display text-2xl uppercase tracking-tight text-white">
              {t("puppiesNoMatchTitle")}
            </h3>
            <p className="mb-4 text-sm text-white/70">{t("puppiesNoMatchBody")}</p>
            <Button variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10" onClick={clearFilters}>
              {t("puppiesClearFilters")}
            </Button>
            <p className="mt-4 text-sm text-white/70">
              {t("puppiesNoAvailableAtAll")}
            </p>
            <Button variant="link" className="text-[#ff3399] hover:text-white" onClick={() => openInterestForm()}>
              <Heart className="h-4 w-4 mr-2" />
              {t("puppiesSendInterestRecs")}
            </Button>
          </div>
        )}

        {/* Interest form dialog */}
        <Dialog open={interestFormOpen} onOpenChange={setInterestFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              {interestFormPuppyId &&
                (() => {
                  const prePuppy = puppies?.find(
                    (p) => String(p.id) === interestFormPuppyId || p.id === interestFormPuppyId
                  );
                  if (!prePuppy) return null;
                  const img = getPuppyImage(prePuppy);
                  return (
                    <div className="flex gap-4 items-start">
                      {img && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                          <img
                            src={img}
                            alt={prePuppy.name || "Puppy"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <DialogTitle>
                          Express interest in {prePuppy.name || "this puppy"}
                        </DialogTitle>
                        <DialogDescription>
                          {prePuppy.breed}
                          {prePuppy.ready_date &&
                            ` • Ready ${prePuppy.ready_date}`}
                          {getDisplayAgeWeeks(prePuppy) != null &&
                            ` • ${getDisplayAgeWeeks(prePuppy)} weeks`}
                        </DialogDescription>
                      </div>
                    </div>
                  );
                })()}
              {!interestFormPuppyId && (
                <>
                  <DialogTitle>Puppy Interest Form</DialogTitle>
                  <DialogDescription>
                    Tell us about yourself and your puppy preferences.
                  </DialogDescription>
                </>
              )}
            </DialogHeader>
            <PuppyInterestForm
              initialPuppyId={interestFormPuppyId}
              preSelectedPuppy={
                interestFormPuppyId
                  ? puppies?.find(
                      (p) =>
                        String(p.id) === interestFormPuppyId ||
                        p.id === interestFormPuppyId
                    ) ?? null
                  : null
              }
              puppies={puppies || []}
              onSuccess={() => setInterestFormOpen(false)}
              submitLabel="Send Interest"
              compact
            />
          </DialogContent>
        </Dialog>

        <PuppyDetailModal
          puppy={detailPuppy}
          open={!!detailPuppy}
          onClose={() => {
            setDetailPuppy(null);
            setShareDialogOpen(false);
            navigate("/puppies", { replace: true });
          }}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onShareClick={() => setShareDialogOpen(true)}
          onSendInterest={(id) => openInterestForm(id)}
        />

        <PuppyShareDialog
          open={shareDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setShareDialogOpen(false);
              setSharePuppy(null);
            }
          }}
          puppy={sharePuppy ?? detailPuppy}
        />
      </section>

      </div>
    </Layout>
  );
}
