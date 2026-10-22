import type { Locale } from '@/i18n/locales';

/**
 * The faces a language's own letters need (src/styles/russian.css): asked for
 * before the first paint, so its text never jumps when they arrive. Latin
 * languages need none: the game's faces come with the page.
 */
const FACES: Partial<
  Record<Locale, { readonly faces: readonly string[]; readonly sample: string }>
> = {
  ru: {
    faces: [
      '400 1em "Ballmania Russian"',
      '700 1em "Ballmania Russian"',
      '800 1em "Ballmania Russian"',
      '400 1em "Ballmania Russian Display"',
    ],
    sample: 'Жж',
  },
};

/** Waits for a language's faces, but never longer than `limit`: then the text swaps in. */
export async function fontsFor(locale: Locale, limit = 1500): Promise<void> {
  const needed = FACES[locale];
  if (!needed || typeof document === 'undefined' || !('fonts' in document)) return;
  const loaded = Promise.all(needed.faces.map((face) => document.fonts.load(face, needed.sample)));
  await Promise.race([
    loaded.then(
      () => undefined,
      () => undefined,
    ),
    new Promise<void>((resolve) => setTimeout(resolve, limit)),
  ]);
}
