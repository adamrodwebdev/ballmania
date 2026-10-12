import { createI18n } from 'vue-i18n';
import type frMessages from './locales/fr.json';
import type { Locale } from './locales';

export { LOCALES, detectLocale, isLocale, type Locale } from './locales';

/** French is the reference: its keys define the schema the other locales must follow. */
export type MessageSchema = typeof frMessages;

/** Each language is a separate download: a visitor only loads the one they read. */
const LOADERS: Record<Locale, () => Promise<{ default: MessageSchema }>> = {
  fr: () => import('./locales/fr.json'),
  en: () => import('./locales/en.json'),
  id: () => import('./locales/id.json'),
};

export async function loadMessages(locale: Locale): Promise<MessageSchema> {
  return (await LOADERS[locale]()).default;
}

export async function createAppI18n(locale: Locale) {
  return createI18n<[MessageSchema], Locale, false>({
    legacy: false,
    locale,
    fallbackLocale: locale,
    messages: { [locale]: await loadMessages(locale) } as Record<Locale, MessageSchema>,
  });
}
