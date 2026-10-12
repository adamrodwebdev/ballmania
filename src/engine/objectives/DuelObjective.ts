import type { Chain, Explosion } from '../chain/Chain';
import type { Objective, ObjectiveContext, Side } from './Objective';

export interface DuelSetup {
  /** Distance the chain is pushed per exploded ball (times the reaction depth). */
  readonly push: number;
  /** Below this many balls, the chain grows back at both ends. */
  readonly minimum: number;
  /** Balls added at each end when it grows back. */
  readonly regrow: number;
  /** Seconds between two growths of one ball at each end: the pressure rises. */
  readonly growEvery: number;
}

/** Speed at which a push is carried out, in units per second. */
export const TUG_SPEED = 260;

/**
 * Duel mode (specification § 3.2, Arcade): one chain between two holes, the
 * rival's at the start of the track and the player's at its end. Every
 * explosion pushes the chain towards the other side's hole: a tug of war.
 * Won when the tail falls into the rival's hole; lost, as usual, when the
 * head reaches the player's.
 */
export class DuelObjective implements Objective {
  /** Push still to carry out: negative towards the rival's hole. */
  private tug = 0;
  private growIn: number;

  constructor(readonly setup: DuelSetup) {
    this.growIn = setup.growEvery;
  }

  start(): void {}

  onExplosion(_: ObjectiveContext, __: number, explosion: Explosion, by: Side): void {
    const amount = this.setup.push * explosion.balls.length * explosion.depth;
    this.tug += by === 'player' ? -amount : amount;
  }

  update(context: ObjectiveContext, dt: number): void {
    const step = Math.sign(this.tug) * Math.min(Math.abs(this.tug), TUG_SPEED * dt);
    this.tug -= step;
    this.growIn -= dt;
    const grow = this.growIn <= 0;
    if (grow) this.growIn = this.setup.growEvery;
    for (const chain of context.chains) {
      chain.shift(step);
      const short = chain.balls.length < this.setup.minimum;
      if (short) this.extend(context, chain, this.setup.regrow);
      else if (grow) this.extend(context, chain, 1);
    }
  }

  /** Adds balls at both ends alike, never pushing anything into a hole. */
  private extend(context: ObjectiveContext, chain: Chain, wanted: number): void {
    const tail = chain.tail ?? chain.path.length / 2;
    const head = chain.balls[chain.balls.length - 1]?.s ?? tail;
    const room = (space: number) => Math.max(0, Math.floor(space / chain.diameter) - 1);
    const count = Math.min(wanted, room(tail), room(chain.path.length - head));
    if (count === 0) return;
    if (chain.isEmpty) chain.append(context.createBalls(1), tail);
    chain.feed(context.createBalls(count));
    chain.append(context.createBalls(count));
  }

  isComplete(context: ObjectiveContext): boolean {
    return context.chains.some((chain) => chain.tail !== null && chain.tail <= 0);
  }
}
