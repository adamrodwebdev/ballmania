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
} as const;

/** Failures in a row after which the assistance is offered (specification § 3.2). */
export const ASSIST_AFTER = 3;
/** The assisted chain moves this much slower. */
export const ASSIST_SPEED = 0.85;
