# Public Site Translations

This project supports three customer-facing languages:

- `en` (English)
- `es` (Spanish)
- `pt` (Portuguese)

Admin routes remain English-only.

## How language works

- Language state is managed by `src/contexts/LanguageContext.tsx`.
- First visit defaults from browser language (`es`, `pt`, otherwise `en`).
- User choice is saved in localStorage under `puppy-heaven-language`.
- Public pages load Google Translate runtime widget to translate dynamic rendered content.

## Adding new public UI text

1. Add a new key to `translations.en` in `src/i18n/translations.ts`.
2. Add the same key to `translations.es` and `translations.pt`.
3. Use `useLanguage()` and `t("yourKey")` in public components/pages.

## i18n Strategy Decision (2026-04-01)

**Authoritative system:** `LanguageContext` + `src/i18n/translations.ts` (EN/ES/PT static keys).

**Runtime layer:** `GoogleTranslateRuntime.tsx` is loaded on public routes and handles content not covered by static keys. It is a progressive enhancement, not a replacement for the static system.

**i18next removed:** The `i18next` and `react-i18next` packages were confirmed 100% unused in source code and removed from `package.json` in Phase 5 (2026-04-01). They were never imported anywhere — only listed as orphan dependencies. Removing them eliminates ~100 KB from the bundle.

**Rule:** New public UI text must be added to `src/i18n/translations.ts` (all three locales). Do not introduce i18next or any second translation framework.

## Guardrail

`src/i18n/translations.test.ts` enforces dictionary key parity across `en`, `es`, and `pt`.
If you forget to add a key in one language, tests fail.
