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
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">{t("upcomingHeroTitle")}</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t("upcomingHeroDescription")}
          </p>
        </div>
      </section>

      <section className="container py-12">
        <UpcomingLittersSection />
      </section>
    </Layout>
  );
}
