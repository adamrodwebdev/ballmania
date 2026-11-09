import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { SAVE_LIMITS } from '@/rules/limits';

/*
 * The theme script runs before the first paint, inline in the page (public/theme-boot.js): a
 * door too, so it reads the saved settings as the game does (9 Nov 2026), within their size
 * limit and from their own fields, each one checked against its list.
 */

const SCRIPT = readFileSync(new URL('../../public/theme-boot.js', import.meta.url), 'utf8');

/** What the script paints with this text saved as the settings, on a system in dark mode. */
function bootWith(saved: string | null) {
  const root = { dataset: { theme: '' }, lang: 'fr' };
  const bar = {
    content: '',
    setAttribute(_name: string, value: string) {
      this.content = value;
    },
  };
  runInNewContext(SCRIPT, {
    document: { documentElement: root, querySelector: () => bar },
    localStorage: { getItem: () => saved },
    window: { matchMedia: () => ({ matches: true }) },
  });
  return { theme: root.dataset.theme, lang: root.lang, bar: bar.content };
}

/** Saved settings padded with blank space to exactly `length` characters. */
const paddedTo = (length: number) => `{"theme":"light"}`.padEnd(length, ' ');

describe('the theme script', () => {
  it('paints the theme and the language the player chose', () => {
    expect(bootWith('{"theme":"light","locale":"ru"}')).toEqual({
      theme: 'light',
      lang: 'ru',
      bar: '#f4f2fb',
    });
  });

  it("follows the system's theme when the player chose it", () => {
    expect(bootWith('{"theme":"system"}').theme).toBe('dark');
  });

  it('reads saved settings exactly as long as their limit', () => {
    expect(bootWith(paddedTo(SAVE_LIMITS.settings)).theme).toBe('light');
  });

  it.each([
    { name: 'nothing saved', saved: null },
    { name: 'a theme it does not know', saved: '{"theme":"neon"}' },
    { name: 'a theme in a list', saved: '{"theme":["light"]}' },
    { name: 'a theme under the prototype key', saved: '{"__proto__":{"theme":"light"}}' },
    { name: 'a list', saved: '["light"]' },
    { name: 'a text', saved: '"light"' },
    { name: 'a text cut short', saved: '{"theme":"li' },
    { name: 'settings one character over their limit', saved: paddedTo(SAVE_LIMITS.settings + 1) },
  ])('paints the dark theme for $name', ({ saved }) => {
    expect(bootWith(saved)).toMatchObject({ theme: 'dark', bar: '#05030d' });
  });

  it.each([
    { name: 'a language it does not know', saved: '{"locale":"de"}' },
    { name: 'an inherited name', saved: '{"locale":"constructor"}' },
    { name: 'a language in a list', saved: '{"locale":["ru"]}' },
    { name: 'another case', saved: '{"locale":"RU"}' },
  ])('leaves the page in French for $name', ({ saved }) => {
    expect(bootWith(saved).lang).toBe('fr');
  });
});
