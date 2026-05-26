import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import { BUSINESS } from "@/lib/constants/business";
import { useBusinessInfoOrDefaults } from "@/lib/hooks/useBusinessInfo";
import { PUBLIC_SHOW_SHOP_AND_BREEDS_NAV } from "@/lib/public-site-features";
import { cn } from "@/lib/utils";

const languageOptions = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "pt", label: "PT" },
] as const;

const optionalShopBreedsNav: { to: string; label: TranslationKey }[] = PUBLIC_SHOW_SHOP_AND_BREEDS_NAV
  ? [
      { to: "/breeds", label: "navShortBreeds" },
      { to: "/essentials", label: "navShortShop" },
    ]
  : [];

/** Shown in the centered pill; `end` avoids matching every route for `/`. */
const galacticNavLinks: { to: string; label: TranslationKey; end?: boolean }[] = [
  { to: "/", label: "navHome", end: true },
  { to: "/puppies", label: "navShortAvailable" },
  { to: "/upcoming-litters", label: "navShortUpcoming" },
  { to: "/our-dogs", label: "navShortOurDogs" },
  ...optionalShopBreedsNav,
  { to: "/training-plan", label: "navShortTraining" },
  { to: "/dreamy-reviews", label: "navShortReviews" },
  { to: "/faq", label: "navShortFaq" },
  { to: "/about", label: "navAbout" },
  { to: "/contact", label: "navShortContact" },
];

/** Sticky galactic header: logo, pill tabs, 📞 / 💬 actions, live hint, language, mobile sheet. */
export function GalacticHomeNav() {
  const { t, language, setLanguage } = useLanguage();
  const businessInfo = useBusinessInfoOrDefaults();
  const [sheetOpen, setSheetOpen] = useState(false);
  const liveLabel = t("indexHeroEyebrow").replace(/^[●•]\s*/u, "").trim();

  const smsPrefillBody = `Hi ${BUSINESS.primaryBrand}, I'm interested in learning more about your available puppies. Can you send me more information?`;
  const smsHref = `sms:+1${businessInfo.phoneRaw}?body=${encodeURIComponent(smsPrefillBody)}`;
  const telHref = `tel:+1${businessInfo.phoneRaw}`;
  const iconPillClass =
    "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-lg leading-none text-white transition hover:bg-white/10";

  return (
    <nav className="sticky top-0 z-[100] border-b border-white/10 bg-[rgba(15,4,27,0.92)] backdrop-blur-xl">
      <div className="mx-auto grid min-h-[64px] max-w-screen-2xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2 sm:px-6 lg:min-h-[68px] lg:px-8">
        <Link to="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
          <img
            src="/dream-puppies-logo.png"
            alt="Dream Puppies logo"
            className="size-8 shrink-0 rounded-full object-cover ring-1 ring-white/25 sm:size-10"
          />
          <div className="min-w-0 leading-none">
            <div className="font-display text-sm font-black uppercase tracking-[-0.03em] text-white drop-shadow-[0_0_10px_rgba(255,51,153,0.35)] sm:text-lg md:text-xl">
              {BUSINESS.primaryBrand}
            </div>
            <div className="hidden text-[9px] uppercase tracking-[1.6px] text-white/60 sm:block">
              Florida and North Carolina
            </div>
          </div>
        </Link>

        <div className="hidden min-w-0 justify-center px-2 xl:flex">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-full border border-white/60 bg-white/90 px-1 py-1 shadow-sm">
            {galacticNavLinks.map((link) => (
              <NavLink
                key={`${link.to}-${link.label}`}
                to={link.to}
                end={link.end}
                className="whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#4c1d95] transition-colors hover:text-[#7c3aed] xl:px-3"
                activeClassName="bg-violet-100 text-[#5b21b6]"
              >
                {t(link.label)}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Tablet+: phone / message emoji actions + live pill */}
          <div className="hidden items-center gap-1.5 md:flex md:gap-2">
            <a
              href={telHref}
              className={iconPillClass}
              aria-label={t("mockupV3NavCall")}
            >
              <span aria-hidden>📞</span>
            </a>
            <a
              href={smsHref}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ff3399] text-lg leading-none text-white shadow-[0_0_18px_rgba(255,51,153,0.45)] transition hover:bg-[#ff1a8c]"
              aria-label={t("indexHeroTextUsCta")}
            >
              <span aria-hidden>💬</span>
            </a>
            <div
              className="inline-flex h-10 max-w-[11rem] shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-2.5 text-[9px] font-semibold uppercase leading-tight tracking-wide text-white/90 sm:max-w-[13rem] sm:px-3 sm:text-[10px] xl:max-w-none"
              title={liveLabel}
            >
              <span className="relative flex size-2 shrink-0">
                <span
                  className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40"
                  aria-hidden
                />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" aria-hidden />
              </span>
              <span className="min-w-0 truncate">{liveLabel.toUpperCase()}</span>
            </div>
          </div>

          <div
            className="hidden h-10 w-px shrink-0 bg-gradient-to-b from-transparent via-white/20 to-transparent md:block"
            aria-hidden
          />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-full border border-white/15 bg-white/5 p-0.5">
              {languageOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLanguage(opt.value)}
                  className={cn(
                    "min-w-[2rem] rounded-full px-2 py-1 text-[10px] font-semibold transition sm:min-w-[2.25rem] sm:px-2.5",
                    language === opt.value ? "bg-white text-[#4c1d95]" : "text-white/70 hover:text-white",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10 xl:hidden">
                  <Menu className="size-6" aria-hidden />
                  <span className="sr-only">{t("menuToggle")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100vw-1rem,380px)] border-white/10 bg-[#1a0a2e] text-white">
                <nav className="mt-8 flex flex-col gap-1">
                  {galacticNavLinks.map((link) => (
                    <NavLink
                      key={`${link.to}-${link.label}`}
                      to={link.to}
                      end={link.end}
                      onClick={() => setSheetOpen(false)}
                      className="rounded-xl px-3 py-3 text-base font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                      activeClassName="bg-white/15 font-semibold text-white"
                    >
                      {t(link.label)}
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-6 flex gap-2 border-t border-white/10 pt-6">
                  <a
                    href={telHref}
                    className="flex flex-1 items-center justify-center rounded-2xl border border-white/25 py-4 text-2xl leading-none text-white transition hover:bg-white/5"
                    aria-label={t("mockupV3NavCall")}
                  >
                    <span aria-hidden>📞</span>
                  </a>
                  <a
                    href={smsHref}
                    className="flex flex-1 items-center justify-center rounded-2xl bg-[#ff3399] py-4 text-2xl leading-none text-white transition hover:bg-[#ff1a8c]"
                    aria-label={t("indexHeroTextUsCta")}
                  >
                    <span aria-hidden>💬</span>
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
