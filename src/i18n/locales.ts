export const LOCALES = ['fr', 'en', 'id', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/**
 * Languages read as one of ours: "in" is the legacy code for Indonesian, still
 * sent by some Android browsers; Belarusian, Kazakh and Kyrgyz speakers get
 * Russian, an official language of their countries too, rather than English.
 * A map, not an object: a language named `constructor` or `__proto__` finds nothing.
 */
const READ_AS: ReadonlyMap<string, Locale> = new Map([
  ['in', 'id'],
  ['be', 'ru'],
  ['kk', 'ru'],
  ['ky', 'ru'],
]);

/** First supported language among the browser's preferences, English otherwise. */
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const language = tag.toLowerCase().split('-')[0] ?? '';
    const normalised = READ_AS.get(language) ?? language;
    if (isLocale(normalised)) return normalised;
  }
  return 'en';
}
