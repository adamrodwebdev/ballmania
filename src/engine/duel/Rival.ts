import type { Chain } from '../chain/Chain';
import type { Tone } from '../chain/Ball';
import type { RandomSource } from '../core/Random';
import type { Vec2 } from '../geometry/Vec2';

export interface RivalSetup {
  /** Where the rival's shooter stands, in board units. */
  readonly position: Vec2;
  /** Seconds between two of its shots. */
  readonly cadence: number;
  /** Its aim error along the track, in board units, either way. */
  readonly error: number;
  /** Chance that it picks its best target rather than any ball of its colour. */
  readonly focus: number;
  /** The end of the track whose hole it defends: the start (default) or the end. */
  readonly guards?: 'start' | 'end';
}

/** What the rival decided to do this step. */
export interface RivalMove {
  /** Swap its two balls first. */
  readonly swap: boolean;
  readonly target: Vec2;
}

interface Option {
  readonly score: number;
  readonly chain: Chain;
  readonly s: number;
}

/**
 * The computer opponent of a duel: a player with a steady rhythm, an aim
 * error and a degree of focus, all set by the difficulty. It looks for balls
 * of its loaded colour (or of the next one, then swaps), preferring pairs.
 */
export class Rival {
  private wait: number;

  constructor(
    readonly setup: RivalSetup,
    private readonly random: RandomSource,
  ) {
    // A short grace period at the start, for the player to find their bearings.
    this.wait = setup.cadence * 2;
  }

  /** Called every step; returns a move when it is time to shoot and there is a target. */
  think(dt: number, chains: readonly Chain[], current: Tone, next: Tone): RivalMove | null {
    this.wait -= dt;
    if (this.wait > 0) return null;
    this.wait = this.setup.cadence * (0.85 + 0.3 * this.random.next());
    const loaded = this.choose(chains, current);
    const other = this.choose(chains, next);
    const swap = other !== null && (loaded === null || other.score > loaded.score + 1);
    // Nothing to explode in sight: it still plays, on the nearest ball it can see.
    const option = (swap ? other : loaded) ?? this.fallback(chains);
    if (!option) return null;
    const miss = (this.random.next() - 0.5) * 2 * this.setup.error;
    return { swap, target: option.chain.path.pointAt(option.s + miss) };
  }

  private choose(chains: readonly Chain[], tone: Tone): Option | null {
    const options: Option[] = [];
    for (const chain of chains) {
      const balls = chain.balls;
      balls.forEach((ball, i) => {
        if (ball.tone !== tone || ball.s < 0 || ball.s > chain.path.length) return;
        if (!this.inSight(chains, chain.positionOf(ball), chain.diameter)) return;
        const pair = (balls[i - 1]?.tone === tone ? 1 : 0) + (balls[i + 1]?.tone === tone ? 1 : 0);
        // Balls near its own hole first: removing them moves that end away from it.
        const along = ball.s / chain.path.length;
        const near = this.setup.guards === 'end' ? along : 1 - along;
        options.push({ score: pair * 2 + near, chain, s: ball.s });
      });
    }
    if (options.length === 0) return null;
    if (this.random.next() >= this.setup.focus) {
      return options[this.random.nextInt(options.length)]!;
    }
    return options.reduce((best, option) => (option.score > best.score ? option : best));
  }

  /** The visible ball nearest to the rival's hole, whatever its colour. */
  private fallback(chains: readonly Chain[]): Option | null {
    for (const chain of chains) {
      for (const ball of chain.balls) {
        if (ball.s < 0 || !this.inSight(chains, chain.positionOf(ball), chain.diameter)) continue;
        return { score: 0, chain, s: ball.s };
      }
    }
    return null;
  }

  /** True if no other ball stands between the rival and this point. */
  private inSight(chains: readonly Chain[], target: Vec2, diameter: number): boolean {
    const from = this.setup.position;
    const line = target.sub(from);
    const length = line.length();
    const direction = line.scale(1 / length);
    for (const chain of chains) {
      for (const ball of chain.balls) {
        if (ball.s < 0) continue;
        const centre = chain.positionOf(ball);
        const along = centre.sub(from).dot(direction);
        if (along <= 0 || along >= length - diameter) continue;
        const across = centre.sub(from.add(direction.scale(along))).length();
        if (across < diameter) return false;
      }
    }
    return true;
  }
}
