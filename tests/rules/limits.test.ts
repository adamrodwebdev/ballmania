import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PUZZLES } from '@/levels/arcade/puzzles';
import { CAMPAIGN, WORLDS } from '@/levels/campaign';
import { ACHIEVEMENTS, EMPTY_STATS } from '@/player/achievements';
import { COSMETICS, DEFAULT_LOOK } from '@/player/catalog';
import { UPGRADE_IDS } from '@/engine/upgrades/Upgrades';
import { COUNT_LIMITS, SAVE_LIMITS } from '@/rules/limits';
import { SETTINGS_KEY } from '@/services/SettingsService';

/*
 * The limits stand far above what the game ever writes (9 Nov 2026): the fullest save of today's
 * game, with a year of daily play, takes a tenth of its limit at most, so a real save always
 * reads back, for years to come.
 */

/** A score as the difficulties leave it: whole points times 0.8 or 1.3, with float noise. */
const SCORE = 123_456.00000000001;
/** A year of days, as the saves key them. */
const YEAR = Array.from({ length: 366 }, (_, i) =>
  new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10).replaceAll('-', ''),
);

const FULLEST = {
  settings: {
    locale: 'id',
    theme: 'system',
    effects: 'spectacular',
    volume: 0.35,
    music: 0.05,
    muted: false,
    vibration: true,
    aimAssist: false,
    difficulty: 'explorer',
  },
  progress: {
    version: 1,
    levels: Object.fromEntries(CAMPAIGN.map((level) => [level.id, { stars: 3, best: SCORE }])),
  },
  arcade: {
    version: 1,
    endless: SCORE,
    puzzles: Object.fromEntries(PUZZLES.map((puzzle) => [puzzle.id, { stars: 3, shots: 12 }])),
    dailyPuzzles: Object.fromEntries(YEAR.map((day) => [day, { won: true, shots: 12 }])),
    songs: { pulse: SCORE, drive: SCORE, rush: SCORE },
    duels: { easy: 999, normal: 999, hard: 999 },
  },
  player: {
    version: 2,
    shards: 1_234_567,
    owned: COSMETICS.map((item) => item.id),
    equipped: DEFAULT_LOOK,
    stats: Object.fromEntries(Object.keys(EMPTY_STATS).map((name) => [name, 123_456_789])),
    achievements: ACHIEVEMENTS.map((achievement) => achievement.id),
    worlds: WORLDS.map((world) => world.id),
    daily: Object.fromEntries(YEAR.map((day) => [day, { score: SCORE, stars: 3, won: true }])),
    failures: Object.fromEntries(CAMPAIGN.map((level) => [level.id, 999])),
    fragments: 123_456,
    upgrades: Object.fromEntries(UPGRADE_IDS.map((id) => [id, 3])),
    gift: { last: '20261109', streak: 7 },
    tips: ['observatory'],
    training: { step: 3, done: true },
  },
} as const;

describe('the limits of what the game reads back', () => {
  it.each(Object.keys(SAVE_LIMITS) as (keyof typeof SAVE_LIMITS)[])(
    'leave the fullest %s save of today, with a year of daily play, under a tenth of its limit',
    (save) => {
      expect(JSON.stringify(FULLEST[save]).length).toBeLessThan(SAVE_LIMITS[save] / 10);
    },
  );

  it.each([
    { list: 'levels', today: CAMPAIGN.length },
    { list: 'owned', today: COSMETICS.length },
    { list: 'achievements', today: ACHIEVEMENTS.length },
    { list: 'worlds', today: WORLDS.length },
  ] as const)('leave room for ten times the $list of today', ({ list, today }) => {
    expect(today * 10).toBeLessThanOrEqual(COUNT_LIMITS[list]);
  });

  it('leave room for a puzzle under every id two digits can name', () => {
    expect(PUZZLES.length).toBeLessThanOrEqual(COUNT_LIMITS.puzzles);
    expect(COUNT_LIMITS.puzzles).toBe(100);
  });

  it('give the theme script the size limit of the settings it reads before the first paint', () => {
    const script = readFileSync(new URL('../../public/theme-boot.js', import.meta.url), 'utf8');
    expect(script).toContain(`localStorage.getItem('${SETTINGS_KEY}')`);
    expect(script).toContain(`text.length <= ${SAVE_LIMITS.settings}`);
  });
});
