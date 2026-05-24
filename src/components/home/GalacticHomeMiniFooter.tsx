import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BUSINESS } from "@/lib/constants/business";
import { useBusinessInfoOrDefaults } from "@/lib/hooks/useBusinessInfo";

export function GalacticHomeMiniFooter() {
  const { t } = useLanguage();
  const businessInfo = useBusinessInfoOrDefaults();

  return (
    <footer className="border-t border-white/10 bg-black py-12 text-white/80">
      <div className="mx-auto max-w-screen-2xl px-6 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/dream-puppies-logo.png" alt="Dream Puppies logo" className="h-6 w-6 rounded-full object-cover" />
              <span className="font-display text-lg text-white">Dream Puppies</span>
            </Link>
            <p className="text-sm text-white/70">{t("footerBrandDescription")}</p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white">{t("footerQuickLinks")}</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/puppies" className="text-sm text-white/70 transition-colors hover:text-white">
                {t("footerAvailablePuppies")}
              </Link>
              <Link to="/contact" className="text-sm text-white/70 transition-colors hover:text-white">
                {t("footerContactUs")}
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white">{t("footerContactUs")}</h4>
            <div className="flex flex-col gap-3">
              <a
                href={`tel:${businessInfo.phoneRaw}`}
                className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4" />
                {businessInfo.phone}
              </a>
              <a
                href={`mailto:${businessInfo.email}`}
                className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4" />
                {businessInfo.email}
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white">{t("footerServiceAreas")}</h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <MapPin className="h-4 w-4" />
                Orlando, FL
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <MapPin className="h-4 w-4" />
                Raeford, NC
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-white/10 pt-8">
          <p className="text-center text-sm text-white/70">{BUSINESS.footerLine}</p>
          <p className="text-center text-xs text-white/55">
            {businessInfo.phone} · {BUSINESS.website}
          </p>
          <p className="text-center text-sm text-white/70">
            © {new Date().getFullYear()} {BUSINESS.legalName}. {t("footerCopyrightSuffix")}
          </p>
          <p className="text-center text-xs text-white/40">
            Owned and operated by Lebron &middot;{" "}
            <a href="mailto:clebronrivera@icloud.com" className="transition-colors hover:text-white">
              clebronrivera@icloud.com
            </a>
          </p>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
          >
            <Lock className="h-3.5 w-3.5" />
            {t("footerAdminLogin")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
