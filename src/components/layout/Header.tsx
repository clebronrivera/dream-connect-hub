import { useState } from "react";
import { Link } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Menu, PawPrint, Mail, Phone, Sparkles } from "lucide-react";
import { BUSINESS } from "@/lib/constants/business";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import { DreamTag, StickerButton } from "@/components/redesign/PublicDesignPrimitives";

const languageOptions = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "pt", label: "PT" },
] as const;

const navLinks: { to: string; label: TranslationKey }[] = [
  { to: "/puppies", label: "navShortAvailable" },
  { to: "/upcoming-litters", label: "navShortUpcoming" },
  { to: "/breeds", label: "navShortBreeds" },
  { to: "/training-plan", label: "navShortTraining" },
  { to: "/essentials", label: "navShortShop" },
  { to: "/dreamy-reviews", label: "navShortReviews" },
  { to: "/faq", label: "navShortFaq" },
  { to: "/contact", label: "navShortContact" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  return (
    <>
      {/* Top Info Bar */}
      <div className="bg-bg text-white py-2 text-sm">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <a href={`tel:${BUSINESS.phoneRaw}`} className="flex items-center gap-2 hover:underline">
              <Phone className="h-4 w-4" />
              {BUSINESS.phone}
            </a>
            <a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-2 hover:underline">
              <Mail className="h-4 w-4" />
              {BUSINESS.email}
            </a>
          </div>
          <p className="text-center text-white/90">
            {t("topBarServiceAreas")}
          </p>
          <div className="flex items-center gap-1" aria-label={t("languageLabel")}>
            {languageOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={language === option.value ? "secondary" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => setLanguage(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Header */}
      <header className="sticky top-0 z-50 w-full border-b border-line bg-paper/95 backdrop-blur">
        <div className="container flex min-h-[76px] items-center justify-between gap-3 py-2.5">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent via-primary to-cyan">
              <PawPrint className="h-5 w-5 text-ink" />
            </div>
            <div>
              <p className="font-display text-[17px] leading-none uppercase tracking-tight text-ink">Dream Puppies</p>
              <p className="micro-label text-[9px] text-inkSoft">
                a Dream Enterprises LLC company
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1 rounded-pill bg-muted p-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="rounded-pill px-3.5 py-2 text-[12px] font-semibold uppercase tracking-[0.03em] text-inkSoft transition-colors hover:bg-white hover:text-ink"
                activeClassName="bg-primary text-ink shadow-sm ring-1 ring-ink/10"
              >
                {t(link.label)}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2.5">
            <DreamTag className="bg-sun">FL · Raeford, NC</DreamTag>
            <StickerButton asChild size="sm" className="gap-1.5 px-3.5 text-[12px]">
              <Link to="/upcoming-litters" className="inline-flex items-center gap-1.5">
                {t("navReserveNowCta")}
                <Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              </Link>
            </StickerButton>
          </div>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="xl:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t("menuToggle")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="mt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  {t("languageLabel")}
                </p>
                <div className="flex items-center gap-2">
                  {languageOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={language === option.value ? "default" : "outline"}
                      onClick={() => setLanguage(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <nav className="flex flex-col gap-1 mt-8">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-medium text-muted-foreground transition-colors hover:text-ink rounded-xl px-3 py-2"
                    activeClassName="bg-primary/20 text-ink font-semibold"
                  >
                    {t(link.label)}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
