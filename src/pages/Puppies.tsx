import { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Heart,
  Loader2,
  Info,
  ChevronDown,
  Share2,
  ArrowLeft,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { supabase, Puppy } from "@/lib/supabase";
import { appEnv } from "@/lib/env";
import { getDisplayAgeWeeks } from "@/lib/puppy-utils";
import { normalizeBreedToCanonical } from "@/lib/breed-utils";

const FAVORITES_KEY = "puppy-heaven-favorites";

// Fetch only Available puppies for public/customer list
async function fetchPuppies(): Promise<Puppy[]> {
  const { data, error } = await supabase
    .from("puppies")
    .select("*")
    .eq("status", "Available")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching puppies from Supabase:", error);
    throw new Error(`Failed to load puppies: ${error.message}`);
  }

  return data || [];
}

// Derive size from mom/dad weight (lbs)
function getSizeCategory(puppy: Puppy): "small" | "medium" | "large" | null {
  const mom = puppy.mom_weight_approx ?? 0;
  const dad = puppy.dad_weight_approx ?? 0;
  const avg = mom && dad ? (mom + dad) / 2 : mom || dad;
  if (!avg) return null;
  if (avg < 15) return "small";
  if (avg < 45) return "medium";
  return "large";
}

// Check if breed matches "Poodle & Doodle" category
function isPoodleOrDoodle(breed: string): boolean {
  const b = (breed || "").toLowerCase();
  return b.includes("poodle") || b.includes("doodle") || b.includes("goldendoodle") || b.includes("labradoodle");
}

// Check if breed matches "Small" category (small/toy breeds)
function isSmallBreed(breed: string): boolean {
  const b = (breed || "").toLowerCase();
  return (
    b.includes("maltese") ||
    b.includes("chihuahua") ||
    b.includes("yorkshire") ||
    b.includes("toy") ||
    b.includes("mini") ||
    b.includes("shih tzu") ||
    b.includes("pomeranian") ||
    b.includes("papillon")
  );
}

function useFavorites(): [Set<string>, (id: string) => void] {
  const [favs, setFavs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  const toggle = useCallback((id: string) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore localStorage errors (e.g. private mode)
      }
      return next;
    });
  }, []);

  return [favs, toggle];
}

type CategoryFilter = "all" | "poodle-doodle" | "small-toy";
type SizeFilter = "all" | "small" | "medium" | "large";
type SortOption = "name" | "breed" | "price-low" | "price-high";

export default function Puppies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const breedFromUrl = searchParams.get("breed")?.trim() || undefined;

  const [interestFormOpen, setInterestFormOpen] = useState(false);
  const [interestFormPuppyId, setInterestFormPuppyId] = useState<string | undefined>(undefined);
  const [detailPuppy, setDetailPuppy] = useState<Puppy | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all");
  const [breedFilter, setBreedFilter] = useState<string | undefined>(breedFromUrl);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favorites, toggleFavorite] = useFavorites();

  useEffect(() => {
    if (breedFromUrl) setBreedFilter(breedFromUrl);
  }, [breedFromUrl]);

  const { data: puppies, isLoading, isError, error } = useQuery({
    queryKey: ["puppies"],
    queryFn: fetchPuppies,
    retry: 2,
  });

  const filteredAndSorted = useMemo(() => {
    if (!puppies) return [];
    let list = [...puppies];

    // Breed filter (from URL or manual); match old records to canonical breeds
    if (breedFilter) {
      const b = breedFilter.toLowerCase();
      list = list.filter((p) => {
        const raw = (p.breed || "").toLowerCase();
        const canonical = normalizeBreedToCanonical(p.breed || "").toLowerCase();
        return raw.includes(b) || canonical.includes(b);
      });
    }

    // Category filter
    if (categoryFilter === "poodle-doodle") {
      list = list.filter((p) => isPoodleOrDoodle(p.breed || ""));
    } else if (categoryFilter === "small-toy") {
      list = list.filter((p) => isSmallBreed(p.breed || ""));
    }

    // Size filter
    if (sizeFilter !== "all") {
      list = list.filter((p) => getSizeCategory(p) === sizeFilter);
    }

    // Sort
    list.sort((a, b) => {
      const priceA = a.final_price ?? a.base_price ?? 0;
      const priceB = b.final_price ?? b.base_price ?? 0;
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "breed":
          return (a.breed || "").localeCompare(b.breed || "");
        case "price-low":
          return Number(priceA) - Number(priceB);
        case "price-high":
          return Number(priceB) - Number(priceA);
        default:
          return 0;
      }
    });

    return list;
  }, [puppies, breedFilter, categoryFilter, sizeFilter, sortBy]);

  const hasActiveFilters =
    categoryFilter !== "all" || sizeFilter !== "all" || Boolean(breedFilter);

  const clearFilters = () => {
    setCategoryFilter("all");
    setSizeFilter("all");
    setBreedFilter(undefined);
    setSearchParams({}, { replace: true });
  };

  const openInterestForm = (puppyId?: string) => {
    setInterestFormPuppyId(puppyId);
    setInterestFormOpen(true);
  };

  const getPuppyImage = (puppy: Puppy) => {
    if (puppy.primary_photo) return puppy.primary_photo;
    if (puppy.photos && puppy.photos.length > 0) return puppy.photos[0];
    return null;
  };

  const getDisplayPrice = (puppy: Puppy) => {
    if (puppy.final_price) return puppy.final_price;
    if (puppy.base_price) return puppy.base_price;
    return null;
  };

  const handleShare = useCallback(async (puppy: Puppy) => {
    const url = `${window.location.origin}/puppies`;
    const text = `Check out ${puppy.name || "this puppy"} — ${puppy.breed} at Puppy Heaven!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${puppy.name} - Puppy Heaven`,
          text,
          url,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          navigator.clipboard?.writeText(`${text} ${url}`);
        }
      }
    } else {
      navigator.clipboard?.writeText(`${text} ${url}`);
    }
  }, []);

  return (
    <Layout>
      <Seo pageId="puppies" />
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
                Back to Site
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Dog className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">Available Puppies</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Find your perfect furry companion. All our puppies are health-checked, vaccinated, and raised with love.
          </p>
          <Button size="lg" variant="secondary" className="mt-6 text-foreground" asChild>
            <Link to="/contact">Inquire About a Puppy</Link>
          </Button>
        </div>
      </section>

      {/* Puppy names disclaimer */}
      <section className="container py-6">
        <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-400 rounded-r-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-semibold">Please Note:</span> The names displayed for each puppy are for
              communication and identification purposes only. Puppies are not trained to respond to these names,
              allowing you the joy of naming your new family member yourself.
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
                    Filters
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name A–Z</SelectItem>
                    <SelectItem value="breed">Breed</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-4 mt-4 p-4 rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label className="text-xs">Category</Label>
                    <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="poodle-doodle">Poodle & Doodle</SelectItem>
                        <SelectItem value="small-toy">Small</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Size</Label>
                    <Select value={sizeFilter} onValueChange={(v) => setSizeFilter(v as SizeFilter)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredAndSorted.length} {filteredAndSorted.length === 1 ? "puppy" : "puppies"}
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
                {categoryFilter === "poodle-doodle" ? "Poodle & Doodle" : "Small"}
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
            <span className="ml-2 text-muted-foreground">Loading puppies...</span>
          </div>
        ) : isError ? (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Unable to load puppies at this time. Please try again later or contact us directly.
            </p>
            {appEnv.isDev && error && error instanceof Error && (
              <p className="text-xs text-muted-foreground mb-4 font-mono break-all">Error: {error.message}</p>
            )}
            <Button asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        ) : filteredAndSorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSorted.map((puppy, index) => {
              const imageUrl = getPuppyImage(puppy);
              const price = getDisplayPrice(puppy);
              const status = puppy.status || "Unknown";
              const isAvailable = status === "Available";
              const id = String(puppy.id);
              const isFav = favorites.has(id);
              const sizeCat = getSizeCategory(puppy);

              return (
                <Card
                  key={puppy.id}
                  className="overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                  onClick={() => setDetailPuppy(puppy)}
                >
                  <div className="relative aspect-square overflow-hidden bg-muted cursor-pointer">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={puppy.name || "Puppy"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dog className="h-24 w-24 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                      {puppy.discount_active && puppy.discount_amount != null && Number(puppy.discount_amount) > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs shrink-0">
                          ${Number(puppy.discount_amount).toLocaleString()} OFF
                        </Badge>
                      )}
                      <div className="flex gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            isAvailable ? "bg-primary/90 text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {status}
                        </span>
                        {sizeCat && (
                          <Badge variant="secondary" className="capitalize text-xs">
                            {sizeCat}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(id);
                      }}
                      className="absolute top-2 left-2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
                      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart
                        className={`h-5 w-5 transition-colors ${isFav ? "fill-primary text-primary" : "text-muted-foreground"}`}
                      />
                    </button>
                  </div>
                  <CardHeader className="cursor-pointer" onClick={() => setDetailPuppy(puppy)}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{puppy.name || "Unnamed"}</CardTitle>
                    </div>
                    <CardDescription>
                      {puppy.breed || "Unknown Breed"}
                      {puppy.gender && ` • ${puppy.gender}`}
                      {(() => { const w = getDisplayAgeWeeks(puppy); return w != null && ` • ${w} weeks`; })()}
                    </CardDescription>
                    {puppy.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{puppy.description}</p>
                    )}
                  </CardHeader>
                  <CardContent onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      {price != null ? (
                        <span className="flex flex-wrap items-baseline gap-2">
                          {puppy.discount_active && (puppy.base_price != null || puppy.discount_amount != null) ? (
                            <>
                              <span className="text-sm text-muted-foreground line-through">
                                ${Number(puppy.base_price ?? price + Number(puppy.discount_amount ?? 0)).toLocaleString()}
                              </span>
                              <span className="text-2xl font-bold text-foreground">
                                ${Number(price).toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-foreground">
                              ${Number(price).toLocaleString()}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Price on request</span>
                      )}
                      <Button onClick={() => openInterestForm(puppy.id)}>
                        <Heart className="h-4 w-4 mr-2" />
                        Send Interest
                      </Button>
                    </div>
                    {puppy.discount_note && (
                      <p className="text-xs text-primary mt-2">{puppy.discount_note}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg p-12 text-center">
            <Dog className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No puppies match your filters</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your filters or clear them to see all available puppies.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <p className="text-sm text-muted-foreground mt-4">No puppies available at all?</p>
            <Button variant="link" onClick={() => openInterestForm()}>
              <Heart className="h-4 w-4 mr-2" />
              Send Interest (get recommendations)
            </Button>
          </div>
        )}

        <Dialog open={interestFormOpen} onOpenChange={setInterestFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              {interestFormPuppyId && (() => {
                const prePuppy = puppies?.find(
                  (p) => String(p.id) === interestFormPuppyId || p.id === interestFormPuppyId
                );
                if (!prePuppy) return null;
                const img = prePuppy.primary_photo ?? prePuppy.photos?.[0];
                return (
                  <div className="flex gap-4 items-start">
                    {img && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img src={img} alt={prePuppy.name || "Puppy"} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div>
                      <DialogTitle>Send Interest — {prePuppy.name || "Unnamed"}</DialogTitle>
                      <DialogDescription>
                        {prePuppy.breed}
                        {prePuppy.gender && ` • ${prePuppy.gender}`}
                        {getDisplayAgeWeeks(prePuppy) != null && ` • ${getDisplayAgeWeeks(prePuppy)} weeks`}
                      </DialogDescription>
                    </div>
                  </div>
                );
              })()}
              {!interestFormPuppyId && (
                <>
                  <DialogTitle>Puppy Interest Form</DialogTitle>
                  <DialogDescription>Tell us about yourself and your puppy preferences.</DialogDescription>
                </>
              )}
            </DialogHeader>
            <PuppyInterestForm
              initialPuppyId={interestFormPuppyId}
              preSelectedPuppy={
                interestFormPuppyId
                  ? puppies?.find(
                      (p) => String(p.id) === interestFormPuppyId || p.id === interestFormPuppyId
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

        {/* Detail Modal */}
        <Dialog open={!!detailPuppy} onOpenChange={(open) => !open && setDetailPuppy(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {detailPuppy && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <DialogTitle className="text-2xl">{detailPuppy.name || "Unnamed"}</DialogTitle>
                      <DialogDescription>
                        {detailPuppy.breed || "Unknown Breed"}
                        {detailPuppy.gender && ` • ${detailPuppy.gender}`}
                        {detailPuppy.color && ` • ${detailPuppy.color}`}
                        {(() => { const w = getDisplayAgeWeeks(detailPuppy); return w != null && ` • ${w} weeks`; })()}
                      </DialogDescription>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleShare(detailPuppy)}
                        aria-label="Share"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleFavorite(String(detailPuppy.id))}
                        aria-label={favorites.has(String(detailPuppy.id)) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart
                          className={`h-4 w-4 ${favorites.has(String(detailPuppy.id)) ? "fill-primary text-primary" : ""}`}
                        />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {getPuppyImage(detailPuppy) ? (
                      <img
                        src={getPuppyImage(detailPuppy)!}
                        alt={detailPuppy.name || "Puppy"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dog className="h-24 w-24 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex gap-2">
                      {getSizeCategory(detailPuppy) && (
                        <Badge>{getSizeCategory(detailPuppy)}</Badge>
                      )}
                      {isPoodleOrDoodle(detailPuppy.breed || "") && (
                        <Badge variant="secondary">Poodle & Doodle</Badge>
                      )}
                      {isSmallBreed(detailPuppy.breed || "") && (
                        <Badge variant="secondary">Small</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {detailPuppy.description && (
                      <p className="text-muted-foreground">{detailPuppy.description}</p>
                    )}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Health Certificate</span>
                        <span>Yes</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-700 ease-out"
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vaccinations</span>
                        <span>First round included</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-700 ease-out"
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Microchipped</span>
                        <span>{detailPuppy.microchipped ? "Yes" : "No"}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-700 ease-out"
                          style={{ width: detailPuppy.microchipped ? "100%" : "0%" }}
                        />
                      </div>
                    </div>
                    <div className="pt-4">
                      {getDisplayPrice(detailPuppy) != null ? (
                        <p className="mb-2 flex flex-wrap items-baseline gap-2">
                          {detailPuppy.discount_active && (detailPuppy.base_price != null || detailPuppy.discount_amount != null) ? (
                            <>
                              <span className="text-sm text-muted-foreground line-through">
                                $
                                {Number(
                                  detailPuppy.base_price ??
                                    Number(getDisplayPrice(detailPuppy)) + Number(detailPuppy.discount_amount ?? 0)
                                ).toLocaleString()}
                              </span>
                              <span className="text-2xl font-bold text-foreground">
                                ${Number(getDisplayPrice(detailPuppy)).toLocaleString()}
                              </span>
                              {detailPuppy.discount_amount != null && Number(detailPuppy.discount_amount) > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  ${Number(detailPuppy.discount_amount).toLocaleString()} OFF
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-foreground">
                              ${Number(getDisplayPrice(detailPuppy)).toLocaleString()}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-muted-foreground mb-2">Price on request</p>
                      )}
                      <Button className="w-full" onClick={() => openInterestForm(detailPuppy.id)}>
                        <Heart className="h-4 w-4 mr-2" />
                        Send Interest
                      </Button>
                      <Button variant="outline" className="w-full mt-2" asChild>
                        <Link to="/contact">Contact Us</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </section>
    </Layout>
  );
}
