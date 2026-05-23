import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  Handshake,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GalacticPawCanvas } from "@/components/GalacticPawCanvas";
import { GalacticHomeNav, GALACTIC_HOME_SMS_HREF, GALACTIC_HOME_TEL_HREF } from "@/components/home/GalacticHomeNav";
import { GalacticHeroPuppiesMarquee } from "@/components/home/GalacticHeroPuppiesMarquee";
import { GalacticHomeMiniFooter } from "@/components/home/GalacticHomeMiniFooter";
import { StickerButton } from "@/components/redesign/PublicDesignPrimitives";
import { BUSINESS } from "@/lib/constants/business";
import type { TranslationKey } from "@/i18n/translations";

const space = "#0f041b";
const pink = "#ff3399";
const sectionContainerClass = "mx-auto max-w-screen-2xl px-6 md:px-8";
const trustChipClass =
  "flex items-center gap-x-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_15px_-3px_rgb(255_51_153/0.25)]";
const glassCardClass = "rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl";
const heroCtaSizingClass = "px-10 py-5 text-lg font-bold sm:px-12 sm:text-xl";
const glossyButtonClass =
  "relative overflow-hidden before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-['']";
const heroStickerCtaBaseClass =
  `group rounded-3xl normal-case tracking-normal ${heroCtaSizingClass} ${glossyButtonClass}`;
const finalCtaSizingClass = "px-10 py-4 text-lg font-bold";
const finalStickerCtaBaseClass =
  `group rounded-3xl normal-case tracking-normal ${finalCtaSizingClass} ${glossyButtonClass}`;
const TRUST_ITEMS: { icon: typeof CheckCircle2; labelKey: TranslationKey }[] = [
  { icon: CheckCircle2, labelKey: "indexHeroTrustVetChecked" },
  { icon: Home, labelKey: "indexHeroTrustHomeRaised" },
  { icon: Heart, labelKey: "indexHeroTrustFamilySocialized" },
];

const PROMISE_CARDS: { icon: typeof Eye; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { icon: Eye, titleKey: "mockupV3Promise1Title", bodyKey: "mockupV3Promise1Body" },
  { icon: Home, titleKey: "mockupV3Promise2Title", bodyKey: "mockupV3Promise2Body" },
  { icon: Handshake, titleKey: "mockupV3Promise3Title", bodyKey: "mockupV3Promise3Body" },
  { icon: Shield, titleKey: "mockupV3Promise4Title", bodyKey: "mockupV3Promise4Body" },
];

export default function Index() {
  const { t } = useLanguage();
  const locationsLabel = BUSINESS.locations.map((l) => `${l.city}, ${l.state}`).join(" · ");

  useEffect(() => {
    // Address objects intentionally omit streetAddress and postalCode — we do not
    // publish a precise storefront address. addressLocality + addressRegion +
    // addressCountry is the minimum valid PostalAddress for a city/region-level
    // local business. Verify with Google Rich Results before claiming compliance.
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': 'https://puppyheavenllc.com/#business',
      name: BUSINESS.primaryBrand,
      type: ['LocalBusiness', 'PetStore'],
      url: 'https://puppyheavenllc.com',
      telephone: BUSINESS.phone,
      email: BUSINESS.email,
      address: BUSINESS.locations.map((loc) => ({
        '@type': 'PostalAddress',
        addressLocality: loc.city,
        addressRegion: loc.state,
        addressCountry: 'US',
      })),
      // Google uses `logo` (not `image`) to identify the brand mark for search
      // result thumbnails and the Knowledge Panel. ImageObject with dimensions
      // is the recommended format per schema.org/logo.
      logo: {
        '@type': 'ImageObject',
        url: 'https://puppyheavenllc.com/dream-puppies-logo.png',
        width: 1024,
        height: 1024,
      },
      image: 'https://puppyheavenllc.com/dream-puppies-logo.png',
      description: 'Family-raised puppies in Orlando, FL and Raeford, NC.',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        telephone: BUSINESS.phone,
        email: BUSINESS.email,
      },
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'business-jsonld';
    script.textContent = JSON.stringify(jsonLd);

    document.getElementById('business-jsonld')?.remove();
    document.head.appendChild(script);

    return () => {
      document.getElementById('business-jsonld')?.remove();
    };
  }, []);

  return (
    <Layout bare>
      <Seo pageId="home" />
      <div className="flex min-h-screen flex-col bg-[#0f041b] text-white">
        <GalacticHomeNav />

        <header
          className="relative flex min-h-[100dvh] flex-col overflow-hidden pt-8 pb-0"
          style={{
            background: `radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, ${space} 80%)`,
          }}
        >
          <GalacticPawCanvas className="absolute inset-0 z-0 opacity-90" />
          <div
            className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80"
            aria-hidden
          />

          <div className="relative z-20 flex min-h-0 flex-1 flex-col">
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 pb-6 text-center">
              <h1 className="mb-6 font-display text-[52px] font-black uppercase leading-[0.98] tracking-[-0.05em] drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)] sm:text-[64px] md:text-[96px]">
                <span className="block">{t("indexHeroTitlePart1")}</span>
                <span className="mt-1 block bg-gradient-to-r from-[#ff3399] via-fuchsia-400 to-purple-400 bg-clip-text text-transparent [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] [filter:drop-shadow(0_0_12px_rgba(255,51,153,0.6))]">
                  {t("indexHeroTitleAccent")}
                </span>
                <span className="mt-1 block text-white">{t("indexHeroTitlePart2")}</span>
              </h1>

            <p className="mx-auto mb-10 max-w-2xl font-body text-xl leading-tight text-white/80 md:text-2xl">
              {t("indexHeroDescription")}
            </p>

            <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
              <StickerButton
                size="lg"
                className={`${heroStickerCtaBaseClass} bg-[#ff3399] text-white shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]`}
                asChild
              >
                <a href={GALACTIC_HOME_SMS_HREF} className="flex items-center justify-center gap-x-3">
                  <MessageCircle className="size-6 shrink-0" aria-hidden />
                  <span>{t("indexHeroTextUsCta")}</span>
                  <ArrowRight className="size-5 shrink-0 transition group-active:translate-x-1" aria-hidden />
                </a>
              </StickerButton>

              <StickerButton
                size="lg"
                className={`${heroStickerCtaBaseClass} bg-[#5b21b6] text-white shadow-[0_6px_0_#7c3aed,0_14px_30px_rgba(124,58,237,0.45)] hover:bg-[#7c3aed] hover:shadow-[0_6px_0_#a78bfa,0_16px_34px_rgba(167,139,250,0.5)]`}
                asChild
              >
                <Link to="/puppies" className="flex items-center justify-center gap-x-3">
                  <Eye className="size-6 shrink-0" aria-hidden />
                  {t("indexHeroViewAvailablePuppiesCta")}
                  <ArrowRight className="size-5 shrink-0 transition group-active:translate-x-1" aria-hidden />
                </Link>
              </StickerButton>
            </div>

            <p className="mb-10 text-center text-sm text-white/55">
              {t("mockupV3PreferCall")}{" "}
              <a
                href={GALACTIC_HOME_TEL_HREF}
                className="font-medium text-white underline-offset-4 hover:text-[#ff3399] hover:underline"
              >
                {BUSINESS.phone}
              </a>
            </p>

              <div className="flex flex-wrap justify-center gap-3">
                {TRUST_ITEMS.map(({ icon: Icon, labelKey }) => (
                  <div key={labelKey} className={trustChipClass}>
                    <Icon className="size-4 shrink-0" style={{ color: pink }} aria-hidden />
                    <span>{t(labelKey)}</span>
                  </div>
                ))}
                <div className={trustChipClass}>
                  <MapPin className="size-4 shrink-0" style={{ color: pink }} aria-hidden />
                  <span>{locationsLabel}</span>
                </div>
              </div>

              <a
                href="#home-promise"
                className="mt-10 hidden flex-col items-center text-white/40 transition hover:text-white/60 md:flex"
              >
                <span className="text-xs tracking-[3px]">{t("indexHeroScrollHint").toUpperCase()}</span>
                <ChevronDown className="mt-2 size-4 animate-bounce" aria-hidden />
              </a>
            </div>

            <GalacticHeroPuppiesMarquee className="relative z-20 mt-auto shrink-0" />
          </div>
        </header>

        <section id="home-promise" className="border-t border-white/10 bg-[#0a0214] py-16 md:py-20">
          <div className={sectionContainerClass}>
            <div className="mb-14 text-center">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-[#ff3399]">
                {t("mockupV3PromiseEyebrow")}
              </div>
              <h2 className="font-display text-4xl font-black tracking-tighter text-white md:text-5xl">
                {t("mockupV3PromiseTitleLine1")}
                <br />
                {t("mockupV3PromiseTitleLine2")}
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {PROMISE_CARDS.map(({ icon: Icon, titleKey, bodyKey }) => (
                <div key={titleKey} className={`${glassCardClass} p-8`}>
                  <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#ff3399]/10">
                    <Icon className="size-7" style={{ color: pink }} aria-hidden />
                  </div>
                  <div className="mb-3 text-2xl font-bold">{t(titleKey)}</div>
                  <p className="text-white/70">{t(bodyKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-16 md:py-20">
          <div className="mx-auto max-w-2xl px-6 text-center md:px-8">
            <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-2xl bg-[#ff3399]/10">
              <Heart className="size-9" style={{ color: pink }} aria-hidden />
            </div>
            <h2 className="mb-6 font-display text-4xl font-black tracking-normal text-white md:text-5xl">
              {t("mockupV3FinalTitle")}
            </h2>
            <p className="mb-10 text-xl text-white/70">{t("mockupV3FinalSub")}</p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <StickerButton
                size="lg"
                className={`${finalStickerCtaBaseClass} bg-[#ff3399] text-white shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]`}
                asChild
              >
                <a href={GALACTIC_HOME_SMS_HREF} className="flex items-center justify-center gap-x-3">
                  <MessageCircle className="size-5 shrink-0" aria-hidden />
                  <span>{t("indexHeroTextUsCta")}</span>
                  <ArrowRight className="size-5 shrink-0 transition group-active:translate-x-1" aria-hidden />
                </a>
              </StickerButton>
              <StickerButton
                size="lg"
                className={`${finalStickerCtaBaseClass} bg-[#5b21b6] text-white shadow-[0_6px_0_#7c3aed,0_14px_30px_rgba(124,58,237,0.45)] hover:bg-[#7c3aed] hover:shadow-[0_6px_0_#a78bfa,0_16px_34px_rgba(167,139,250,0.5)]`}
                asChild
              >
                <a href={GALACTIC_HOME_TEL_HREF} className="flex items-center justify-center gap-x-3">
                  <Phone className="size-5 shrink-0" aria-hidden />
                  <span>{BUSINESS.phone}</span>
                  <ArrowRight className="size-5 shrink-0 transition group-active:translate-x-1" aria-hidden />
                </a>
              </StickerButton>
            </div>
            <p className="mt-8 text-xs text-white/50">
              {t("mockupV3FooterRegions")} · {BUSINESS.phone}
            </p>
          </div>
        </section>

        <GalacticHomeMiniFooter />
      </div>
    </Layout>
  );
}
