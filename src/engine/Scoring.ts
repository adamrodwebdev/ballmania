/** Points per destroyed ball, before multipliers. */
export const POINTS_PER_BALL = 10;
/** Bonus per shot of a streak beyond the second one. */
export const STREAK_BONUS = 20;

/**
 * The score of a game. Rules (specification § 3.1):
 * - each explosion is worth balls × 10 × depth of the chain reaction;
 * - an explosion caused directly by a shot extends the streak; from the third
 *   consecutive one, each adds 20 × (streak − 2);
 * - a shot that does not explode anything breaks the streak.
 */
export class Scoring {
  private total = 0;
  private streakValue = 0;
  private bestDepthValue = 0;

  get score(): number {
    return this.total;
  }

  get streak(): number {
    return this.streakValue;
  }

  get bestDepth(): number {
    return this.bestDepthValue;
  }

  /** Records an explosion and returns the points it earned. */
  explosion(balls: number, depth: number, fromShot: boolean): number {
    if (fromShot) this.streakValue++;
    this.bestDepthValue = Math.max(this.bestDepthValue, depth);
    const streakBonus = fromShot ? Math.max(0, this.streakValue - 2) * STREAK_BONUS : 0;
    const points = balls * POINTS_PER_BALL * depth + streakBonus;
    this.total += points;
    return points;
  }

  /** A shot that missed or did not explode anything. */
  miss(): void {
    this.streakValue = 0;
  }

  /** Points added outside explosions (end-of-level bonus…). */
  bonus(points: number): void {
    this.total += points;
  }
}
