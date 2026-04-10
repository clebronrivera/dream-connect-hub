import { Calendar } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { UpcomingLittersSection } from "@/components/upcoming/UpcomingLittersSection";
import { useLanguage } from "@/contexts/LanguageContext";

export default function UpcomingLitters() {
  const { t } = useLanguage();

  return (
    <Layout>
      <Seo pageId="upcomingLitters" />
      <section className="bg-primary py-10 md:py-12">
        <div className="container text-center px-4">
          <Calendar className="h-10 w-10 mx-auto mb-3 text-primary-foreground" />
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">{t("upcomingHeroTitle")}</h1>
          <p className="text-sm md:text-base text-primary-foreground/85 max-w-xl mx-auto leading-snug">
            {t("upcomingHeroDescription")}
          </p>
        </div>
      </section>

      <section className="container py-8 md:py-10">
        <UpcomingLittersSection />
      </section>
    </Layout>
  );
}
