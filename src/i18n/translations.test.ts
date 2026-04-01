import { describe, expect, it } from "vitest";
import { supportedLanguages, translations } from "@/i18n/translations";

describe("translations dictionary parity", () => {
  it("keeps all language dictionaries aligned with english keys", () => {
    const baseKeys = Object.keys(translations.en).sort();

    for (const language of supportedLanguages) {
      const currentKeys = Object.keys(translations[language]).sort();
      expect(currentKeys).toEqual(baseKeys);
    }
  });
});
