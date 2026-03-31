import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Dog,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { appEnv } from "@/lib/env";

const SUPABASE_STORAGE_BASE =
  (appEnv.supabaseUrl ?? "").replace(/\/$/, "") +
  "/storage/v1/object/public/site-assets";

type BreedStats = {
  intelligence: number;
  energy: number;
  grooming: number;
  familyFriendly: number;
  apartmentLiving: number;
};

type BreedCare = {
  exercise: string;
  grooming: string;
  training: string;
};

type BreedFilter = "all" | "poodle-doodle" | "small";

type BreedBase = {
  id: string;
  category: Exclude<BreedFilter, "all">;
  weight: string;
  height: string;
  lifespan: string;
  hypoallergenic: boolean;
  stats: BreedStats;
  color: string;
  borderColor: string;
  accentColor: string;
  imageUrl: string;
};

type BreedView = BreedBase & {
  name: string;
  categoryLabel: string;
  sizeLabel: string;
  temperament: string;
  shortDesc: string;
  history: string;
  coolFact: string;
  idealFor: string[];
  care: BreedCare;
};

const BREEDS_BASE: BreedBase[] = [
  {
    id: "toy-poodle",
    category: "poodle-doodle",
    weight: "4-6 lbs",
    height: 'Under 10"',
    lifespan: "12-15 years",
    hypoallergenic: true,
    stats: { intelligence: 98, energy: 70, grooming: 90, familyFriendly: 85, apartmentLiving: 95 },
    color: "bg-amber-100",
    borderColor: "border-amber-400",
    accentColor: "bg-amber-500",
    imageUrl: `${SUPABASE_STORAGE_BASE}/mini%20poodle.jpg`,
  },
  {
    id: "standard-poodle",
    category: "poodle-doodle",
    weight: "45-70 lbs",
    height: 'Over 15"',
    lifespan: "12-15 years",
    hypoallergenic: true,
    stats: { intelligence: 100, energy: 85, grooming: 95, familyFriendly: 95, apartmentLiving: 50 },
    color: "bg-slate-100",
    borderColor: "border-slate-400",
    accentColor: "bg-slate-600",
    imageUrl: `${SUPABASE_STORAGE_BASE}/standard%20poodle.jpeg`,
  },
  {
    id: "labradoodle",
    category: "poodle-doodle",
    weight: "30-65 lbs",
    height: '14-24"',
    lifespan: "12-14 years",
    hypoallergenic: true,
    stats: { intelligence: 90, energy: 95, grooming: 75, familyFriendly: 98, apartmentLiving: 60 },
    color: "bg-yellow-100",
    borderColor: "border-yellow-400",
    accentColor: "bg-yellow-500",
    imageUrl: `${SUPABASE_STORAGE_BASE}/labordoodle.jpg`,
  },
  {
    id: "goldendoodle",
    category: "poodle-doodle",
    weight: "30-70 lbs",
    height: '13-24"',
    lifespan: "10-15 years",
    hypoallergenic: true,
    stats: { intelligence: 92, energy: 80, grooming: 80, familyFriendly: 100, apartmentLiving: 65 },
    color: "bg-orange-100",
    borderColor: "border-orange-400",
    accentColor: "bg-orange-500",
    imageUrl: `${SUPABASE_STORAGE_BASE}/goldendoodle.jpg`,
  },
  {
    id: "shih-tzu",
    category: "small",
    weight: "9-16 lbs",
    height: '8-11"',
    lifespan: "10-18 years",
    hypoallergenic: true,
    stats: { intelligence: 55, energy: 30, grooming: 85, familyFriendly: 90, apartmentLiving: 100 },
    color: "bg-rose-50",
    borderColor: "border-rose-300",
    accentColor: "bg-rose-400",
    imageUrl: `${SUPABASE_STORAGE_BASE}/shih%20tzu.jpg`,
  },
  {
    id: "pomeranian",
    category: "small",
    weight: "3-7 lbs",
    height: '6-7"',
    lifespan: "12-16 years",
    hypoallergenic: false,
    stats: { intelligence: 80, energy: 60, grooming: 85, familyFriendly: 75, apartmentLiving: 98 },
    color: "bg-orange-50",
    borderColor: "border-orange-300",
    accentColor: "bg-orange-400",
    imageUrl: `${SUPABASE_STORAGE_BASE}/pomeranian.jpg`,
  },
  {
    id: "maltese",
    category: "small",
    weight: "4-7 lbs",
    height: '7-9"',
    lifespan: "12-15 years",
    hypoallergenic: true,
    stats: { intelligence: 75, energy: 45, grooming: 95, familyFriendly: 85, apartmentLiving: 100 },
    color: "bg-blue-50",
    borderColor: "border-blue-300",
    accentColor: "bg-blue-400",
    imageUrl: `${SUPABASE_STORAGE_BASE}/maltese.jpg`,
  },
];

function BreedImage({
  imageUrl,
  breedName,
  fallbackLabel,
}: {
  imageUrl: string;
  breedName: string;
  fallbackLabel: string;
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
          <Dog className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground font-bold">{fallbackLabel}</p>
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

export default function Breeds() {
  const { t } = useTranslation();
  const [selectedBreed, setSelectedBreed] = useState<BreedView | null>(null);
  const [filter, setFilter] = useState<BreedFilter>("all");

  const breeds = useMemo<BreedView[]>(
    () =>
      BREEDS_BASE.map((breed) => ({
        ...breed,
        name: t(`breeds.data.${breed.id}.name`),
        categoryLabel: t(
          breed.category === "poodle-doodle"
            ? "breeds.filters.poodleDoodle"
            : "breeds.filters.small"
        ),
        sizeLabel: t(`breeds.data.${breed.id}.size`),
        temperament: t(`breeds.data.${breed.id}.temperament`),
        shortDesc: t(`breeds.data.${breed.id}.shortDesc`),
        history: t(`breeds.data.${breed.id}.history`),
        coolFact: t(`breeds.data.${breed.id}.coolFact`),
        idealFor: t(`breeds.data.${breed.id}.idealFor`, { returnObjects: true }) as string[],
        care: t(`breeds.data.${breed.id}.care`, { returnObjects: true }) as BreedCare,
      })),
    [t]
  );

  const filteredBreeds = useMemo(
    () => breeds.filter((breed) => filter === "all" || breed.category === filter),
    [breeds, filter]
  );

  const filterOptions: { value: BreedFilter; label: string }[] = [
    { value: "all", label: t("breeds.filters.all") },
    { value: "poodle-doodle", label: t("breeds.filters.poodleDoodle") },
    { value: "small", label: t("breeds.filters.small") },
  ];

  const statLabels: Record<keyof BreedStats, string> = {
    intelligence: t("breeds.statLabels.intelligence"),
    energy: t("breeds.statLabels.energy"),
    grooming: t("breeds.statLabels.grooming"),
    familyFriendly: t("breeds.statLabels.familyFriendly"),
    apartmentLiving: t("breeds.statLabels.apartmentLiving"),
  };

  return (
    <Layout>
      <Seo pageId="breeds" />
      <div className="min-h-screen">
        <header className="container py-12 md:py-16 text-center">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-2xl mb-4">
            <Sparkles className="w-5 h-5 text-primary mr-2" />
            <span className="text-primary font-bold text-sm tracking-wider uppercase">
              {t("breeds.badge")}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tight mb-4">
            {t("breeds.titlePrefix")} <span className="text-primary">{t("breeds.titleHighlight")}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("breeds.description")}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(option.value)}
                className={filter === option.value ? "rounded-full px-8 shadow-lg" : "rounded-full px-8"}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </header>

        <section className="container pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredBreeds.map((breed) => (
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
                  className={`aspect-[4/5] rounded-3xl overflow-hidden border-4 ${breed.borderColor} shadow-lg hover:shadow-2xl transition-all duration-300 mb-4 relative`}
                >
                  <BreedImage
                    imageUrl={breed.imageUrl}
                    breedName={breed.name}
                    fallbackLabel={t("breeds.card.photoComingSoon")}
                  />

                  {breed.hypoallergenic && (
                    <div className="absolute top-4 left-4 px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-bold shadow-lg">
                      {t("breeds.card.hypoallergenic")}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <div className="text-white">
                      <p className="text-xs font-bold uppercase tracking-widest mb-1">
                        {t("breeds.card.clickForDetails")}
                      </p>
                      <div className="h-1 w-12 bg-white rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="px-2">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-bold text-foreground tracking-tight">
                      {breed.name}
                    </h3>
                    <Heart className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-2">
                    {breed.shortDesc}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-bold">{breed.sizeLabel}</span>
                    <span>•</span>
                    <span>{breed.weight}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Dialog open={!!selectedBreed} onOpenChange={(open) => !open && setSelectedBreed(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
            {selectedBreed && (
              <div className="flex flex-col md:flex-row">
                <div
                  className={`w-full md:w-5/12 h-80 md:h-[32rem] md:min-h-[32rem] relative ${selectedBreed.color} flex-shrink-0`}
                >
                  <BreedImage
                    imageUrl={selectedBreed.imageUrl}
                    breedName={selectedBreed.name}
                    fallbackLabel={t("breeds.card.photoComingSoon")}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div
                        className={`px-3 py-1.5 ${selectedBreed.accentColor} text-white rounded-full text-xs font-bold uppercase shadow-lg`}
                      >
                        {selectedBreed.sizeLabel}
                      </div>
                      {selectedBreed.hypoallergenic && (
                        <div className="px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-bold uppercase shadow-lg">
                          {t("breeds.card.hypoallergenic")}
                        </div>
                      )}
                    </div>
                    <DialogHeader>
                      <DialogTitle className="text-3xl md:text-4xl font-black text-white mb-1">
                        {selectedBreed.name}
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-white/90 font-medium italic text-sm">
                      {selectedBreed.temperament}
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-7/12 flex flex-col relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-10 rounded-full"
                    onClick={() => setSelectedBreed(null)}
                    aria-label={t("common.close")}
                  >
                    <X className="h-5 w-5" />
                  </Button>

                  <ScrollArea className="flex-1 max-h-[60vh] md:max-h-[32rem]">
                    <div className="p-6 md:p-10 pr-14 md:pr-14">
                      <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="bg-muted/50 rounded-2xl p-4 text-center border">
                          <Users className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                          <div className="text-xs text-muted-foreground font-bold mb-1">
                            {t("breeds.modal.weight")}
                          </div>
                          <div className="text-sm font-bold">{selectedBreed.weight}</div>
                        </div>
                        <div className="bg-muted/50 rounded-2xl p-4 text-center border">
                          <Activity className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                          <div className="text-xs text-muted-foreground font-bold mb-1">
                            {t("breeds.modal.height")}
                          </div>
                          <div className="text-sm font-bold">{selectedBreed.height}</div>
                        </div>
                        <div className="bg-muted/50 rounded-2xl p-4 text-center border">
                          <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                          <div className="text-xs text-muted-foreground font-bold mb-1">
                            {t("breeds.modal.lifespan")}
                          </div>
                          <div className="text-sm font-bold">{selectedBreed.lifespan}</div>
                        </div>
                      </div>

                      <div className="mb-8 space-y-3">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          {t("breeds.modal.characteristics")}
                        </h3>
                        {(Object.entries(selectedBreed.stats) as [keyof BreedStats, number][]).map(([key, value]) => (
                          <div key={key}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="font-bold capitalize">{statLabels[key]}</span>
                              <span className="font-bold">{value}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${selectedBreed.accentColor} rounded-full transition-all duration-1000`}
                                style={{ width: `${value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-6 mb-8">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shrink-0">
                            <History className="w-6 h-6 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold mb-2">{t("breeds.modal.heritage")}</h4>
                            <p className="text-muted-foreground text-sm leading-relaxed italic">
                              &ldquo;{selectedBreed.history}&rdquo;
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4 p-6 bg-primary/5 rounded-3xl border border-primary/20">
                          <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                            <Lightbulb className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-primary mb-2">
                              {t("breeds.modal.didYouKnow")}
                            </h4>
                            <p className="text-sm leading-relaxed">{selectedBreed.coolFact}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-8">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Heart className="w-4 h-4" />
                          {t("breeds.modal.idealFor")}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedBreed.idealFor.map((item) => (
                            <span
                              key={item}
                              className="inline-flex items-center rounded-full border bg-background px-3 py-1.5 text-sm"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mb-8">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Scissors className="w-4 h-4" />
                          {t("breeds.modal.careNeeds")}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="rounded-2xl border bg-muted/30 p-4">
                            <div className="text-xs font-bold text-muted-foreground mb-1">
                              {t("breeds.modal.exercise")}
                            </div>
                            <div className="text-sm font-medium">{selectedBreed.care.exercise}</div>
                          </div>
                          <div className="rounded-2xl border bg-muted/30 p-4">
                            <div className="text-xs font-bold text-muted-foreground mb-1">
                              {t("breeds.modal.grooming")}
                            </div>
                            <div className="text-sm font-medium">{selectedBreed.care.grooming}</div>
                          </div>
                          <div className="rounded-2xl border bg-muted/30 p-4">
                            <div className="text-xs font-bold text-muted-foreground mb-1">
                              {t("breeds.modal.training")}
                            </div>
                            <div className="text-sm font-medium">{selectedBreed.care.training}</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl bg-muted/30 p-6 border">
                        <p className="font-medium mb-4">
                          {t("breeds.modal.learnMore", { breed: selectedBreed.name })}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button asChild>
                            <Link to="/puppies">
                              <Dog className="w-4 h-4 mr-2" />
                              {t("breeds.modal.viewAvailable")}
                            </Link>
                          </Button>
                          <Button variant="outline" asChild>
                            <Link to="/contact">
                              <HomeIcon className="w-4 h-4 mr-2" />
                              {t("breeds.modal.contactUs")}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
