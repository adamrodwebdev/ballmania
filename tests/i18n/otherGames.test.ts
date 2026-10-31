import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/i18n/locales';

/**
 * No other game is named where players and portals read Ballmania
 * (specification § 2.3, rights review of 31/10/2026): the strings in every
 * language, the portal kits and trailers, the page and its manifest, and the
 * names of the files that ship. Rules are free, names are marks: one name in a
 * title, a listing or a string can be enough for a portal to remove a game.
 */
const OTHER_GAMES =
  /\b(zuma|luxor|popcap|mumbo ?jumbo|puzz ?loop|tetris|tetrimino|candy ?crush|bejeweled|peggle|bubble witch)\b/i;

/** What the genre's best-known game calls its power balls: Ballmania keeps names of its own. */
const THEIR_POWER_NAMES = /\b(slow-?down|backwards|accuracy|explosion)\b/i;

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

/** Every file under a folder of the repository, as a path from its root. */
const filesIn = (folder: string): string[] =>
  readdirSync(join(ROOT, folder), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)).split(sep).join('/'));

/** What players and portals read: the strings, the portal kits and trailers, the page. */
const TEXTS = [
  ...LOCALES.map((locale) => `src/i18n/locales/${locale}.json`),
  ...filesIn('marketing').filter((path) => /\.(md|html|ts|mjs)$/.test(path)),
  'index.html',
  'public/manifest.webmanifest',
  'vite.config.ts',
];

describe('other games', () => {
  it.each(TEXTS)('%s names no other game', (path) => {
    expect(read(path).match(OTHER_GAMES)?.[0]).toBeUndefined();
  });

  it('no file that ships or goes to a portal is named after another game', () => {
    const named = ['src', 'public', 'marketing'].flatMap(filesIn);
    expect(named.filter((path) => OTHER_GAMES.test(path))).toEqual([]);
  });

  it.each(LOCALES)("the power names in %s are Ballmania's own", (locale) => {
    const { power } = JSON.parse(read(`src/i18n/locales/${locale}.json`)) as {
      power: Record<string, { name: string }>;
    };
    const names = Object.values(power).map((each) => each.name);
    expect(names.filter((name) => THEIR_POWER_NAMES.test(name))).toEqual([]);
  });
});
