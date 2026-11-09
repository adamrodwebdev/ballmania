import { describe, expect, it } from 'vitest';
import { SAVE_KEYS } from '@/platform/PlaygamaPlatform';

/*
 * Playgama hands the saves over in one call, for the keys it is given (`SAVE_KEYS`): a key the
 * game saves under but that list forgets is written, never read back. The keys come from the
 * code itself, so a new save cannot be forgotten.
 */

const SOURCES = import.meta.glob<string>('/src/**/*.{ts,vue}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Keys that live in the tab's session, never in a save: the studio intro, played once a visit. */
const SESSION_KEYS: readonly string[] = ['ballmania:intro'];

const savedKeys = Object.values(SOURCES)
  .flatMap((source) => [...source.matchAll(/_KEY = '(ballmania:[a-z-]+)'/g)])
  .map((match) => match[1]!)
  .filter((key) => !SESSION_KEYS.includes(key));

describe('the keys the portals read back', () => {
  it('finds the keys the game saves under', () => {
    expect(savedKeys).toEqual(expect.arrayContaining(['ballmania:player', 'ballmania:settings']));
  });

  it.each(savedKeys)('reads %s back from Playgama', (key) => {
    expect(SAVE_KEYS).toContain(key);
  });
});
