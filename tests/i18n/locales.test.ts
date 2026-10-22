import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detectLocale, isLocale, LOCALES } from '@/i18n/locales';
import { THEME_PREFERENCES } from '@/services/SettingsService';

type Tree = { readonly [key: string]: string | Tree };

/** Every leaf key, as "a.b.c". */
const keys = (tree: Tree, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`),
  );

const leaf = (tree: Tree, path: string): unknown =>
  path.split('.').reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree);

/** Raw files: importing them would go through the i18n compiler. */
const load = (locale: string): Tree =>
  JSON.parse(
    readFileSync(new URL(`../../src/i18n/locales/${locale}.json`, import.meta.url), 'utf8'),
  ) as Tree;

const MESSAGES: Record<string, Tree> = Object.fromEntries(
  LOCALES.map((locale) => [locale, load(locale)]),
);
const fr = MESSAGES.fr!;
/** The languages checked against the French reference. */
const OTHERS = LOCALES.filter((locale) => locale !== 'fr');

/**
 * Named placeholders of a message, such as `version` in "Version {version}", each once:
 * a plural message repeats them in every form.
 */
const placeholders = (text: unknown): string[] =>
  [...new Set([...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]!))].sort();

describe('translations', () => {
  const reference = keys(fr).sort();

  it.each(OTHERS)('%s has exactly the keys of the French reference', (locale) => {
    expect(keys(MESSAGES[locale]!).sort()).toEqual(reference);
  });

  it.each([...LOCALES])('%s has no empty message', (locale) => {
    for (const key of keys(MESSAGES[locale]!)) {
      expect(String(leaf(MESSAGES[locale]!, key)).trim(), key).not.toBe('');
    }
  });

  it.each([...LOCALES])('%s gives every plural message all its forms', (locale) => {
    // "zero | one | other", the forms vue-i18n's default rule picks for 0, 1 and more;
    // Russian: "zero | one | few | many" (src/i18n/plurals.ts).
    const forms = locale === 'ru' ? 4 : 3;
    for (const key of keys(MESSAGES[locale]!)) {
      const text = String(leaf(MESSAGES[locale]!, key));
      if (text.includes('|')) expect(text.split('|'), key).toHaveLength(forms);
    }
  });

  it.each(OTHERS)('%s keeps the placeholders of the French reference', (locale) => {
    for (const key of reference) {
      expect(placeholders(leaf(MESSAGES[locale]!, key)), key).toEqual(placeholders(leaf(fr, key)));
    }
  });

  it('names every language and theme the settings offer', () => {
    for (const code of LOCALES) expect(leaf(fr, `language.${code}`), code).toBeTypeOf('string');
    for (const theme of THEME_PREFERENCES) {
      expect(leaf(fr, `theme.${theme}`), theme).toBeTypeOf('string');
    }
  });
});

describe('typography', () => {
  const texts = (locale: string) =>
    keys(MESSAGES[locale]!).map((key) => [key, String(leaf(MESSAGES[locale]!, key))] as const);

  it('keeps French punctuation and guillemets on their word, with no-break spaces', () => {
    // A plain space would let "!" or ":" start a line on its own. Fredoka has no narrow
    // no-break space (U+202F): U+00A0 everywhere.
    for (const [key, text] of texts('fr')) {
      expect(text, key).not.toMatch(/ [:;!?%»]|« /);
    }
  });

  it('sets Russian punctuation close to its word, a dash and a unit apart from theirs', () => {
    for (const [key, text] of texts('ru')) {
      // No space before ! ? : ; in Russian; a no-break one before a dash and before %.
      expect(text, key).not.toMatch(/[  ][!?:;]| [—%]/);
    }
  });

  it.each([...LOCALES])('%s uses typographic apostrophes and quotation marks', (locale) => {
    for (const [key, text] of texts(locale)) expect(text, key).not.toMatch(/['"]/);
  });
});

describe('detectLocale', () => {
  it('takes the first supported language of the browser', () => {
    expect(detectLocale(['de-DE', 'fr-FR', 'en'])).toBe('fr');
    expect(detectLocale(['id-ID'])).toBe('id');
  });

  it('understands the legacy Indonesian code', () => {
    expect(detectLocale(['in-ID'])).toBe('id');
  });

  it('serves Russian to Russian speakers, and to Belarusian, Kazakh and Kyrgyz ones', () => {
    expect(detectLocale(['ru-RU'])).toBe('ru');
    expect(detectLocale(['be-BY', 'en'])).toBe('ru');
    expect(detectLocale(['kk'])).toBe('ru');
    expect(detectLocale(['ky-KG'])).toBe('ru');
  });

  it('keeps English for Ukrainian, unless Russian comes next', () => {
    expect(detectLocale(['uk-UA'])).toBe('en');
    expect(detectLocale(['uk-UA', 'ru-RU'])).toBe('ru');
  });

  it('falls back to English', () => {
    expect(detectLocale(['ja-JP'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });

  it('recognises supported locales only', () => {
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale(3)).toBe(false);
  });
});
