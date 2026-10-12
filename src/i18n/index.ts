import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import fr from './locales/fr.json';
import id from './locales/id.json';
import type { Locale } from './locales';

export { LOCALES, detectLocale, isLocale, type Locale } from './locales';

/** French is the reference: its keys define the schema the other locales must follow. */
export type MessageSchema = typeof fr;

export function createAppI18n(locale: Locale) {
  return createI18n<[MessageSchema], Locale, false>({
    legacy: false,
    locale,
    fallbackLocale: 'fr',
    messages: { fr, en, id },
  });
}
