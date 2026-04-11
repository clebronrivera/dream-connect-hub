import { Link } from "react-router-dom";
import { Dog, Phone, Mail, MapPin, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BUSINESS } from "@/lib/constants/business";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Dog className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">Puppy Heaven</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("footerBrandDescription")}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("footerQuickLinks")}</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/puppies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footerAvailablePuppies")}
              </Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footerContactUs")}
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("footerContactUs")}</h4>
            <div className="flex flex-col gap-3">
              <a
                href={`tel:${BUSINESS.phoneRaw}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                {BUSINESS.phone}
              </a>
              <a
                href={`mailto:${BUSINESS.email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                {BUSINESS.email}
              </a>
            </div>
          </div>

          {/* Service Areas */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("footerServiceAreas")}</h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Florida
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                North Carolina
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t flex flex-col items-center gap-2">
          <p className="text-center text-sm text-muted-foreground">
            {BUSINESS.footerLine}
          </p>
          <p className="text-center text-xs text-muted-foreground/70">
            {BUSINESS.phone} · {BUSINESS.website} · {BUSINESS.tagline}
          </p>
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {BUSINESS.legalName}. {t("footerCopyrightSuffix")}
          </p>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            {t("footerAdminLogin")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
