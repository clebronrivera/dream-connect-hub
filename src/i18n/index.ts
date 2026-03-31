import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/resources/en";
import pt from "@/i18n/resources/pt";
import es from "@/i18n/resources/es";

export const LANGUAGE_STORAGE_KEY = "preferred-language";
export const SUPPORTED_LANGUAGES = ["en", "pt", "es"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_TO_HTML_LANG: Record<SupportedLanguage, string> = {
  en: "en",
  pt: "pt-BR",
  es: "es-419",
};

const resources = {
  en: { translation: en },
  pt: { translation: pt },
  es: { translation: es },
} as const;

export function normalizeSupportedLanguage(
  value: string | null | undefined
): SupportedLanguage | undefined {
  if (!value) return undefined;

  const normalized = value.toLowerCase();
  if (normalized.startsWith("pt")) return "pt";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("en")) return "en";
  return undefined;
}

function readStoredLanguage(): SupportedLanguage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return normalizeSupportedLanguage(
      window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    );
  } catch {
    return undefined;
  }
}

function getInitialLanguage(): SupportedLanguage {
  return readStoredLanguage() ?? "en";
}

function syncDocumentLanguage(language: SupportedLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = LANGUAGE_TO_HTML_LANG[language];
}

function persistLanguage(language: SupportedLanguage) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures.
  }
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,
  });
}

const currentLanguage =
  normalizeSupportedLanguage(i18n.resolvedLanguage ?? i18n.language) ?? "en";

syncDocumentLanguage(currentLanguage);
persistLanguage(currentLanguage);

i18n.on("languageChanged", (language) => {
  const normalized = normalizeSupportedLanguage(language) ?? "en";
  syncDocumentLanguage(normalized);
  persistLanguage(normalized);
});

export function getLanguageDisplayName(language: SupportedLanguage) {
  switch (language) {
    case "pt":
      return "Português";
    case "es":
      return "Español";
    case "en":
    default:
      return "English";
  }
}

export async function setAppLanguage(language: SupportedLanguage) {
  await i18n.changeLanguage(language);
}

export default i18n;
