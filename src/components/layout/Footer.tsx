import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dog, Phone, Mail, MapPin, Lock } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Dog className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">
                {t("layout.header.logo")}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("layout.footer.brandDescription")}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">
              {t("layout.footer.quickLinks")}
            </h4>
            <nav className="flex flex-col gap-2">
              <Link to="/puppies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("layout.footer.availablePuppies")}
              </Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("layout.footer.contactUs")}
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">
              {t("layout.footer.contactUs")}
            </h4>
            <div className="flex flex-col gap-3">
              <a 
                href="tel:321-697-8864" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                321-697-8864
              </a>
              <a 
                href="mailto:Dreampuppies22@gmail.com" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                Dreampuppies22@gmail.com
              </a>
            </div>
          </div>

          {/* Service Areas */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">
              {t("layout.footer.serviceAreas")}
            </h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {t("states.FL")}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {t("states.NC")}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t flex flex-col items-center gap-2">
          <p className="text-center text-sm text-muted-foreground">
            {t("layout.footer.allRightsReserved", {
              year: new Date().getFullYear(),
            })}
          </p>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            {t("layout.footer.adminLogin")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
