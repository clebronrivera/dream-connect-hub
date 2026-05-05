import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PuppyInterestForm } from "@/components/PuppyInterestForm";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dog,
  Loader2,
  Info,
  ChevronDown,
  SlidersHorizontal,
  X,
  Heart,
} from "lucide-react";
import type { Puppy } from "@/lib/supabase";
import { fetchAvailablePuppies } from "@/lib/puppies-api";
import { getDisplayAgeWeeks } from "@/lib/puppy-utils";
import { getPuppyImage } from "@/lib/puppy-display-utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFavorites } from "@/hooks/use-favorites";
import { usePuppyFilters } from "@/hooks/use-puppy-filters";
import { PuppyCard } from "./PuppyCard";
import { PuppyDetailModal } from "./PuppyDetailModal";
import { PuppyShareDialog } from "./PuppyShareDialog";
import { StickerButton } from "@/components/redesign/PublicDesignPrimitives";
import { GalacticPawCanvas } from "@/components/GalacticPawCanvas";

const puppiesPageContainerClass = "mx-auto max-w-screen-2xl px-6 md:px-8";
const heroStickerCtaBaseClass =
  "group relative overflow-hidden rounded-3xl px-10 py-5 text-lg font-bold normal-case tracking-normal before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-[''] sm:px-12 sm:text-xl";
const heroPinkCtaClass =
  `${heroStickerCtaBaseClass} bg-[#ff3399] text-white shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]`;
const heroVioletCtaClass =
  `${heroStickerCtaBaseClass} bg-[#5b21b6] text-white shadow-[0_6px_0_#7c3aed,0_14px_30px_rgba(124,58,237,0.45)] hover:bg-[#7c3aed] hover:shadow-[0_6px_0_#a78bfa,0_16px_34px_rgba(167,139,250,0.5)]`;

export default function Puppies() {
  const { t } = useLanguage();
  const { id: puppyIdFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [interestFormOpen, setInterestFormOpen] = useState(false);
  const [interestFormPuppyId, setInterestFormPuppyId] = useState<string | undefined>(undefined);
  const [detailPuppy, setDetailPuppy] = useState<Puppy | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePuppy, setSharePuppy] = useState<Puppy | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [favorites, toggleFavorite] = useFavorites();

  const { data: puppies, isLoading, isError, error } = useQuery({
    queryKey: ["puppies"],
    queryFn: fetchAvailablePuppies,
  });

  const {
    categoryFilter,
    setCategoryFilter,
    sizeFilter,
    setSizeFilter,
    breedFilter,
    setBreedFilter,
    sortBy,
    setSortBy,
    filteredAndSorted,
    hasActiveFilters,
    clearFilters,
    setSearchParams,
  } = usePuppyFilters(puppies);

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

      {/* Hero Section */}
      <section
        className="relative overflow-hidden py-16 md:py-20"
        style={{
          background:
            "radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, #0f041b 80%)",
        }}
      >
        <GalacticPawCanvas className="absolute inset-0 z-0 opacity-80" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80" />
        <div className={`relative z-20 ${puppiesPageContainerClass} text-center`}>
          <h1 className="font-display text-5xl uppercase leading-[0.92] tracking-tight text-white md:text-7xl mb-4">
            {t("puppiesHeroTitle")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80 md:text-xl">
            {t("puppiesHeroDescription")}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <StickerButton size="lg" className={heroPinkCtaClass} asChild>
              <Link to="/contact" className="flex items-center justify-center gap-x-3">
                {t("puppiesInquireButton")}
              </Link>
            </StickerButton>
            <StickerButton size="lg" className={heroVioletCtaClass} asChild>
              <Link to="/upcoming-litters" className="flex items-center justify-center gap-x-3">
                {t("puppiesSeeUpcomingAnchor")}
              </Link>
            </StickerButton>
          </div>
        </div>
      </section>

      {/* Puppy names disclaimer */}
      <section className={`${puppiesPageContainerClass} py-6`}>
        <div className="rounded-r-lg border-l-4 border-cyan-400 bg-cyan-500/10 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
            <p className="text-sm text-white/85">
              <span className="font-semibold">{t("puppiesDisclaimerTitle")}</span>{" "}
              {t("puppiesDisclaimerBody")}
            </p>
          </div>
        </div>
      </section>

      {/* Filters Bar */}
      <section className="sticky top-[calc(3.5rem+2px)] z-40 border-b border-white/10 bg-[#12051f]/90 py-4 backdrop-blur">
        <div className={puppiesPageContainerClass}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <div className="flex items-center gap-2 flex-wrap">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {t("puppiesFilters")}
                    <ChevronDown
                      className={`h-4 w-4 ml-2 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <Select
                  value={sortBy}
                  onValueChange={(v) =>
                    setSortBy(v as "name" | "breed" | "price-low" | "price-high")
                  }
                >
                  <SelectTrigger className="w-[160px] border-white/25 bg-white/5 text-white">
                    <SelectValue placeholder={t("puppiesSortBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{t("puppiesSortNameAZ")}</SelectItem>
                    <SelectItem value="breed">{t("puppiesSortBreed")}</SelectItem>
                    <SelectItem value="price-low">{t("puppiesSortPriceLowHigh")}</SelectItem>
                    <SelectItem value="price-high">{t("puppiesSortPriceHighLow")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CollapsibleContent>
                <div className="mt-4 flex flex-wrap gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="space-y-2">
                    <Label className="text-xs">{t("puppiesCategory")}</Label>
                    <Select
                      value={categoryFilter}
                      onValueChange={(v) =>
                        setCategoryFilter(v as "all" | "poodle-doodle" | "small-toy")
                      }
                    >
                      <SelectTrigger className="w-[140px] border-white/25 bg-white/5 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("puppiesCategoryAll")}</SelectItem>
                        <SelectItem value="poodle-doodle">
                          {t("puppiesCategoryPoodleDoodle")}
                        </SelectItem>
                        <SelectItem value="small-toy">{t("puppiesCategorySmall")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t("puppiesSize")}</Label>
                    <Select
                      value={sizeFilter}
                      onValueChange={(v) =>
                        setSizeFilter(v as "all" | "small" | "medium" | "large")
                      }
                    >
                      <SelectTrigger className="w-[120px] border-white/25 bg-white/5 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("puppiesSizeAll")}</SelectItem>
                        <SelectItem value="small">{t("puppiesSizeSmall")}</SelectItem>
                        <SelectItem value="medium">{t("puppiesSizeMedium")}</SelectItem>
                        <SelectItem value="large">{t("puppiesSizeLarge")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-white/70 hover:text-white"
              >
                <X className="h-4 w-4 mr-1" />
                {t("puppiesClearFilters")}
              </Button>
            )}
          </div>
          <p className="text-sm text-white/70">
            {filteredAndSorted.length}{" "}
            {filteredAndSorted.length === 1
              ? t("puppiesCountSingular")
              : t("puppiesCountPlural")}
          </p>
        </div>
        {hasActiveFilters && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {breedFilter && (
              <Badge variant="secondary" className="gap-1 bg-white/10 text-white">
                Breed: {breedFilter}
                <button
                  type="button"
                  onClick={() => {
                    setBreedFilter(undefined);
                    setSearchParams({}, { replace: true });
                  }}
                  className="rounded-full p-0.5 hover:bg-muted"
                  aria-label="Remove breed filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {categoryFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 bg-white/10 text-white">
                {categoryFilter === "poodle-doodle"
                  ? t("puppiesCategoryPoodleDoodle")
                  : t("puppiesCategorySmall")}
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className="rounded-full p-0.5 hover:bg-muted"
                  aria-label="Remove filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {sizeFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 bg-white/10 text-white capitalize">
                {sizeFilter}
                <button
                  type="button"
                  onClick={() => setSizeFilter("all")}
                  className="rounded-full p-0.5 hover:bg-muted"
                  aria-label="Remove filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
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
                          Send Interest — {prePuppy.name || "Unnamed"}
                        </DialogTitle>
                        <DialogDescription>
                          {prePuppy.breed}
                          {prePuppy.gender && ` • ${prePuppy.gender}`}
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
