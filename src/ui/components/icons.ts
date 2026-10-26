/**
 * The menus' line icons (v1.8.0), drawn on a 24-unit grid with a round
 * 2-unit stroke: one path each, so a template draws any of them alike.
 */

/** The two currencies' signs, filled: a shard's gem and a star fragment. */
export const SHARD_PATH = 'M12 2l7 7-7 13L5 9z';
export const FRAGMENT_PATH = 'M12 1l2.6 8.4H23l-6.8 5 2.6 8.4L12 17.6 5.2 22.8l2.6-8.4L1 9.4h8.4z';

/** The Workshop's departments. */
export const SLOT_ICONS = {
  shooter: 'M17 13a5 5 0 1 1-10 0 5 5 0 1 1 10 0M12 2v4M12 20v2M3 13h3M18 13h3',
  trail: 'M20 7a3 3 0 1 1-6 0 3 3 0 1 1 6 0M14.5 9.5L4 20M12.5 6.5L6 13M17.5 11.5L11 18',
  burst:
    'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8',
  board:
    'M6 4h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM8 14a4 4 0 1 1 4 4',
} as const;

/** The Observatory's ranges of effect. */
export const RANGE_ICONS = {
  shot: 'M19 12a7 7 0 1 1-14 0 7 7 0 1 1 14 0M13 12a1 1 0 1 1-2 0 1 1 0 1 1 2 0M12 2v3M12 19v3M2 12h3M19 12h3',
  chain:
    'M9.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 1 1 7 0M16 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 1 1 7 0M21.5 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0',
  weather:
    'M7 19h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.3 3.3 0 0 0 7 19zM17 3v2M21 7h-2M19.8 4.2l-1.4 1.4',
} as const;

/** States of a card: owned (a tick), locked (a padlock), playing (a triangle, filled). */
export const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5';
export const LOCK_PATH =
  'M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3';
export const PLAY_PATH = 'M8 5v14l11-7z';
