import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { AvailablePuppiesMarquee } from "@/components/AvailablePuppiesMarquee";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dog, Heart, MapPin, Phone, Mail, Users, CheckCircle2 } from "lucide-react";

const HERO_BANNER_URL = "/puppy-heaven-banner.jpg";

export default function Index() {
  const { t } = useTranslation();
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const useBannerImage = bannerLoaded && !bannerError;

  const trustPoints = [
    {
      icon: Users,
      title: t("home.trust.points.familyOperated.title"),
      description: t("home.trust.points.familyOperated.description"),
    },
    {
      icon: MapPin,
      title: t("home.trust.points.serving.title"),
      description: t("home.trust.points.serving.description"),
    },
    {
      icon: Heart,
      title: t("home.trust.points.raisedWithLove.title"),
      description: t("home.trust.points.raisedWithLove.description"),
    },
  ];

  return (
    <Layout>
      <Seo pageId="home" />
      <img
        src={HERO_BANNER_URL}
        alt=""
        className="hidden"
        onLoad={() => setBannerLoaded(true)}
        onError={() => setBannerError(true)}
      />

      <section className="relative min-h-[28rem] py-20 lg:py-32 flex flex-col justify-center">
        <div className="absolute inset-0 z-0 bg-primary" aria-hidden>
          {useBannerImage && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${HERO_BANNER_URL})` }}
              />
              <div className="absolute inset-0 bg-black/50" aria-hidden />
            </>
          )}
        </div>
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Dog
              className={`h-16 w-16 mx-auto mb-6 ${useBannerImage ? "text-white drop-shadow-md" : "text-primary-foreground"}`}
            />
            <h1
              className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 ${useBannerImage ? "text-white drop-shadow-md" : "text-primary-foreground"}`}
            >
              {t("home.hero.title")}
            </h1>
            <p
              className={`text-lg md:text-xl mb-8 ${useBannerImage ? "text-white/90 drop-shadow-sm" : "text-primary-foreground/80"}`}
            >
              {t("home.hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="text-black" asChild>
                <Link to="/puppies">
                  <Dog className="h-5 w-5 mr-2" />
                  {t("home.hero.browsePuppies")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <AvailablePuppiesMarquee />

      <section className="container py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          {t("home.services.title")}
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          {t("home.services.description")}
        </p>
        <div className="mx-auto max-w-5xl">
          <Card className="overflow-hidden border-primary/20 shadow-sm hover:shadow-lg transition-shadow">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
              <div className="p-8 md:p-10">
                <CardHeader className="p-0 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Dog className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {t("home.services.featured.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <CardDescription className="text-base mb-6 max-w-xl">
                    {t("home.services.featured.description")}
                  </CardDescription>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" asChild>
                      <Link to="/puppies">{t("home.services.featured.cta")}</Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/contact">{t("home.services.featured.secondaryCta")}</Link>
                    </Button>
                  </div>
                </CardContent>
              </div>

              <div className="bg-muted/40 border-t md:border-t-0 md:border-l p-8 md:p-10">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {t("home.services.expectationsTitle")}
                </h3>
                <div className="space-y-3 text-muted-foreground">
                  {(t("home.services.expectations", {
                    returnObjects: true,
                  }) as string[]).map((item) => (
                    <p key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="bg-muted/30 py-16">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            {t("home.trust.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trustPoints.map((point) => (
              <div key={point.title} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
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
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">{t("home.cta.title")}</h2>
              <p className="text-primary-foreground/80 mb-8">
                {t("home.cta.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <a
                  href="tel:321-697-8864"
                  className="flex items-center gap-2 justify-center text-primary-foreground hover:underline"
                >
                  <Phone className="h-5 w-5" />
                  321-697-8864
                </a>
                <a
                  href="mailto:Dreampuppies22@gmail.com"
                  className="flex items-center gap-2 justify-center text-primary-foreground hover:underline"
                >
                  <Mail className="h-5 w-5" />
                  Dreampuppies22@gmail.com
                </a>
              </div>
              <Button variant="secondary" size="lg" asChild>
                <Link to="/contact">{t("layout.footer.contactUs")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
