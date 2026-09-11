import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
};

const applyDocumentLang = (lng?: string) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = (lng || 'fr').slice(0, 2);
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: {
      de: ['en', 'fr'],
      es: ['en', 'fr'],
      default: ['fr'],
    },
    supportedLngs: ['fr', 'en', 'de', 'es'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    debug: false,

    detection: {
      order: ['localStorage', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },
  });

applyDocumentLang(i18n.language);
i18n.on('languageChanged', applyDocumentLang);

export default i18n;
