import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { GalacticHomeNav } from "@/components/home/GalacticHomeNav";
import { GalacticHomeMiniFooter } from "@/components/home/GalacticHomeMiniFooter";
import { GalacticPawCanvas } from "@/components/GalacticPawCanvas";
import { supabase } from "@/lib/supabase-client";
import type { BreedingDog } from "@/lib/supabase";
import { getBreedingDogPhotoUrl } from "@/lib/puppy-photos";
import { formatDogSize } from "@/lib/breed-sizes";

const pageShellClass = "min-h-screen bg-[#0f041b] text-white";
const containerClass = "mx-auto max-w-screen-2xl px-6 md:px-8";

async function fetchPublicBreedingDogs(): Promise<BreedingDog[]> {
  const { data, error } = await supabase
    .from("breeding_dogs")
    .select("id,name,role,breed,composition,color,photo_path,bio,weight_lbs")
    .order("role", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BreedingDog[];
}

export default function OurDogs() {
  const { data: dogs, isLoading, isError } = useQuery({
    queryKey: ["public-breeding-dogs"],
    queryFn: fetchPublicBreedingDogs,
    staleTime: 5 * 60 * 1000,
  });

  const { moms, dads } = useMemo(() => {
    const list = dogs ?? [];
    return {
      moms: list.filter((d) => d.role === "Dam"),
      dads: list.filter((d) => d.role === "Sire"),
    };
  }, [dogs]);

  // Deep-link support: /our-dogs#dog-{id} (e.g. from a puppy's "meet mom/dad"
  // thumbnail) scrolls to and briefly highlights that specific dog once the
  // roster has loaded — no extra query, just an anchor into the same page.
  useEffect(() => {
    if (!dogs || dogs.length === 0) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#dog-")) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-[#ff3399]", "ring-offset-2", "ring-offset-[#0f041b]");
    const timeout = setTimeout(() => {
      el.classList.remove("ring-2", "ring-[#ff3399]", "ring-offset-2", "ring-offset-[#0f041b]");
    }, 2500);
    return () => clearTimeout(timeout);
  }, [dogs]);

  useEffect(() => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://puppyheavenllc.com" },
        { "@type": "ListItem", position: 2, name: "Our Dogs", item: "https://puppyheavenllc.com/our-dogs" },
      ],
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "our-dogs-breadcrumb-jsonld";
    script.textContent = JSON.stringify(jsonLd);
    document.getElementById("our-dogs-breadcrumb-jsonld")?.remove();
    document.head.appendChild(script);
    return () => {
      document.getElementById("our-dogs-breadcrumb-jsonld")?.remove();
    };
  }, []);

  return (
    <Layout bare>
      <Seo pageId="ourDogs" />
      <div className={pageShellClass}>
        <GalacticHomeNav />

        <section
          className="relative overflow-hidden border-b border-white/10 py-16 md:py-20"
          style={{
            background:
              "radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, #0f041b 80%)",
          }}
        >
          <GalacticPawCanvas className="absolute inset-0 z-0 opacity-80" />
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80" />
          <div className={`relative z-20 text-center ${containerClass}`}>
            <h1 className="mx-auto mb-4 max-w-4xl font-display text-4xl font-black uppercase tracking-tight md:text-6xl">
              Meet the Moms &amp; Dads
            </h1>
            <p className="mx-auto mb-2 max-w-2xl text-base leading-relaxed text-white/80 md:text-xl">
              Every Dream Puppy starts with these parents. Family-raised, health-checked, and loved every day.
            </p>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#0a0214] py-14 md:py-16">
          <div className={containerClass}>
            {isLoading && (
              <p className="text-center text-white/60">Loading our dogs…</p>
            )}
            {isError && (
              <p className="text-center text-red-300">
                Couldn’t load our dogs right now. Please refresh in a moment.
              </p>
            )}

            {!isLoading && !isError && (
              <>
                <ParentGroup title="Our Moms" dogs={moms} emoji="🌸" />
                <div className="mt-16">
                  <ParentGroup title="Our Dads" dogs={dads} emoji="🦴" />
                </div>
              </>
            )}
          </div>
        </section>

        <GalacticHomeMiniFooter />
      </div>
    </Layout>
  );
}

type ParentGroupProps = {
  title: string;
  emoji: string;
  dogs: BreedingDog[];
};

function ParentGroup({ title, emoji, dogs }: ParentGroupProps) {
  if (dogs.length === 0) {
    return (
      <div>
        <SectionHeading title={title} emoji={emoji} />
        <p className="mt-6 text-white/60">More coming soon.</p>
      </div>
    );
  }
  return (
    <div>
      <SectionHeading title={title} emoji={emoji} />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dogs.map((dog) => (
          <DogCard key={dog.id} dog={dog} />
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ title, emoji }: { title: string; emoji: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="text-3xl">
        {emoji}
      </span>
      <h2 className="font-display text-2xl font-bold md:text-3xl">{title}</h2>
    </div>
  );
}

function DogCard({ dog }: { dog: BreedingDog }) {
  const photoUrl = getBreedingDogPhotoUrl(dog.photo_path);
  const size = formatDogSize(dog.weight_lbs, dog.breed);

  return (
    <article
      id={`dog-${dog.id}`}
      className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition hover:border-white/20"
    >
      <div className="aspect-square w-full bg-[#1a0a2e]">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${dog.name} — ${dog.breed}`}
            className="h-full w-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl text-white/30">
            🐾
          </div>
        )}
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-2xl font-bold leading-none">{dog.name}</h3>
          <span className="rounded-full border border-pink-300/30 bg-pink-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-pink-200">
            {dog.role === "Dam" ? "Mom" : "Dad"}
          </span>
        </div>
        <p className="text-sm font-medium text-white/80">{dog.breed}</p>

        <div className="flex flex-wrap gap-2 pt-1">
          {dog.composition && (
            <Badge>{dog.composition}</Badge>
          )}
          {dog.color && <Badge>{dog.color}</Badge>}
          {size && <Badge>{size}</Badge>}
        </div>

        {dog.bio && (
          <p className="pt-2 text-sm leading-relaxed text-white/70">{dog.bio}</p>
        )}
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/80">
      {children}
    </span>
  );
}
