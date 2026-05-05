import { Calendar } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { UpcomingLittersSection } from "@/components/upcoming/UpcomingLittersSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { DreamTag } from "@/components/redesign/PublicDesignPrimitives";

export default function UpcomingLitters() {
  const { t } = useLanguage();

  return (
    <Layout>
      <Seo pageId="upcomingLitters" />
      <section className="bg-bg py-14 text-white md:py-20">
        <div className="container text-center px-4">
          <DreamTag className="mx-auto mb-4 bg-sun">Text us to pre-reserve and get first pick</DreamTag>
          <Calendar className="mx-auto mb-3 h-10 w-10 text-white" />
          <h1 className="mb-3 font-display text-4xl uppercase tracking-tight md:text-6xl">{t("upcomingHeroTitle")}</h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
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
