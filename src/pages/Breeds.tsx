import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  History,
  Lightbulb,
  X,
  Heart,
  Sparkles,
  Home as HomeIcon,
  Users,
  Activity,
  Scissors,
  Clock,
  Award,
  AlertCircle,
  Dog,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BREEDS_DATA, type Breed, type BreedStats } from "@/data/breeds-content";
import { PuppyPlaceholderSvg } from "@/components/redesign/PublicDesignPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

function BreedImage({
  imageUrl,
  breedName,
}: {
  imageUrl: string;
  breedName: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="w-full h-full relative">
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 animate-pulse flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-slate-400 animate-bounce" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center p-4 text-center">
          <span className="text-4xl mb-2">🐕</span>
          <p className="text-xs text-muted-foreground font-bold">
            Photo Coming Soon
          </p>
        </div>
      )}
      <img
        src={imageUrl}
        alt={`${breedName} portrait`}
        className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

function formatStatKey(key: string): string {
  return key.replace(/([A-Z])/g, " $1").trim();
}

export default function Breeds() {
  const { t } = useLanguage();
  const [selectedBreed, setSelectedBreed] = useState<Breed | null>(null);
  const [filter, setFilter] = useState("All");

  const filteredBreeds = useMemo(
    () =>
      BREEDS_DATA.filter(
        (breed) => filter === "All" || breed.category === filter
      ),
    [filter]
  );

  const sortedBreeds = useMemo(() => {
    const order = ["goldendoodle", "labradoodle", "toy-poodle", "shih-tzu"];
    const rank = (id: string) => {
      const i = order.indexOf(id);
      return i === -1 ? 100 : i;
    };
    return [...filteredBreeds].sort((a, b) => rank(a.id) - rank(b.id));
  }, [filteredBreeds]);

  useEffect(() => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://puppyheavenllc.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Breeds',
          item: 'https://puppyheavenllc.com/breeds',
        },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-jsonld';
    script.textContent = JSON.stringify(jsonLd);

    document.getElementById('breadcrumb-jsonld')?.remove();
    document.head.appendChild(script);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
    };
  }, []);

  return (
    <Layout>
      <Seo pageId="breeds" />
      <div className="min-h-screen bg-paper">
        <header className="container pt-12 pb-10 md:pt-16 md:pb-14">
          <p className="font-mono-dream text-[11px] font-bold uppercase tracking-[0.2em] text-inkSoft">
            {t("breedsHeroTag")}
          </p>
          <h1 className="mt-5 font-display text-5xl uppercase leading-[0.92] tracking-tight text-ink md:text-7xl lg:text-8xl">
            {t("breedsHeroTitleLine1")}
            <br />
            <span className="text-primary">{t("breedsHeroTitleLine2")}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-inkSoft md:text-xl">
            {t("breedsHeroBody")}
          </p>
          <p className="mt-4 max-w-2xl text-base text-inkSoft md:text-lg">
            {t("breedsIntroDescription")}
          </p>

          <div className="mt-10 flex flex-wrap gap-2">
            {(
              [
                { key: "All" as const, label: t("puppiesCategoryAll") },
                { key: "Poodle & Doodle" as const, label: t("puppiesCategoryPoodleDoodle") },
                { key: "Small" as const, label: t("puppiesCategorySmall") },
              ] as const
            ).map((cat) => (
              <Button
                key={cat.key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilter(cat.key)}
                className={
                  filter === cat.key
                    ? "rounded-full border-ink bg-ink px-6 font-bold text-white shadow-md hover:bg-ink hover:text-white md:px-8"
                    : "rounded-full border-line bg-white px-6 text-inkSoft hover:bg-muted/60 md:px-8"
                }
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </header>

        {/* Breed Grid */}
        <section className="container pb-16">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 xl:grid-cols-4">
            {sortedBreeds.map((breed) =>
              breed.parityCard ? (
                <div
                  key={breed.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBreed(breed)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedBreed(breed);
                    }
                  }}
                  className="group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div
                    className={cn(
                      "flex h-full flex-col rounded-[2rem] border-4 p-3 shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-active:scale-[0.99] sm:p-4",
                      breed.parityCard.frameClass,
                    )}
                  >
                    <div className="flex items-center justify-center rounded-2xl bg-white p-4 shadow-inner">
                      <PuppyPlaceholderSvg
                        hue={breed.parityCard.illustrationHue}
                        ear={breed.parityCard.illustrationEar ?? 0}
                        size={168}
                        className="max-h-[200px] w-auto"
                      />
                    </div>
                    <div className="mt-4 flex flex-1 flex-col px-1">
                      <h3 className="min-h-[3.2rem] font-display text-xl uppercase tracking-tight text-ink sm:text-2xl">
                        {breed.parityCard.displayName}
                      </h3>
                      <p className="mt-1 min-h-[1.75rem] text-xs font-bold uppercase tracking-wide text-ink sm:text-sm">
                        {breed.parityCard.statsLine}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-inkSoft">
                        {breed.parityCard.tagline}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={breed.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBreed(breed)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedBreed(breed);
                    }
                  }}
                  className="group relative flex flex-col cursor-pointer transition-all hover:-translate-y-1 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div
                    className={`relative mb-4 aspect-[4/5] overflow-hidden rounded-3xl border-4 ${breed.borderColor} shadow-lg transition-all duration-300 hover:shadow-2xl`}
                  >
                    <BreedImage imageUrl={breed.imageUrl} breedName={breed.name} />

                    {breed.hypoallergenic && (
                      <div className="absolute left-4 top-4 rounded-full bg-green-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                        Hypoallergenic
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="text-white">
                        <p className="mb-1 text-xs font-bold uppercase tracking-widest">
                          Click for Details
                        </p>
                        <div className="h-1 w-12 rounded-full bg-white" />
                      </div>
                    </div>
                  </div>

                  <div className="px-2">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="text-xl font-bold tracking-tight text-foreground">
                        {breed.name}
                      </h3>
                      <Heart className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="mb-2 text-sm font-medium leading-relaxed text-muted-foreground">
                      {breed.shortDesc}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-bold">{breed.size}</span>
                      <span>•</span>
                      <span>{breed.weight}</span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* Detail Modal */}
        <Dialog
          open={!!selectedBreed}
          onOpenChange={(open) => !open && setSelectedBreed(null)}
        >
          <DialogContent
            className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden [&>button]:hidden"
          >
            {selectedBreed && (
              <>
                <div className="flex flex-col md:flex-row">
                  {/* Left: Image */}
                  <div
                    className={`w-full md:w-5/12 h-80 md:h-[32rem] md:min-h-[32rem] relative ${selectedBreed.color} flex-shrink-0`}
                  >
                    <BreedImage
                      imageUrl={selectedBreed.imageUrl}
                      breedName={selectedBreed.name}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <div
                          className={`px-3 py-1.5 ${selectedBreed.accentColor} text-white rounded-full text-xs font-bold uppercase shadow-lg`}
                        >
                          {selectedBreed.size}
                        </div>
                        {selectedBreed.hypoallergenic && (
                          <div className="px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-bold uppercase shadow-lg">
                            Hypoallergenic
                          </div>
                        )}
                      </div>
                      <DialogHeader>
                        <DialogTitle className="text-3xl md:text-4xl font-black text-white mb-1">
                          {selectedBreed.parityCard?.displayName ?? selectedBreed.name}
                        </DialogTitle>
                      </DialogHeader>
                      <p className="text-white/90 font-medium italic text-sm">
                        {selectedBreed.temperament}
                      </p>
                    </div>
                  </div>

                  {/* Right: Content */}
                  <div className="w-full md:w-7/12 flex flex-col relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 z-10 rounded-full"
                      onClick={() => setSelectedBreed(null)}
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </Button>

                    <ScrollArea className="flex-1 max-h-[60vh] md:max-h-[32rem]">
                      <div className="p-6 md:p-10 pr-14 md:pr-14">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                          <div className="bg-muted/50 rounded-2xl p-4 text-center border">
                            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                            <div className="text-xs text-muted-foreground font-bold mb-1">
                              WEIGHT
                            </div>
                            <div className="text-sm font-bold">
                              {selectedBreed.weight}
                            </div>
                          </div>
                          <div className="bg-muted/50 rounded-2xl p-4 text-center border">
                            <Activity className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                            <div className="text-xs text-muted-foreground font-bold mb-1">
                              HEIGHT
                            </div>
                            <div className="text-sm font-bold">
                              {selectedBreed.height}
                            </div>
                          </div>
                          <div className="bg-muted/50 rounded-2xl p-4 text-center border">
                            <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                            <div className="text-xs text-muted-foreground font-bold mb-1">
                              LIFESPAN
                            </div>
                            <div className="text-sm font-bold">
                              {selectedBreed.lifespan}
                            </div>
                          </div>
                        </div>

                        {/* Stats Bars */}
                        <div className="mb-8 space-y-3">
                          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            Breed Characteristics
                          </h3>
                          {(
                            Object.entries(
                              selectedBreed.stats
                            ) as [keyof BreedStats, number][]
                          ).map(([key, val]) => (
                            <div key={key}>
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="font-bold capitalize">
                                  {formatStatKey(key)}
                                </span>
                                <span className="font-bold">{val}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${selectedBreed.accentColor} rounded-full transition-all duration-1000`}
                                  style={{ width: `${val}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* History */}
                        <div className="space-y-6 mb-8">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shrink-0">
                              <History className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold mb-2">
                                Heritage & Origin
                              </h4>
                              <p className="text-muted-foreground text-sm leading-relaxed italic">
                                &ldquo;{selectedBreed.history}&rdquo;
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-4 p-6 bg-muted/60 rounded-3xl border border-line">
                            <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                              <Lightbulb className="w-6 h-6 text-primaryDeep" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-primaryDeep mb-2">
                                Did you know?
                              </h4>
                              <p className="text-sm leading-relaxed">
                                {selectedBreed.coolFact}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Ideal For */}
                        <div className="mb-8">
                          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                            <HomeIcon className="w-4 h-4" />
                            Ideal For
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedBreed.idealFor.map((item, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-bold"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Care Requirements */}
                        <div className="mb-8 bg-muted/50 rounded-2xl p-6 border">
                          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Scissors className="w-4 h-4" />
                            Care Requirements
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                              <Activity className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                              <div>
                                <span className="font-bold">Exercise: </span>
                                <span className="text-muted-foreground">
                                  {selectedBreed.care.exercise}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Scissors className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                              <div>
                                <span className="font-bold">Grooming: </span>
                                <span className="text-muted-foreground">
                                  {selectedBreed.care.grooming}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                              <div>
                                <span className="font-bold">Training: </span>
                                <span className="text-muted-foreground">
                                  {selectedBreed.care.training}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="pt-6 border-t space-y-3">
                          <Button
                            className="w-full"
                            size="lg"
                            asChild
                          >
                            <Link
                              to={`/puppies?breed=${encodeURIComponent(selectedBreed.name)}`}
                              onClick={() => setSelectedBreed(null)}
                            >
                              <Dog className="h-5 w-5 mr-2" />
                              View Available {selectedBreed.name}s
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setSelectedBreed(null)}
                          >
                            Return to Explorer
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Static SEO section — breed descriptions for search indexing */}
        <section aria-label="About our breeds" className="container mt-8 border-t border-white/10 pt-12">
          <h2 className="mb-6 font-display text-2xl font-semibold text-white md:text-3xl">
            About the Breeds We Raise
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            {BREEDS_DATA.map((breed) => (
              <article key={breed.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-display text-lg font-semibold text-white">{breed.name}</h3>
                <p className="mt-1 text-sm text-white/80">{breed.shortDesc}</p>
                <p className="mt-3 text-sm text-white/80">
                  <strong className="text-white">Temperament:</strong> {breed.temperament}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  <strong className="text-white">History:</strong> {breed.history}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  <strong className="text-white">Fun fact:</strong> {breed.coolFact}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  <strong className="text-white">Ideal for:</strong> {breed.idealFor.join(", ")}
                </p>
                <p className="mt-2 text-xs text-white/60">
                  {breed.size} · {breed.weight} · Lifespan: {breed.lifespan}
                  {breed.hypoallergenic ? " · Hypoallergenic" : ""}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="container py-12 pb-20">
          <div className="rounded-3xl bg-bg p-8 text-center text-white shadow-sticker md:p-12">
            <h2 className="mb-2 font-display text-2xl md:text-3xl">{t("breedsFooterTitle")}</h2>
            <p className="mx-auto mb-6 max-w-xl text-white/85">
              {t("breedsFooterBody")}
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="secondary" size="lg" asChild>
                <Link to="/puppies">
                  <Dog className="mr-2 h-5 w-5" />
                  {t("breedsFooterBrowse")}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-pill border-white/50 text-white hover:bg-white/10"
                asChild
              >
                <Link to="/contact">{t("breedsFooterContact")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
