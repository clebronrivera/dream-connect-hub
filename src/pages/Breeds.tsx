import { useState, useMemo } from "react";
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
import { appEnv } from "@/lib/env";

const SUPABASE_STORAGE_BASE =
  (appEnv.supabaseUrl ?? "").replace(/\/$/, "") +
  "/storage/v1/object/public/site-assets";

interface BreedStats {
  intelligence: number;
  energy: number;
  grooming: number;
  familyFriendly: number;
  apartmentLiving: number;
}

interface BreedCare {
  exercise: string;
  grooming: string;
  training: string;
}

interface Breed {
  id: string;
  name: string;
  category: string;
  size: string;
  weight: string;
  height: string;
  lifespan: string;
  hypoallergenic: boolean;
  temperament: string;
  shortDesc: string;
  history: string;
  coolFact: string;
  idealFor: string[];
  stats: BreedStats;
  care: BreedCare;
  color: string;
  borderColor: string;
  accentColor: string;
  imageUrl: string;
}

const BREEDS_DATA: Breed[] = [
  {
    id: "toy-poodle",
    name: "Toy Poodle",
    category: "Poodle & Doodle",
    size: "Small",
    weight: "4-6 lbs",
    height: "Under 10\"",
    lifespan: "12-15 years",
    hypoallergenic: true,
    temperament: "Intelligent, Trainable, Active, Proud",
    shortDesc: "Smart, Agile, Self-Confident",
    history:
      "While the Poodle is the national dog of France, it actually originated in Germany as a water retriever. The \"Small\" variety was bred in the early 20th century in England and America to be a city companion for affluent families who wanted a smaller, more portable version of the beloved Standard Poodle.",
    coolFact:
      "Poodles are remarkably athletic and were originally used for duck hunting in Germany. Their famous \"pompom\" haircut wasn't just for show—it was actually designed to protect their vital organs and joints in cold water while reducing drag when swimming!",
    idealFor: [
      "City dwellers",
      "Apartment living",
      "First-time owners",
      "People with allergies",
    ],
    stats: {
      intelligence: 98,
      energy: 70,
      grooming: 90,
      familyFriendly: 85,
      apartmentLiving: 95,
    },
    care: {
      exercise: "30-60 min daily",
      grooming: "Professional every 4-6 weeks",
      training: "Highly intelligent, needs mental stimulation",
    },
    color: "bg-amber-100",
    borderColor: "border-amber-400",
    accentColor: "bg-amber-500",
    imageUrl: `${SUPABASE_STORAGE_BASE}/mini%20poodle.jpg`,
  },
  {
    id: "standard-poodle",
    name: "Standard Poodle",
    category: "Poodle & Doodle",
    size: "Large",
    weight: "45-70 lbs",
    height: "Over 15\"",
    lifespan: "12-15 years",
    hypoallergenic: true,
    temperament: "Dignified, Intelligent, Athletic, Loyal",
    shortDesc: "Elegant, Smart, Versatile",
    history:
      "One of the oldest breeds specifically developed for hunting waterfowl in Germany over 400 years ago. Their name comes from the German word \"pudeln,\" which means \"to splash in water.\" They were later refined in France, where they became the national dog and a symbol of elegance.",
    coolFact:
      "Standard Poodles rank as the 2nd most intelligent dog breed in the world! They're highly successful as service dogs, guide dogs, therapy dogs, and even circus performers due to their exceptional learning capacity.",
    idealFor: [
      "Active families",
      "Experienced owners",
      "Those with yards",
      "People with allergies",
    ],
    stats: {
      intelligence: 100,
      energy: 85,
      grooming: 95,
      familyFriendly: 95,
      apartmentLiving: 50,
    },
    care: {
      exercise: "60-90 min daily",
      grooming: "Professional every 4-6 weeks",
      training: "Needs consistent mental/physical stimulation",
    },
    color: "bg-slate-100",
    borderColor: "border-slate-400",
    accentColor: "bg-slate-600",
    imageUrl: `${SUPABASE_STORAGE_BASE}/standard%20poodle.jpeg`,
  },
  {
    id: "labradoodle",
    name: "Labradoodle",
    category: "Poodle & Doodle",
    size: "Medium-Large",
    weight: "30-65 lbs",
    height: "14-24\"",
    lifespan: "12-14 years",
    hypoallergenic: true,
    temperament: "Friendly, Energetic, Goofy, Social",
    shortDesc: "Playful, Loving, Energetic",
    history:
      "The Labradoodle was first popularized in 1989 by Australian breeder Wally Conron, who worked for the Royal Guide Dog Association. He wanted to create a hypoallergenic guide dog for a blind woman whose husband had severe allergies.",
    coolFact:
      "No two Labradoodles are exactly alike! Their coats can range from \"hair\" (straight), to \"fleece\" (soft waves), to \"wool\" (tight curls). The fleece coat is most sought-after and considered most hypoallergenic.",
    idealFor: [
      "Active families",
      "First-time owners",
      "People with allergies",
      "Social households",
    ],
    stats: {
      intelligence: 90,
      energy: 95,
      grooming: 75,
      familyFriendly: 98,
      apartmentLiving: 60,
    },
    care: {
      exercise: "60-90 min daily",
      grooming: "Brush 2-3x weekly, pro groom 6-8 weeks",
      training: "Easy to train, eager to please",
    },
    color: "bg-yellow-100",
    borderColor: "border-yellow-400",
    accentColor: "bg-yellow-500",
    imageUrl: `${SUPABASE_STORAGE_BASE}/labordoodle.jpg`,
  },
  {
    id: "goldendoodle",
    name: "Goldendoodle",
    category: "Poodle & Doodle",
    size: "Medium-Large",
    weight: "30-70 lbs",
    height: "13-24\"",
    lifespan: "10-15 years",
    hypoallergenic: true,
    temperament: "Gentle, Patient, Social, Affectionate",
    shortDesc: "Sweet, Loyal, Family-Oriented",
    history:
      "Appearing first in the 1990s, the Goldendoodle was bred to be the \"ultimate\" family dog, combining the Golden Retriever's legendary patience and loyalty with the Poodle's intelligence and low-shedding coat.",
    coolFact:
      "They're known as \"Velcro dogs\"—they love their humans so much they follow them room to room! Goldendoodles are exceptional therapy dogs due to their intuitive nature and ability to sense human emotions.",
    idealFor: [
      "Families with kids",
      "Therapy work",
      "First-time owners",
      "Multi-pet homes",
    ],
    stats: {
      intelligence: 92,
      energy: 80,
      grooming: 80,
      familyFriendly: 100,
      apartmentLiving: 65,
    },
    care: {
      exercise: "45-75 min daily",
      grooming: "Brush 2-3x weekly, pro groom 6-8 weeks",
      training: "Gentle positive reinforcement",
    },
    color: "bg-orange-100",
    borderColor: "border-orange-400",
    accentColor: "bg-orange-500",
    imageUrl: `${SUPABASE_STORAGE_BASE}/goldendoodle.jpg`,
  },
  {
    id: "shih-tzu",
    name: "Shih Tzu",
    category: "Small",
    size: "Small",
    weight: "9-16 lbs",
    height: "8-11\"",
    lifespan: "10-18 years",
    hypoallergenic: true,
    temperament: "Affectionate, Happy, Outgoing, Loyal",
    shortDesc: "Loving, Gentle, Regal",
    history:
      "Known as the \"Lion Dog,\" Shih Tzus lived for centuries behind the walls of the Chinese Imperial Palace as treasured companions during the Ming Dynasty. Every Shih Tzu today can be traced back to just 14 dogs saved by European breeders.",
    coolFact:
      "Chinese Emperors kept these tiny dogs inside their sleeves to keep their hands warm during winter! The name \"Shih Tzu\" means \"little lion\" in Mandarin, referring to their lion-like appearance in Buddhist mythology.",
    idealFor: [
      "Seniors",
      "Apartment dwellers",
      "Low-energy homes",
      "Gentle families",
    ],
    stats: {
      intelligence: 55,
      energy: 30,
      grooming: 85,
      familyFriendly: 90,
      apartmentLiving: 100,
    },
    care: {
      exercise: "20-30 min daily",
      grooming: "Daily brushing or puppy cut",
      training: "Patient, gentle approach needed",
    },
    color: "bg-rose-50",
    borderColor: "border-rose-300",
    accentColor: "bg-rose-400",
    imageUrl: `${SUPABASE_STORAGE_BASE}/shih%20tzu.jpg`,
  },
  {
    id: "pomeranian",
    name: "Pomeranian",
    category: "Small",
    size: "Small",
    weight: "3-7 lbs",
    height: "6-7\"",
    lifespan: "12-16 years",
    hypoallergenic: false,
    temperament: "Bold, Lively, Curious, Extroverted",
    shortDesc: "Spirited, Alert, Confident",
    history:
      "Pomeranians were once 30-pound herding dogs in Germany and Poland. Queen Victoria fell in love with a small one in Italy in the 1800s, sparking a trend to breed them smaller. She reduced their size by 50% during her lifetime.",
    coolFact:
      "Michelangelo had a Pomeranian by his side while painting the Sistine Chapel! Despite their tiny size, Poms think they're much larger and will fearlessly protect their families. They've been owned by Mozart, Marie Antoinette, and more.",
    idealFor: [
      "Singles & couples",
      "Seniors",
      "City apartments",
      "Alert watchdog seekers",
    ],
    stats: {
      intelligence: 80,
      energy: 60,
      grooming: 85,
      familyFriendly: 75,
      apartmentLiving: 98,
    },
    care: {
      exercise: "20-30 min daily",
      grooming: "Brush 2-3x weekly, seasonal shedding",
      training: "Smart but independent",
    },
    color: "bg-orange-50",
    borderColor: "border-orange-300",
    accentColor: "bg-orange-400",
    imageUrl: `${SUPABASE_STORAGE_BASE}/pomeranian.jpg`,
  },
  {
    id: "maltese",
    name: "Maltese",
    category: "Small",
    size: "Small",
    weight: "4-7 lbs",
    height: "7-9\"",
    lifespan: "12-15 years",
    hypoallergenic: true,
    temperament: "Gentle, Playful, Fearless, Affectionate",
    shortDesc: "Elegant, Sweet, Devoted",
    history:
      "One of the oldest toy breeds, dating back 2,000 years to ancient Malta. Ancient Greeks built tombs for their Maltese dogs. Called \"The Ye Ancient Dogge of Malta,\" they were treasured by aristocrats and royalty across Europe for centuries.",
    coolFact:
      "Maltese don't have an undercoat—they have hair like humans that grows continuously! Their pure white coat was so prized in ancient times that they were worth their weight in gold. Beloved by Mary Queen of Scots and Queen Elizabeth I.",
    idealFor: [
      "Seniors",
      "Apartment living",
      "Gentle lapdog lovers",
      "People with allergies",
    ],
    stats: {
      intelligence: 75,
      energy: 45,
      grooming: 95,
      familyFriendly: 85,
      apartmentLiving: 100,
    },
    care: {
      exercise: "20-30 min daily",
      grooming: "Daily brushing or short puppy cut",
      training: "Gentle positive methods",
    },
    color: "bg-blue-50",
    borderColor: "border-blue-300",
    accentColor: "bg-blue-400",
    imageUrl: `${SUPABASE_STORAGE_BASE}/maltese.jpg`,
  },
];

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
  const [selectedBreed, setSelectedBreed] = useState<Breed | null>(null);
  const [filter, setFilter] = useState("All");

  const filteredBreeds = useMemo(
    () =>
      BREEDS_DATA.filter(
        (breed) => filter === "All" || breed.category === filter
      ),
    [filter]
  );

  return (
    <Layout>
      <Seo pageId="breeds" />
      <div className="min-h-screen">
        {/* Header Section */}
        <header className="container py-12 md:py-16 text-center">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-2xl mb-4">
            <Sparkles className="w-5 h-5 text-primary mr-2" />
            <span className="text-primary font-bold text-sm tracking-wider uppercase">
              Premium Breeds
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tight mb-4">
            Meet Our <span className="text-primary">Breeds</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our curated selection of high-pedigree companions, from
            intelligent Poodles to affectionate Small breeds.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {["All", "Poodle & Doodle", "Small"].map((cat) => (
              <Button
                key={cat}
                variant={filter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(cat)}
                className={
                  filter === cat
                    ? "rounded-full px-8 shadow-lg"
                    : "rounded-full px-8"
                }
              >
                {cat}
              </Button>
            ))}
          </div>
        </header>

        {/* Breed Grid */}
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
                  <BreedImage imageUrl={breed.imageUrl} breedName={breed.name} />

                  {breed.hypoallergenic && (
                    <div className="absolute top-4 left-4 px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-bold shadow-lg">
                      Hypoallergenic
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <div className="text-white">
                      <p className="text-xs font-bold uppercase tracking-widest mb-1">
                        Click for Details
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
                    <span className="font-bold">{breed.size}</span>
                    <span>•</span>
                    <span>{breed.weight}</span>
                  </div>
                </div>
              </div>
            ))}
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
                          {selectedBreed.name}
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

                          <div className="flex gap-4 p-6 bg-primary/5 rounded-3xl border border-primary/20">
                            <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                              <Lightbulb className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-primary mb-2">
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

        {/* Footer CTA */}
        <section className="container py-12 pb-20">
          <div className="rounded-3xl bg-primary text-primary-foreground p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Ready to Meet Your Match?</h2>
            <p className="text-primary-foreground/90 mb-6 max-w-xl mx-auto">
              Browse our available puppies or reach out to ask about upcoming
              litters.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="secondary" size="lg" asChild>
                <Link to="/puppies">
                  <Dog className="h-5 w-5 mr-2" />
                  Browse Puppies
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
