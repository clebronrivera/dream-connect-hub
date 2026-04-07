import { useState, useEffect } from "react";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dog,
  Loader2,
  Info,
  ChevronDown,
  ArrowLeft,
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
import { UpcomingLittersSection } from "@/components/upcoming/UpcomingLittersSection";

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
    retry: 2,
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

  // Open detail dialog when URL has /puppies/:id and we have data
  useEffect(() => {
    if (!puppyIdFromUrl || !puppies?.length) return;
    const puppy = puppies.find(
      (p) => String(p.id) === puppyIdFromUrl || p.id === puppyIdFromUrl
    );
    if (puppy) setDetailPuppy(puppy);
  }, [puppyIdFromUrl, puppies]);

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
            ? `${puppyForSeo.breed}${puppyForSeo.gender ? ` • ${puppyForSeo.gender}` : ""}. Available at Puppy Heaven.`
            : undefined
        }
        canonicalPath={puppyForSeo ? `/puppies/${puppyForSeo.id}` : undefined}
        imageUrl={puppyForSeo ? getPuppyImage(puppyForSeo) ?? undefined : undefined}
      />

      {/* Breadcrumb / Navigation */}
      <section className="border-b bg-muted/30">
        <div className="container py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Available Puppies</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2 mt-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("puppiesBackToSite")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Dog className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">
            {t("puppiesHeroTitle")}
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t("puppiesHeroDescription")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-6">
            <Button size="lg" variant="secondary" className="text-foreground" asChild>
              <Link to="/contact">{t("puppiesInquireButton")}</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground bg-transparent hover:bg-primary-foreground/10" asChild>
              <Link to="#upcoming-litters">{t("puppiesSeeUpcomingAnchor")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Puppy names disclaimer */}
      <section className="container py-6">
        <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-400 rounded-r-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-semibold">{t("puppiesDisclaimerTitle")}</span>{" "}
              {t("puppiesDisclaimerBody")}
            </p>
          </div>
        </div>
      </section>

      {/* Filters Bar */}
      <section className="container py-4 sticky top-[calc(3.5rem+2px)] z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <div className="flex items-center gap-2 flex-wrap">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
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
                  <SelectTrigger className="w-[160px]">
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
                <div className="flex flex-wrap gap-4 mt-4 p-4 rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label className="text-xs">{t("puppiesCategory")}</Label>
                    <Select
                      value={categoryFilter}
                      onValueChange={(v) =>
                        setCategoryFilter(v as "all" | "poodle-doodle" | "small-toy")
                      }
                    >
                      <SelectTrigger className="w-[140px]">
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
                      <SelectTrigger className="w-[120px]">
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
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                {t("puppiesClearFilters")}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredAndSorted.length}{" "}
            {filteredAndSorted.length === 1
              ? t("puppiesCountSingular")
              : t("puppiesCountPlural")}
          </p>
        </div>
        {hasActiveFilters && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {breedFilter && (
              <Badge variant="secondary" className="gap-1">
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
              <Badge variant="secondary" className="gap-1">
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
              <Badge variant="secondary" className="gap-1 capitalize">
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
      </section>

      {/* Available Puppies */}
      <section className="container py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">{t("puppiesLoading")}</span>
          </div>
        ) : isError ? (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
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
          <div className="bg-muted/50 rounded-lg p-12 text-center">
            <Dog className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t("puppiesNoMatchTitle")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{t("puppiesNoMatchBody")}</p>
            <Button variant="outline" onClick={clearFilters}>
              {t("puppiesClearFilters")}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              {t("puppiesNoAvailableAtAll")}
            </p>
            <Button variant="link" onClick={() => openInterestForm()}>
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
                  const img = prePuppy.primary_photo ?? prePuppy.photos?.[0];
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

      <section id="upcoming-litters" className="scroll-mt-24 bg-muted/40 border-t py-16">
        <div className="container">
          <UpcomingLittersSection embedded />
        </div>
      </section>
    </Layout>
  );
}
