import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: new (
          config: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay: boolean;
            layout?: unknown;
          },
          elementId: string
        ) => unknown;
      };
    };
  }
}

const SCRIPT_ID = "google-translate-script";
const CONTAINER_ID = "google_translate_element_runtime";

function applyGoogleLanguage(language: "en" | "es" | "pt") {
  const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
  if (!combo) return;
  combo.value = language;
  combo.dispatchEvent(new Event("change"));
}

export function GoogleTranslateRuntime() {
  const { language } = useLanguage();
  const location = useLocation();
  const isPublicRoute = !location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!isPublicRoute || typeof window === "undefined") return;

    if (window.google?.translate?.TranslateElement) {
      applyGoogleLanguage(language);
      return;
    }

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      // Keep Google widget hidden; app selector controls language changes.
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,es,pt",
          autoDisplay: false,
        },
        CONTAINER_ID
      );
      applyGoogleLanguage(language);
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!existing) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isPublicRoute, language]);

  if (!isPublicRoute) return null;
  return <div id={CONTAINER_ID} className="hidden" aria-hidden />;
}
