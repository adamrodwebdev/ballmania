import type { NumberRule } from './input';

/*
 * The limits of what the game reads from outside (the rule of 9 Nov 2026): its saves and
 * settings, wherever a platform keeps them, the portals' SDKs, its own workers' messages and the
 * settings sliders. One table: every reader takes its maximum from here. Each limit stands far
 * above what the game ever writes, so a real save always reads back; a value beyond it is
 * refused, never cut.
 */

/** The longest text of each kind, in characters once cleaned. */
export const TEXT_LIMITS = {
  /** An id the game writes: a level ("singularity-12"), a cosmetic ("board-singularity"), an achievement, a world. */
  identifier: 32,
  /** A day of the calendar as the saves key it: "20261109". */
  day: 8,
  /** A language tag from a portal or the browser ("id-ID"): BCP 47 asks to read 35 characters. */
  languageTag: 35,
  /** A colour token handed to a worker: "#ff3b6b", or "#rrggbbaa". */
  colour: 9,
  /** A link a portal gives for a shared result. */
  link: 2_048,
  /** An error code or an event name a portal's SDK gives. */
  sdkCode: 64,
} as const;

/**
 * The longest text of each save read back, in UTF-16 units, checked before `JSON.parse`. At
 * their fullest on 9 Nov 2026: settings 156, campaign 3 648 (72 levels), arcade 1 257 and
 * 12 810 more a year of daily puzzles, profile 2 840 and 22 326 more a year of daily
 * challenges (tests/rules/limits.test.ts keeps a year of it under a tenth of each limit).
 */
export const SAVE_LIMITS = {
  settings: 4_096,
  progress: 65_536,
  arcade: 1_048_576,
  player: 1_048_576,
} as const;

/** The most items of each list or map read from outside. */
export const COUNT_LIMITS = {
  /** Levels of the campaign in a save: 72 today. */
  levels: 1_000,
  /** Puzzles solved: 30 today, and their ids have two digits. */
  puzzles: 100,
  /** Days with a record: a hundred years of daily challenges or daily puzzles. */
  days: 36_600,
  /** Cosmetics owned: 20 today. */
  owned: 1_000,
  /** Achievements reached: 28 today. */
  achievements: 1_000,
  /** Worlds finished: 6 today. */
  worlds: 100,
  /** One-time tips already shown: 1 today. */
  tips: 100,
  /** Fields of the player's data on a portal's servers: the game writes three. */
  portalFields: 64,
} as const;

/** The ranges of the numbers read from outside. */
export const NUMBER_RULES = {
  /** What the game counts in whole units: shards, fragments, games, balls, shots, wins. */
  count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
  /** Points: whole in play, but a difficulty's factor (0.8, 1.3) leaves decimals in saved scores. */
  score: { min: 0, max: Number.MAX_SAFE_INTEGER },
  /** A volume, from silent to full. */
  volume: { min: 0, max: 1 },
  /** A settings slider, in whole percents. */
  percent: { min: 0, max: 100, integer: true },
} as const satisfies Readonly<Record<string, NumberRule>>;
