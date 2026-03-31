import { useTranslation } from "react-i18next";
import {
  SUPPORTED_LANGUAGES,
  getLanguageDisplayName,
  normalizeSupportedLanguage,
  setAppLanguage,
  type SupportedLanguage,
} from "@/i18n";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { i18n, t } = useTranslation();
  const currentLanguage =
    normalizeSupportedLanguage(i18n.resolvedLanguage ?? i18n.language) ?? "en";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="sr-only">{t("languageSwitcher.label")}</span>
      <ToggleGroup
        type="single"
        value={currentLanguage}
        onValueChange={(value) => {
          if (!value) return;
          void setAppLanguage(value as SupportedLanguage);
        }}
        variant="outline"
        size="sm"
        aria-label={t("languageSwitcher.label")}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <ToggleGroupItem
            key={language}
            value={language}
            aria-label={getLanguageDisplayName(language)}
            title={getLanguageDisplayName(language)}
            className="min-w-10 px-2 uppercase"
          >
            {language}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
