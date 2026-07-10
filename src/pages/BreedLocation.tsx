import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Truck, ShieldCheck, Phone, MessageCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { PriceIncludes } from "@/components/PriceIncludes";
import { WaitlistForm } from "@/components/WaitlistForm";
import { SERVICE_LOCATIONS, LOCATION_BREEDS } from "@/data/locations-content";
import { fetchAvailablePuppies } from "@/lib/puppies-api";
import { normalizeBreedToCanonical } from "@/lib/breed-utils";
import { getPuppyImage } from "@/lib/puppy-display-utils";
import { getBreedLocationSeoMetadata, renderLocalBusinessJsonLd, renderBreadcrumbJsonLd, DEFAULT_SITE_URL } from "@/lib/seo";
import { useBusinessInfoOrDefaults } from "@/lib/hooks/useBusinessInfo";
import NotFound from "@/pages/NotFound";

export default function BreedLocation() {
  const { breedSlug, locationSlug } = useParams<{ breedSlug: string; locationSlug: string }>();
  const businessInfo = useBusinessInfoOrDefaults();

  const location = useMemo(
    () => SERVICE_LOCATIONS.find((l) => l.slug === locationSlug),
    [locationSlug]
  );
  const breed = useMemo(
    () => LOCATION_BREEDS.find((b) => b.slug === breedSlug),
    [breedSlug]
  );
  const seoMeta = useMemo(() => {
    if (!location || !breed) return null;
    return getBreedLocationSeoMetadata({
      breedSlug: breed.slug,
      breedDisplayName: breed.displayName,
      locationSlug: location.slug,
      city: location.city,
      state: location.state,
    });
  }, [location, breed]);

  const { data: puppies, isLoading } = useQuery({
    queryKey: ["puppies"],
    queryFn: fetchAvailablePuppies,
    enabled: !!location && !!breed,
  });

  const matchingPuppies = useMemo(() => {
    if (!puppies || !breed) return [];
    return puppies.filter((p) => normalizeBreedToCanonical(p.breed) === breed.dbBreed);
  }, [puppies, breed]);

  useEffect(() => {
    if (!location || !breed || !seoMeta) return;

    const localBusiness = renderLocalBusinessJsonLd(DEFAULT_SITE_URL, {
      city: location.city,
      state: location.state,
    });
    const breadcrumb = renderBreadcrumbJsonLd(DEFAULT_SITE_URL, [
      { name: "Home", path: "/" },
      { name: "Available Puppies", path: "/puppies" },
      { name: seoMeta.h1, path: seoMeta.path },
    ]);

    const lb = document.createElement("script");
    lb.type = "application/ld+json";
    lb.id = "breed-location-localbusiness-jsonld";
    lb.textContent = localBusiness.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");

    const bc = document.createElement("script");
    bc.type = "application/ld+json";
    bc.id = "breed-location-breadcrumb-jsonld";
    bc.textContent = breadcrumb.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");

    document.getElementById("breed-location-localbusiness-jsonld")?.remove();
    document.getElementById("breed-location-breadcrumb-jsonld")?.remove();
    document.head.appendChild(lb);
    document.head.appendChild(bc);

    return () => {
      document.getElementById("breed-location-localbusiness-jsonld")?.remove();
      document.getElementById("breed-location-breadcrumb-jsonld")?.remove();
    };
  }, [location, breed, seoMeta]);

  if (!location || !breed || !seoMeta) {
    return <NotFound />;
  }

  return (
    <Layout>
      <Seo
        title={seoMeta.title}
        description={seoMeta.description}
        canonicalPath={seoMeta.path}
      />
      <div className="min-h-screen bg-[#0f041b] text-white">
        <nav aria-label="Breadcrumb" className="mx-auto max-w-screen-2xl px-6 pt-8 md:px-8">
          <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-white/60">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link to="/puppies" className="hover:text-white">Available Puppies</Link></li>
            <li aria-hidden>/</li>
            <li className="text-white">{location.city}, {location.state}</li>
          </ol>
        </nav>

        <header className="mx-auto max-w-screen-2xl px-6 pt-6 pb-10 md:px-8 md:pt-8 md:pb-14">
          <p className="font-mono-dream text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
            {location.county} County, {location.state}
          </p>
          <h1 className="mt-3 font-display text-3xl uppercase leading-[0.95] tracking-tight text-white md:text-5xl">
            {seoMeta.h1}
          </h1>
          <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-white/80 md:text-lg">
            {location.intro.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </header>

        <section className="mx-auto max-w-screen-2xl px-6 pb-10 md:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <MapPin className="mb-2 h-5 w-5 text-[#ff3399]" aria-hidden />
              <div className="text-xs font-bold uppercase tracking-wide text-white/60">
                {location.isPrimary ? "Home base" : "Distance"}
              </div>
              <div className="mt-1 text-base font-bold text-white">
                {location.isPrimary
                  ? `This is our ${location.state === "FL" ? "Orlando" : "Raeford"} home`
                  : `${location.driveDistanceMiles} mi / ~${location.driveTimeMinutes} min from ${location.nearestBase}`}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <Truck className="mb-2 h-5 w-5 text-[#ff3399]" aria-hidden />
              <div className="text-xs font-bold uppercase tracking-wide text-white/60">Delivery</div>
              <div className="mt-1 text-base font-bold text-white">
                {location.isPrimary
                  ? "Free local pickup"
                  : location.freeDelivery
                    ? "Free delivery"
                    : "Delivery fee applies (quoted by address)"}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <ShieldCheck className="mb-2 h-5 w-5 text-[#ff3399]" aria-hidden />
              <div className="text-xs font-bold uppercase tracking-wide text-white/60">Health certificate</div>
              <div className="mt-1 text-base font-bold text-white">Included with every puppy</div>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-white/60">
            Every Dream Puppies {breed.displayName.toLowerCase()} goes home with a veterinarian-issued health
            certificate regardless of destination. If you're traveling across the FL/NC state line to pick up or
            receive delivery, double-check current requirements with your own vet — we're happy to answer questions
            about ours.
          </p>
        </section>

        <section className="mx-auto max-w-screen-2xl px-6 pb-10 md:px-8">
          <PriceIncludes />
        </section>

        <section className="mx-auto max-w-screen-2xl px-6 pb-16 md:px-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/60">
            Available {breed.displayName}s
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#ff3399]" />
            </div>
          ) : matchingPuppies.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matchingPuppies.map((puppy) => {
                const img = getPuppyImage(puppy);
                const href = `/puppies/${puppy.slug ?? puppy.id}`;
                return (
                  <Link
                    key={puppy.id}
                    to={href}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-white/25 hover:bg-white/10"
                  >
                    {img && (
                      <img
                        src={img}
                        alt={puppy.name}
                        loading="lazy"
                        width={64}
                        height={64}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">{puppy.name}</div>
                      <div className="truncate text-xs text-white/60">
                        {puppy.gender}{puppy.color ? ` • ${puppy.color}` : ""}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <p className="mb-4 text-white/80">
                No {breed.displayName.toLowerCase()} puppies are available right now, but new litters come up
                regularly. Call or text us and we'll reach out the moment a matching puppy is ready.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="bg-[#ff3399] hover:bg-[#ff1a8c]" asChild>
                  <a href={`tel:+1${businessInfo.phoneRaw}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call {businessInfo.phone}
                  </a>
                </Button>
                <Button variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10" asChild>
                  <Link to="/upcoming-litters">See upcoming litters</Link>
                </Button>
              </div>
              <div className="mt-6 max-w-md">
                <p className="mb-3 text-sm font-semibold text-white">
                  Or join the waitlist and we'll email you the moment one matches
                </p>
                <WaitlistForm breedInterest={breed.dbBreed} />
              </div>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-screen-2xl px-6 pb-20 md:px-8">
          <div className="rounded-3xl bg-white/5 p-8 text-center md:p-12">
            <h2 className="mb-2 font-display text-2xl md:text-3xl">
              Reserve a {breed.displayName} for your {location.city} family
            </h2>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button className="bg-[#ff3399] hover:bg-[#ff1a8c]" asChild>
                <Link to="/puppies">View all available puppies</Link>
              </Button>
              <Button variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10" asChild>
                <a href={`tel:+1${businessInfo.phoneRaw}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call {businessInfo.phone}
                </a>
              </Button>
              <Button variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10" asChild>
                <a href={`sms:+1${businessInfo.phoneRaw}`}>
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
