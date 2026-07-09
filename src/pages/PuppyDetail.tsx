import { useEffect, useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Tag, Heart, CalendarHeart, Phone, MessageCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PuppyMediaCollage } from "@/components/puppy/PuppyMediaCollage";
import { InquirePriceDialog } from "@/components/InquirePriceDialog";
import { PriceIncludes } from "@/components/PriceIncludes";
import { fetchPuppyBySlugOrId } from "@/lib/puppies-api";
import { getPuppyMediaList } from "@/lib/puppy-display-utils";
import { getDisplayAgeWeeks } from "@/lib/puppy-utils";
import { getPuppySeoMetadata, renderPuppyJsonLd, DEFAULT_SITE_URL } from "@/lib/seo";
import { useBusinessInfoOrDefaults } from "@/lib/hooks/useBusinessInfo";
import NotFound from "@/pages/NotFound";

export default function PuppyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const businessInfo = useBusinessInfoOrDefaults();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["puppy-detail", slug],
    queryFn: () => fetchPuppyBySlugOrId(slug!),
    enabled: !!slug,
  });

  const puppy = data?.kind === "found" ? data.puppy : null;

  const { photos, videoUrl } = useMemo(
    () => (puppy ? getPuppyMediaList(puppy) : { photos: [] as string[], videoUrl: null }),
    [puppy]
  );

  const seoMeta = useMemo(() => {
    if (!puppy?.slug) return null;
    return getPuppySeoMetadata({
      slug: puppy.slug,
      name: puppy.name,
      breed: puppy.breed,
      generation: puppy.generation,
      status: puppy.status,
      readyDate: puppy.ready_date,
      primaryImage: photos[0] ?? null,
    });
  }, [puppy, photos]);

  useEffect(() => {
    if (!puppy || !seoMeta) return;

    const jsonLd = renderPuppyJsonLd(
      {
        slug: puppy.slug!,
        name: puppy.name,
        breed: puppy.breed,
        generation: puppy.generation,
        status: puppy.status,
        readyDate: puppy.ready_date,
        primaryImage: photos[0] ?? null,
      },
      seoMeta,
      DEFAULT_SITE_URL
    );

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "puppy-product-jsonld";
    // renderPuppyJsonLd already returns a full <script> tag; extract just the JSON body.
    script.textContent = jsonLd.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");

    document.getElementById("puppy-product-jsonld")?.remove();
    document.head.appendChild(script);

    return () => {
      document.getElementById("puppy-product-jsonld")?.remove();
    };
  }, [puppy, seoMeta]);

  if (!slug) return <NotFound />;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff3399]" />
        </div>
      </Layout>
    );
  }

  if (data?.kind === "redirect") {
    return <Navigate to={`/puppies/${data.slug}`} replace />;
  }

  if (isError || !puppy || !seoMeta) {
    return <NotFound />;
  }

  const ageWeeks = getDisplayAgeWeeks(puppy);
  const damName = puppy.upcoming_litter?.dam_name;
  const sireName = puppy.upcoming_litter?.sire_name;

  return (
    <Layout>
      <Seo
        pageId="puppies"
        title={seoMeta.title}
        description={seoMeta.description}
        canonicalPath={seoMeta.path}
        imageUrl={photos[0] ?? undefined}
      />
      <div className="min-h-screen bg-[#0f041b] text-white">
        <nav aria-label="Breadcrumb" className="mx-auto max-w-screen-2xl px-6 pt-8 md:px-8">
          <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-white/60">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link to="/puppies" className="hover:text-white">Available Puppies</Link></li>
            <li aria-hidden>/</li>
            <li className="text-white">{puppy.name}</li>
          </ol>
        </nav>

        <section className="mx-auto max-w-screen-2xl px-6 py-8 md:px-8 md:py-12">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="relative">
              <PuppyMediaCollage photos={photos} videoUrl={videoUrl} alt={puppy.name} />
              <div className="absolute bottom-2 left-2 flex gap-2">
                <Badge className={seoMeta.isOnHold ? "bg-amber-500 text-black" : "bg-emerald-500 text-black"}>
                  {seoMeta.isOnHold ? "On Hold" : "Available"}
                </Badge>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <h1 className="font-display text-3xl uppercase leading-[0.95] tracking-tight text-white md:text-5xl">
                  {seoMeta.h1}
                </h1>
                <p className="mt-2 text-white/70">
                  {seoMeta.breedLabel}
                  {puppy.gender && ` • ${puppy.gender}`}
                  {puppy.color && ` • ${puppy.color}`}
                  {ageWeeks != null && ` • ${ageWeeks} weeks`}
                </p>
              </div>

              {seoMeta.isOnHold && (
                <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {puppy.name} is currently on hold for another family. Contact us if you'd like
                  to be first in line should this reservation fall through, or to find a similar
                  puppy.
                </div>
              )}

              {puppy.ready_date && (
                <div className="inline-flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200">
                  <CalendarHeart className="h-4 w-4" aria-hidden />
                  Ready by {new Date(puppy.ready_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </div>
              )}

              {puppy.description && (
                <p className="text-white/80">{puppy.description}</p>
              )}

              {(damName || sireName) && (
                <p className="text-sm text-white/70">
                  Parents: {[damName, sireName].filter(Boolean).join(" & ")} —{" "}
                  <Link to="/our-dogs" className="text-[#ff3399] underline hover:text-white">
                    meet {puppy.name}'s parents
                  </Link>
                </p>
              )}

              <div className="space-y-2 pt-2">
                <InquirePriceDialog puppy={{ id: puppy.id, name: puppy.name, breed: puppy.breed }}>
                  <Button className="w-full bg-[#ff3399] hover:bg-[#ff1a8c]">
                    <Tag className="mr-2 h-4 w-4" />
                    Inquire about price
                  </Button>
                </InquirePriceDialog>
                <Button variant="outline" className="w-full border-white/25 bg-transparent text-white hover:bg-white/10" asChild>
                  <Link to={`/request-deposit?puppy=${encodeURIComponent(puppy.id ?? "")}`}>
                    <Heart className="mr-2 h-4 w-4" />
                    Tell us about your home and we'll see if {puppy.name}'s a fit
                  </Link>
                </Button>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 border-white/25 bg-transparent text-white hover:bg-white/10" asChild>
                    <a href={`tel:+1${businessInfo.phoneRaw}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call {businessInfo.phone}
                    </a>
                  </Button>
                  <Button variant="outline" className="flex-1 border-white/25 bg-transparent text-white hover:bg-white/10" asChild>
                    <a href={`sms:+1${businessInfo.phoneRaw}`}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Text us
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <PriceIncludes />
          </div>
        </section>
      </div>
    </Layout>
  );
}
