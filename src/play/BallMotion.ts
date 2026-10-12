import type { BallView } from '@/engine/chain/Ball';
import type { Chain } from '@/engine/chain/Chain';
import type { Vec2 } from '@/engine/geometry/Vec2';

/** Seconds a shot ball takes to slide from its impact point into its slot. */
export const LANDING_TIME = 0.12;
/** How fast displayed positions catch up with simulated ones (per second). */
const FOLLOW_RATE = 28;

interface Shown {
  s: number;
  landing: { readonly from: Vec2; elapsed: number } | null;
}

/**
 * Smooths what the player sees without touching the simulation: balls glide
 * to their new place when a shot pushes them, a shot ball slides into its
 * slot, and after a defeat the chain is swallowed by the hole.
 */
export class BallMotion {
  private readonly shown = new Map<number, Shown>();
  private drainDistance = 0;

  /** A shot ball has just been inserted at `from`. */
  land(ball: BallView, from: Vec2): void {
    this.shown.set(ball.id, { s: ball.s, landing: { from, elapsed: 0 } });
  }

  /** After a defeat, every chain slides into the hole at `speed` units per second. */
  drain(speed: number, dt: number): void {
    this.drainDistance += speed * dt;
  }

  update(chains: readonly Chain[], dt: number): void {
    const follow = 1 - Math.exp(-FOLLOW_RATE * dt);
    const alive = new Set<number>();
    for (const chain of chains) {
      for (const ball of chain.balls) {
        alive.add(ball.id);
        const shown = this.shown.get(ball.id);
        if (!shown) {
          this.shown.set(ball.id, { s: ball.s, landing: null });
          continue;
        }
        shown.s += (ball.s - shown.s) * follow;
        if (shown.landing) {
          shown.landing.elapsed += dt;
          if (shown.landing.elapsed >= LANDING_TIME) shown.landing = null;
        }
      }
    }
    for (const id of this.shown.keys()) if (!alive.has(id)) this.shown.delete(id);
  }

  /** Displayed arc length of a ball. */
  arcOf(ball: BallView): number {
    return (this.shown.get(ball.id)?.s ?? ball.s) + this.drainDistance;
  }

  /** Displayed position of a ball, including its landing slide. */
  positionOf(chain: Chain, ball: BallView): Vec2 {
    const onPath = chain.path.pointAt(this.arcOf(ball));
    const landing = this.shown.get(ball.id)?.landing;
    if (!landing) return onPath;
    const t = landing.elapsed / LANDING_TIME;
    return landing.from.lerp(onPath, t * (2 - t));
  }
}
