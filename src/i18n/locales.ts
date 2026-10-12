export const LOCALES = ['fr', 'en', 'id'] as const;
export type Locale = (typeof LOCALES)[number];

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** First supported language among the browser's preferences, English otherwise. */
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const language = tag.toLowerCase().split('-')[0];
    // "in" is the legacy code for Indonesian, still sent by some Android browsers.
    const normalised = language === 'in' ? 'id' : language;
    if (isLocale(normalised)) return normalised;
  }
  return 'en';
}
