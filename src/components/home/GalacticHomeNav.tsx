import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, ChevronDown, Phone, MessageCircle } from "lucide-react";
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
  { value: "en", label: "EN", full: "English" },
  { value: "es", label: "ES", full: "Español" },
  { value: "pt", label: "PT", full: "Português" },
] as const;

const optionalShopBreedsNav: { to: string; label: TranslationKey }[] = PUBLIC_SHOW_SHOP_AND_BREEDS_NAV
  ? [
      { to: "/breeds", label: "navShortBreeds" },
      { to: "/essentials", label: "navShortShop" },
    ]
  : [];

/** Shown in the integrated nav bar; `end` avoids matching every route for `/`. */
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

/**
 * Cyber-Neon nav: borderless integrated nav links with neon-glow + underline
 * active state; glassmorphic control center for call / text / LIVE; language
 * collapsed into a dropdown menu.
 */
export function GalacticHomeNav() {
  const { t, language, setLanguage } = useLanguage();
  const businessInfo = useBusinessInfoOrDefaults();
  const [sheetOpen, setSheetOpen] = useState(false);
  const liveLabel = t("indexHeroEyebrow").replace(/^[●•]\s*/u, "").trim();

  const smsPrefillBody = `Hi ${BUSINESS.primaryBrand}, I'm interested in learning more about your available puppies. Can you send me more information?`;
  const smsHref = `sms:+1${businessInfo.phoneRaw}?body=${encodeURIComponent(smsPrefillBody)}`;
  const telHref = `tel:+1${businessInfo.phoneRaw}`;

  return (
    <nav className="sticky top-0 z-[100] border-b border-white/5 bg-[rgba(15,4,27,0.85)] backdrop-blur-2xl">
      {/* subtle scanline gradient adds the cyber feel without a heavy image */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,51,153,0.10), transparent 70%), radial-gradient(ellipse 80% 100% at 100% 100%, rgba(124,58,237,0.10), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto grid min-h-[64px] max-w-screen-2xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2 sm:px-6 lg:min-h-[68px] lg:px-8">
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

        {/* Borderless integrated nav with neon-glow active state */}
        <div className="hidden min-w-0 justify-center px-2 xl:flex">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
            {galacticNavLinks.map((link) => (
              <NavLink
                key={`${link.to}-${link.label}`}
                to={link.to}
                end={link.end}
                className="group relative whitespace-nowrap px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 transition-all hover:text-white xl:px-3"
                activeClassName="!text-white [text-shadow:0_0_12px_rgba(255,51,153,0.7),0_0_24px_rgba(124,58,237,0.45)]"
              >
                {({ isActive }) => (
                  <>
                    <span className="relative z-10">{t(link.label)}</span>
                    {/* underline indicator — visible on active, faintly on hover */}
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-x-2 -bottom-0.5 h-[2px] rounded-full transition-all",
                        isActive
                          ? "bg-gradient-to-r from-[#ff3399] via-[#ff66cc] to-[#7c3aed] opacity-100 shadow-[0_0_8px_rgba(255,51,153,0.7)]"
                          : "bg-white/40 opacity-0 group-hover:opacity-60",
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Glassmorphic Control Center: phone | text | live indicator */}
          <div className="hidden md:block">
            <ControlCenter
              telHref={telHref}
              smsHref={smsHref}
              liveLabel={liveLabel}
              callLabel={t("mockupV3NavCall")}
              textLabel={t("indexHeroTextUsCta")}
            />
          </div>

          {/* Language dropdown — collapses 3-button row to single trigger */}
          <LanguageDropdown
            value={language}
            onChange={setLanguage}
            label={t("languageLabel")}
          />

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
                    activeClassName="bg-white/15 font-semibold text-white [text-shadow:0_0_8px_rgba(255,51,153,0.5)]"
                  >
                    {t(link.label)}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-6 flex gap-2 border-t border-white/10 pt-6">
                <a
                  href={telHref}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/25 py-4 text-base font-semibold text-white transition hover:bg-white/5"
                  aria-label={t("mockupV3NavCall")}
                >
                  <Phone className="size-5" aria-hidden /> Call
                </a>
                <a
                  href={smsHref}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#ff3399] to-[#cc2277] py-4 text-base font-semibold text-white shadow-[0_0_20px_rgba(255,51,153,0.4)] transition hover:from-[#ff1a8c] hover:to-[#b81f6b]"
                  aria-label={t("indexHeroTextUsCta")}
                >
                  <MessageCircle className="size-5" aria-hidden /> Text
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

/**
 * Glassmorphic panel grouping the phone + text + LIVE indicator. Skeuomorphic-
 * modern icon treatment (gradient + inner highlight + drop-shadow) and a glowing
 * green light strip at the base as the LIVE status signal.
 */
function ControlCenter({
  telHref,
  smsHref,
  liveLabel,
  callLabel,
  textLabel,
}: {
  telHref: string;
  smsHref: string;
  liveLabel: string;
  callLabel: string;
  textLabel: string;
}) {
  return (
    <div
      className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.07] px-2 py-1.5 backdrop-blur-xl"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px -8px rgba(0,0,0,0.4)",
      }}
      title={liveLabel}
    >
      <a
        href={telHref}
        className="group/icon relative inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-white/15 to-white/[0.04] text-white transition hover:from-white/25 hover:to-white/10"
        aria-label={callLabel}
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.25)",
        }}
      >
        <Phone className="size-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" aria-hidden />
      </a>
      <a
        href={smsHref}
        className="group/icon relative inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff3399] to-[#cc2277] text-white transition hover:from-[#ff66b3] hover:to-[#d92b85]"
        aria-label={textLabel}
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 16px rgba(255,51,153,0.45), 0 2px 6px rgba(0,0,0,0.3)",
        }}
      >
        <MessageCircle className="size-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" aria-hidden />
      </a>
      <div className="flex items-center gap-1.5 pl-1 pr-1.5">
        <span className="relative flex size-2 shrink-0">
          <span
            className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50"
            aria-hidden
          />
          <span
            className="relative inline-flex size-2 rounded-full bg-emerald-400"
            style={{ boxShadow: "0 0 6px rgba(74,222,128,0.9), 0 0 12px rgba(74,222,128,0.5)" }}
            aria-hidden
          />
        </span>
        <span className="hidden text-[9px] font-semibold uppercase leading-tight tracking-widest text-white/80 lg:inline">
          {liveLabel}
        </span>
      </div>

      {/* glowing green light strip at the base — the dynamic status signal */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
        style={{ boxShadow: "0 0 8px rgba(74,222,128,0.7), 0 0 14px rgba(74,222,128,0.4)" }}
      />
    </div>
  );
}

/** Single-trigger language dropdown — replaces the horizontal EN/ES/PT row. */
function LanguageDropdown({
  value,
  onChange,
  label,
}: {
  value: "en" | "es" | "pt";
  onChange: (v: "en" | "es" | "pt") => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = languageOptions.find((o) => o.value === value) ?? languageOptions[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/15 bg-white/[0.06] px-2.5 text-[11px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur-md transition hover:bg-white/10"
      >
        <span>{current.label}</span>
        <ChevronDown
          className={cn(
            "size-3 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-full z-50 mt-2 min-w-[8rem] overflow-hidden rounded-xl border border-white/10 bg-[#1a0a2e]/95 shadow-xl backdrop-blur-xl"
        >
          {languageOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium transition",
                value === opt.value
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <span>{opt.full}</span>
              <span className="text-[10px] uppercase tracking-widest text-white/50">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
