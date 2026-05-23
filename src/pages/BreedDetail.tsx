import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Activity,
  Award,
  Clock,
  Dog,
  Heart,
  History,
  Home as HomeIcon,
  Lightbulb,
  MessageCircle,
  Phone,
  Scissors,
  Users,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { BREEDS_DATA, type BreedStats } from "@/data/breeds-content";
import { BUSINESS } from "@/lib/constants/business";
import { getBreedSeoMetadata } from "@/lib/seo";
import NotFound from "@/pages/NotFound";

function formatStatKey(key: string): string {
  return key.replace(/([A-Z])/g, " $1").trim();
}

export default function BreedDetail() {
  const { slug } = useParams<{ slug: string }>();
  const breed = useMemo(() => BREEDS_DATA.find((b) => b.id === slug), [slug]);
  const seo = breed ? getBreedSeoMetadata(breed) : null;

  useEffect(() => {
    if (!breed || !seo) return;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: seo.h1,
      description: seo.description,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `https://puppyheavenllc.com${seo.path}`,
      },
      about: {
        "@type": "Thing",
        name: `${breed.name} dog breed`,
        description: breed.shortDesc,
      },
      publisher: {
        "@type": "Organization",
        name: "Dream Puppies",
        logo: {
          "@type": "ImageObject",
          url: "https://puppyheavenllc.com/dream-puppies-logo.png",
        },
      },
    };
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://puppyheavenllc.com/" },
        { "@type": "ListItem", position: 2, name: "Breeds", item: "https://puppyheavenllc.com/breeds" },
        { "@type": "ListItem", position: 3, name: breed.name, item: `https://puppyheavenllc.com${seo.path}` },
      ],
    };

    const article = document.createElement("script");
    article.type = "application/ld+json";
    article.id = "breed-article-jsonld";
    article.textContent = JSON.stringify(jsonLd);

    const crumb = document.createElement("script");
    crumb.type = "application/ld+json";
    crumb.id = "breed-breadcrumb-jsonld";
    crumb.textContent = JSON.stringify(breadcrumb);

    document.getElementById("breed-article-jsonld")?.remove();
    document.getElementById("breed-breadcrumb-jsonld")?.remove();
    document.head.appendChild(article);
    document.head.appendChild(crumb);

    return () => {
      document.getElementById("breed-article-jsonld")?.remove();
      document.getElementById("breed-breadcrumb-jsonld")?.remove();
    };
  }, [breed, seo]);

  if (!breed || !seo) {
    return <NotFound />;
  }

  const stats = Object.entries(breed.stats) as [keyof BreedStats, number][];

  return (
    <Layout>
      <Seo
        pageId="breeds"
        title={seo.title}
        description={seo.description}
        canonicalPath={seo.path}
      />
      <div className="min-h-screen bg-paper">
        <nav aria-label="Breadcrumb" className="container pt-8">
          <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-inkSoft">
            <li>
              <Link to="/" className="hover:text-ink">Home</Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/breeds" className="hover:text-ink">Breeds</Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-ink">{breed.name}</li>
          </ol>
        </nav>

        <header className="container pt-6 pb-10 md:pt-8 md:pb-14">
          <p className="font-mono-dream text-[11px] font-bold uppercase tracking-[0.2em] text-inkSoft">
            {breed.category}
          </p>
          <h1 className="mt-4 font-display text-4xl uppercase leading-[0.95] tracking-tight text-ink md:text-6xl">
            {breed.name} Puppies
            <br />
            <span className="text-primary">Family-Raised in Orlando, FL &amp; Raeford, NC</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-inkSoft md:text-xl">{breed.shortDesc}.</p>
          <p className="mt-3 max-w-2xl text-base text-inkSoft md:text-lg">{seo.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              {breed.size}
            </span>
            {breed.hypoallergenic && (
              <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Hypoallergenic
              </span>
            )}
            <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-inkSoft">
              {breed.temperament}
            </span>
          </div>
        </header>

        <section className="container pb-10">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white p-5 text-center">
              <Users className="mx-auto mb-2 h-5 w-5 text-inkSoft" />
              <div className="text-xs font-bold uppercase tracking-wide text-inkSoft">Weight</div>
              <div className="mt-1 text-base font-bold text-ink">{breed.weight}</div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5 text-center">
              <Activity className="mx-auto mb-2 h-5 w-5 text-inkSoft" />
              <div className="text-xs font-bold uppercase tracking-wide text-inkSoft">Height</div>
              <div className="mt-1 text-base font-bold text-ink">{breed.height}</div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5 text-center">
              <Clock className="mx-auto mb-2 h-5 w-5 text-inkSoft" />
              <div className="text-xs font-bold uppercase tracking-wide text-inkSoft">Lifespan</div>
              <div className="mt-1 text-base font-bold text-ink">{breed.lifespan}</div>
            </div>
          </div>
        </section>

        <section className="container pb-10">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-inkSoft">
            <Award className="h-4 w-4" />
            Breed Characteristics
          </h2>
          <div className="space-y-3 rounded-3xl border border-line bg-white p-6">
            {stats.map(([key, val]) => (
              <div key={key}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-bold capitalize text-ink">{formatStatKey(key)}</span>
                  <span className="font-bold text-ink">{val}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${breed.accentColor} rounded-full transition-all duration-1000`}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="container pb-10">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border border-line bg-white p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
                  <History className="h-5 w-5 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-ink">Heritage &amp; Origin</h2>
              </div>
              <p className="text-sm italic leading-relaxed text-inkSoft">&ldquo;{breed.history}&rdquo;</p>
            </article>

            <article className="rounded-3xl border border-line bg-muted/60 p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Lightbulb className="h-5 w-5 text-primaryDeep" />
                </div>
                <h2 className="text-lg font-bold text-primaryDeep">Did You Know?</h2>
              </div>
              <p className="text-sm leading-relaxed text-ink">{breed.coolFact}</p>
            </article>
          </div>
        </section>

        <section className="container pb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-inkSoft">
            <HomeIcon className="h-4 w-4" />
            Ideal For
          </h2>
          <ul className="flex flex-wrap gap-2">
            {breed.idealFor.map((item) => (
              <li
                key={item}
                className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="container pb-10">
          <div className="rounded-3xl border border-line bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-inkSoft">
              <Scissors className="h-4 w-4" />
              Care Requirements
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-inkSoft" />
                <div>
                  <dt className="inline font-bold text-ink">Exercise: </dt>
                  <dd className="inline text-inkSoft">{breed.care.exercise}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-inkSoft" />
                <div>
                  <dt className="inline font-bold text-ink">Grooming: </dt>
                  <dd className="inline text-inkSoft">{breed.care.grooming}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Heart className="mt-0.5 h-4 w-4 shrink-0 text-inkSoft" />
                <div>
                  <dt className="inline font-bold text-ink">Training: </dt>
                  <dd className="inline text-inkSoft">{breed.care.training}</dd>
                </div>
              </div>
            </dl>
          </div>
        </section>

        <section className="container pb-20 pt-4">
          <div className="rounded-3xl bg-bg p-8 text-center text-white shadow-sticker md:p-12">
            <h2 className="mb-2 font-display text-2xl md:text-3xl">
              Reserve your {breed.name} puppy
            </h2>
            <p className="mx-auto mb-6 max-w-xl text-white/85">
              See available {breed.name}s today, or reserve your spot in an upcoming litter. We
              raise every puppy in our family home — call or text us with any question.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="secondary" size="lg" asChild>
                <Link to={`/puppies?breed=${encodeURIComponent(breed.name)}`}>
                  <Dog className="mr-2 h-5 w-5" />
                  View available {breed.name}s
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-pill border-white/50 text-white hover:bg-white/10"
                asChild
              >
                <Link to="/upcoming-litters">See upcoming litters</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-pill border-white/50 text-white hover:bg-white/10"
                asChild
              >
                <a href={`tel:+1${BUSINESS.phoneRaw}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call {BUSINESS.phone}
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-pill border-white/50 text-white hover:bg-white/10"
                asChild
              >
                <a href={`sms:+1${BUSINESS.phoneRaw}`}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Text us
                </a>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
