/** Points per destroyed ball, before multipliers. */
export const POINTS_PER_BALL = 10;
/** Bonus per shot of a streak beyond the second one. */
export const STREAK_BONUS = 20;
/** Bonus for finishing a level. */
export const CLEAR_BONUS = 300;
/** Bonus per second saved under the par time. */
export const SPEED_BONUS = 10;

/**
 * The score of a game. Rules (specification § 3.1):
 * - each explosion is worth balls × 10 × depth of the chain reaction;
 * - an explosion caused directly by a shot extends the streak; from the third
 *   consecutive one, each adds 20 × (streak − 2);
 * - a shot that does not explode anything breaks the streak;
 * - a shot that bounced off mirrors multiplies the balls' points by
 *   1 + bounces (Neon world: ricochet);
 * - on the short branch of a fork, the balls' points are doubled (Volcano world).
 */
export class Scoring {
  private total = 0;
  private streakValue = 0;
  private bestDepthValue = 0;
  private bestStreakValue = 0;
  private bestBounceValue = 0;
  private destroyed = 0;

  get score(): number {
    return this.total;
  }

  get streak(): number {
    return this.streakValue;
  }

  get bestDepth(): number {
    return this.bestDepthValue;
  }

  get bestStreak(): number {
    return this.bestStreakValue;
  }

  /** Most mirrors a successful shot bounced off. */
  get bestBounce(): number {
    return this.bestBounceValue;
  }

  /** Balls destroyed so far. */
  get ballsDestroyed(): number {
    return this.destroyed;
  }

  /** Records an explosion and returns the points it earned. */
  explosion(balls: number, depth: number, fromShot: boolean, bounces = 0, multiplier = 1): number {
    if (fromShot) this.streakValue++;
    this.bestBounceValue = Math.max(this.bestBounceValue, bounces);
    this.bestDepthValue = Math.max(this.bestDepthValue, depth);
    this.bestStreakValue = Math.max(this.bestStreakValue, this.streakValue);
    this.destroyed += balls;
    const streakBonus = fromShot ? Math.max(0, this.streakValue - 2) * STREAK_BONUS : 0;
    const points = balls * POINTS_PER_BALL * depth * (1 + bounces) * multiplier + streakBonus;
    this.total += points;
    return points;
  }

  /** A shot that missed or did not explode anything. */
  miss(): void {
    this.streakValue = 0;
  }

  /** End-of-level bonus: a fixed reward, plus 10 points per second saved under par. */
  static levelBonus(elapsed: number, parTime?: number): number {
    const saved = parTime === undefined ? 0 : Math.max(0, parTime - elapsed);
    return CLEAR_BONUS + Math.round(saved * SPEED_BONUS);
  }

  /** Points added outside explosions (end-of-level bonus…). */
  bonus(points: number): void {
    this.total += points;
  }
}
