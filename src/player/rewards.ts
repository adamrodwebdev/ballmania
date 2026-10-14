/**
 * Shards earned by playing (specification § 3.6). Shards only buy cosmetics:
 * nothing they buy makes a level easier.
 */
export const REWARDS = {
  /** Every campaign level won. */
  levelWon: 10,
  /** Each star a game adds to the campaign total. */
  perStarGained: 15,
  /** First attempt of the day's challenge, won: base plus stars. */
  dailyWon: 20,
  dailyPerStar: 10,
  /** First attempt of the day's challenge, lost: thanks for playing. */
  dailyTried: 10,
  /** Arcade: a puzzle solved for the first time, plus each of its stars. */
  puzzleSolved: 15,
  puzzlePerStar: 5,
  /** Arcade: the puzzle of the day solved at the first attempt. */
  dailyPuzzleSolved: 25,
  /** Arcade: a song cleared in Rhythm mode. */
  songCleared: 15,
  /** Arcade: a duel won, by difficulty. */
  duelWon: { easy: 10, normal: 20, hard: 40 },
  /** Arcade: shards per thousand points in Endless mode, at most `endlessMax` a game. */
  endlessPerThousand: 4,
  endlessMax: 40,
} as const;

/**
 * Portals (§ 3.7): what a continue or a puzzle hint costs in shards, the
 * way to get them without watching an ad; and the wait between two hints.
 */
export const CONTINUE_PRICE = 60;
export const HINT_PRICE = 20;
export const HINT_COOLDOWN = 60;

/** Failures in a row after which the assistance is offered (specification § 3.2). */
export const ASSIST_AFTER = 3;
/** The assisted chain moves this much slower. */
export const ASSIST_SPEED = 0.85;
