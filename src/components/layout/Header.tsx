import { useState } from "react";
import { Link } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Menu, PawPrint, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";

const languageOptions = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "pt", label: "PT" },
] as const;

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const navLinks = [
    { to: "/", label: t("navHome") },
    { to: "/puppies", label: t("navAvailablePuppies") },
    { to: "/upcoming-litters", label: t("navUpcomingLitters") },
    { to: "/breeds", label: t("navOurBreeds") },
    { to: "/contact", label: t("navContact") },
  ];

  return (
    <>
      {/* Top Info Bar */}
      <div className="bg-primary text-primary-foreground py-2 text-sm">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2">
          <a href="mailto:Dreampuppies22@gmail.com" className="flex items-center gap-2 hover:underline">
            <Mail className="h-4 w-4" />
            Dreampuppies22@gmail.com
          </a>
          <p className="text-center text-primary-foreground/90">
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
      <header className="sticky top-0 z-50 w-full bg-background border-b shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <PawPrint className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Puppy Heaven</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                activeClassName="text-primary"
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
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
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary py-2"
                    activeClassName="text-primary"
                  >
                    {link.label}
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
