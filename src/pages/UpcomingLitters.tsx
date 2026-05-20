import { useEffect } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { UpcomingLittersSection } from "@/components/upcoming/UpcomingLittersSection";
import { GalacticHomeNav, GALACTIC_HOME_SMS_HREF, GALACTIC_HOME_TEL_HREF } from "@/components/home/GalacticHomeNav";
import { GalacticHomeMiniFooter } from "@/components/home/GalacticHomeMiniFooter";
import { GalacticPawCanvas } from "@/components/GalacticPawCanvas";
import { StickerButton } from "@/components/redesign/PublicDesignPrimitives";
import { useLanguage } from "@/contexts/LanguageContext";

const pageShellClass = "min-h-screen bg-[#0f041b] text-white";
const containerClass = "mx-auto max-w-screen-2xl px-6 md:px-8";
const glossyStickerBaseClass =
  "group relative overflow-hidden rounded-3xl px-10 py-5 text-lg font-bold normal-case tracking-normal before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-[''] sm:px-12 sm:text-xl";
const pinkStickerClass =
  `${glossyStickerBaseClass} bg-[#ff3399] text-white shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]`;
const violetStickerClass =
  `${glossyStickerBaseClass} bg-[#5b21b6] text-white shadow-[0_6px_0_#7c3aed,0_14px_30px_rgba(124,58,237,0.45)] hover:bg-[#7c3aed] hover:shadow-[0_6px_0_#a78bfa,0_16px_34px_rgba(167,139,250,0.5)]`;

export default function UpcomingLitters() {
  const { t } = useLanguage();

  useEffect(() => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://puppyheavenllc.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Upcoming Litters',
          item: 'https://puppyheavenllc.com/upcoming-litters',
        },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-jsonld';
    script.textContent = JSON.stringify(jsonLd);

    document.getElementById('breadcrumb-jsonld')?.remove();
    document.head.appendChild(script);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
    };
  }, []);

  return (
    <Layout bare>
      <Seo pageId="upcomingLitters" />
      <div className={pageShellClass}>
        <GalacticHomeNav />

        <section
          className="relative overflow-hidden border-b border-white/10 py-16 md:py-20"
          style={{
            background: "radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, #0f041b 80%)",
          }}
        >
          <GalacticPawCanvas className="absolute inset-0 z-0 opacity-80" />
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80" />

          <div className={`relative z-20 text-center ${containerClass}`}>
            <h1 className="mx-auto mb-4 max-w-4xl font-display text-4xl font-black uppercase tracking-tight md:text-6xl">
              What is coming next.
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-white/80 md:text-xl">
              Text us to pre-reserve and get your first pick at the litter. No slot clutter, just clear timing and direct communication.
            </p>
            <p className="mx-auto mb-10 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
              {t("upcomingLittersDescription")}
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <StickerButton size="lg" className={pinkStickerClass} asChild>
                <a href={GALACTIC_HOME_SMS_HREF} className="flex items-center justify-center gap-x-3">
                  <MessageCircle className="size-6 shrink-0" aria-hidden />
                  <span>Text us for updates</span>
                </a>
              </StickerButton>
              <StickerButton size="lg" className={violetStickerClass} asChild>
                <a href={GALACTIC_HOME_TEL_HREF} className="flex items-center justify-center gap-x-3">
                  <Phone className="size-6 shrink-0" aria-hidden />
                  <span>Call our team</span>
                </a>
              </StickerButton>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#0a0214] py-14 md:py-16">
          <div className={containerClass}>
            <div className="mb-8 text-center">
              <h2 className="font-display text-3xl font-black tracking-tight md:text-4xl">Upcoming Litter Announcements</h2>
            </div>
            <UpcomingLittersSection />
          </div>
        </section>

        <GalacticHomeMiniFooter />
      </div>
    </Layout>
  );
}
