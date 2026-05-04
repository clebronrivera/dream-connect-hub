import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dog, Heart, MapPin, Phone, Mail, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BreedMarquee, DreamTag, PuppyPlaceholderSvg, StickerButton } from "@/components/redesign/PublicDesignPrimitives";
import { cn } from "@/lib/utils";

/** Optional hero banner from `public/`; shown behind the Direction B hero when the image loads. */
const HERO_BANNER_URL = "/puppy-heaven-banner.jpg";

function HomePolaroid({
  name,
  breedLabel,
  hue,
  ear,
  className,
}: {
  name: string;
  breedLabel: string;
  hue: number;
  ear?: 0 | 1;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-[min(100%,220px)] rounded-lg border-4 border-white bg-white p-3 pb-4 shadow-2xl ring-1 ring-black/10",
        className,
      )}
    >
      <div className="overflow-hidden rounded-md bg-paper">
        <PuppyPlaceholderSvg hue={hue} ear={ear ?? 0} size={200} className="mx-auto w-full max-w-[200px]" />
      </div>
      <p className="mt-3 font-display text-sm uppercase tracking-tight text-ink">{name}</p>
      <p className="text-xs font-semibold text-primary">{breedLabel}</p>
    </div>
  );
}

export default function Index() {
  const { t } = useLanguage();
  const featuredService = {
    icon: Dog,
    title: t("serviceAvailablePuppiesTitle"),
    description: t("serviceAvailablePuppiesDescription"),
    cta: t("indexBrowsePuppies"),
    link: "/puppies",
  };
  const trustPoints = [
    {
      icon: Users,
      title: t("trustFamilyOperatedTitle"),
      description: t("trustFamilyOperatedDescription"),
    },
    {
      icon: MapPin,
      title: t("trustServingTitle"),
      description: t("trustServingDescription"),
    },
    {
      icon: Heart,
      title: t("trustRaisedWithLoveTitle"),
      description: t("trustRaisedWithLoveDescription"),
    },
  ];
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const useBannerImage = bannerLoaded && !bannerError;

  return (
    <Layout>
      <Seo pageId="home" />
      {/* Hidden img to detect banner load/error; hero uses solid Direction B background if image doesn't load */}
      <img
        src={HERO_BANNER_URL}
        alt=""
        className="hidden"
        onLoad={() => setBannerLoaded(true)}
        onError={() => setBannerError(true)}
      />
      <section className="relative overflow-hidden rounded-b-[40px] bg-bg pb-1 md:rounded-b-[56px] md:pb-2">
        <div className="absolute inset-0 z-0" aria-hidden>
          {useBannerImage && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${HERO_BANNER_URL})` }}
              />
              <div className="absolute inset-0 bg-bg/85" aria-hidden />
            </>
          )}
        </div>
        <div className="container relative z-10 py-16 md:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <DreamTag className="bg-sun text-ink">{t("indexHeroEyebrow")}</DreamTag>
              <h1 className="mt-5 font-display text-5xl uppercase leading-[0.9] tracking-tight text-white md:text-7xl lg:text-8xl">
                <span className="block">{t("indexHeroTitlePart1")}</span>
                <span className="mt-1 block bg-gradient-to-r from-accent via-primary to-cyan bg-clip-text text-transparent">
                  {t("indexHeroTitleAccent")}
                </span>
                <span className="mt-1 block text-white">{t("indexHeroTitlePart2")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-white/85 md:text-xl">{t("indexHeroDescription")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <StickerButton asChild size="lg" className="gap-2">
                  <Link to="/puppies" className="inline-flex items-center gap-2">
                    {t("indexHeroBrowseCta")}
                    <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                  </Link>
                </StickerButton>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-pill border-white/50 bg-transparent text-white hover:bg-white/10"
                  asChild
                >
                  <Link to="/breeds">{t("indexHeroStoryCta")}</Link>
                </Button>
              </div>

              <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-white/15 pt-10 sm:gap-8 md:grid-cols-4">
                {(
                  [
                    { v: t("indexStatOperatedValue"), l: t("indexStatOperatedLabel") },
                    { v: t("indexStatHomesValue"), l: t("indexStatHomesLabel") },
                    { v: t("indexStatHealthValue"), l: t("indexStatHealthLabel") },
                    { v: t("indexStatReplyValue"), l: t("indexStatReplyLabel") },
                  ] as const
                ).map((row) => (
                  <div key={row.l}>
                    <dt className="font-mono-dream text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                      {row.l}
                    </dt>
                    <dd className="mt-1 font-display text-3xl text-white md:text-4xl">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mx-auto h-[380px] w-full max-w-md lg:mx-0 lg:mr-0 lg:ml-auto">
              <HomePolaroid
                name={t("indexPolaroid1Name")}
                breedLabel={t("indexPolaroid1Breed")}
                hue={328}
                ear={0}
                className="absolute right-2 top-0 z-30 rotate-6"
              />
              <HomePolaroid
                name={t("indexPolaroid2Name")}
                breedLabel={t("indexPolaroid2Breed")}
                hue={42}
                ear={0}
                className="absolute left-0 top-16 z-20 -rotate-3"
              />
              <HomePolaroid
                name={t("indexPolaroid3Name")}
                breedLabel={t("indexPolaroid3Breed")}
                hue={155}
                ear={1}
                className="absolute right-6 top-28 z-10 -rotate-2"
              />
            </div>
          </div>
        </div>
      </section>

      <BreedMarquee
        items={[
          t("indexMarquee1"),
          t("indexMarquee2"),
          t("indexMarquee3"),
          t("indexMarquee4"),
          t("indexMarquee5"),
          t("indexMarquee6"),
          t("indexMarquee7"),
        ]}
      />

      {/* Services Section */}
      <section className="container py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          {t("indexOurServices")}
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          {t("indexServicesDescription")}
        </p>
        <div className="mx-auto max-w-5xl">
          <Card className="overflow-hidden border-primary/20 shadow-sm hover:shadow-lg transition-shadow">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
              <div className="p-8 md:p-10">
                <CardHeader className="p-0 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primaryDeep/15 flex items-center justify-center mb-4">
                    <featuredService.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl md:text-3xl">{featuredService.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <CardDescription className="text-base mb-6 max-w-xl">
                    {featuredService.description}
                  </CardDescription>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" asChild>
                      <Link to={featuredService.link}>{featuredService.cta}</Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/contact">{t("indexAskAvailability")}</Link>
                    </Button>
                  </div>
                </CardContent>
              </div>

              <div className="bg-muted/40 border-t md:border-t-0 md:border-l p-8 md:p-10">
                <h3 className="text-lg font-semibold text-foreground mb-4">{t("indexWhatToExpect")}</h3>
                <div className="space-y-3 text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    {t("indexExpectOne")}
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    {t("indexExpectTwo")}
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    {t("indexExpectThree")}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="bg-paper py-16">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            {t("indexWhyChoose")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trustPoints.map((point, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primaryDeep/15 flex items-center justify-center mx-auto mb-4">
                  <point.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{point.title}</h3>
                <p className="text-muted-foreground">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <Card className="bg-bg text-white">
          <CardContent className="py-12">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">{t("indexReadyTitle")}</h2>
              <p className="text-white/80 mb-8">
                {t("indexReadyDescription")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <a 
                  href="tel:321-697-8864" 
                  className="flex items-center gap-2 justify-center text-white hover:underline"
                >
                  <Phone className="h-5 w-5" />
                  321-697-8864
                </a>
                <a 
                  href="mailto:Dreampuppies22@gmail.com" 
                  className="flex items-center gap-2 justify-center text-white hover:underline"
                >
                  <Mail className="h-5 w-5" />
                  Dreampuppies22@gmail.com
                </a>
              </div>
              <StickerButton variant="secondary" size="lg" asChild>
                <Link to="/contact">{t("footerContactUs")}</Link>
              </StickerButton>
            </div>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
