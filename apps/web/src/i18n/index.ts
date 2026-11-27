// BP-UX-007: pt-BR default, en second locale. Resources are bundled: no HTTP backend
// (BP-NFR-003). Language switching UI lands with S-10 Sobre (T-066).
import i18next, { type i18n } from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "./locales/pt-BR.json";
import en from "./locales/en.json";

export const LANGUAGES = ["pt-BR", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "pt-BR";

export const resources = {
  "pt-BR": { translation: ptBR },
  en: { translation: en },
} as const;

/** Missing keys seen at runtime (tests assert this stays empty). */
export const missingKeys: string[] = [];

export function createI18n(lng: Language = DEFAULT_LANGUAGE): i18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...LANGUAGES],
    resources,
    initAsync: false,
    interpolation: { escapeValue: false }, // React escapes
    returnNull: false,
    saveMissing: true,
    missingKeyHandler: (_lngs, _ns, key) => {
      missingKeys.push(key);
    },
  });
  return instance;
}
