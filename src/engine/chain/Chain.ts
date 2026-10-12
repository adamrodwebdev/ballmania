import type { Vec2 } from '../geometry/Vec2';
import type { Path } from '../path/Path';
import type { Ball, BallView, Tone } from './Ball';

export interface ChainParams {
  /** Radius of a ball, in board units; balls touch when 2 × radius apart. */
  readonly ballRadius: number;
  /** Cruising speed of the rear segment, in units per second. */
  readonly speed: number;
  /** Faster speed while the head has not yet travelled `rushDistance` (level intro). */
  readonly rushSpeed: number;
  readonly rushDistance: number;
  /** Speed at which a segment is pulled back towards a matching segment behind it. */
  readonly retreatSpeed: number;
  /** Smallest group that explodes. */
  readonly minMatch: number;
}

/** Why balls exploded: a shot inserted into a group, or two segments joining. */
export type ExplosionCause = 'shot' | 'reaction';

export interface Explosion {
  readonly balls: readonly BallView[];
  readonly cause: ExplosionCause;
  /** 1 for the first explosion, then +1 for each one of the same chain reaction. */
  readonly depth: number;
}

/** Where a projectile touches the chain, and on which side of the touched ball it lands. */
export interface Hit {
  readonly index: number;
  readonly after: boolean;
}

/** Tolerance on "touching", to absorb floating-point drift. */
const EPSILON = 1e-6;

/** Something big behind the tail that pushes the chain instead of the tail itself (the Colossus). */
interface Pusher {
  s: number;
  readonly radius: number;
}

/**
 * A line of balls travelling along a path towards the hole.
 *
 * Balls are kept sorted by arc length, from the tail (index 0) to the head.
 * Consecutive touching balls form a segment. Only the rear segment is pushed;
 * a segment whose first ball has the colour of the last ball of the segment
 * behind it is pulled back until they join, and the join may explode in turn:
 * that is the chain reaction.
 */
export class Chain {
  private readonly items: Ball[];
  private reaction = 0;
  private pusher: Pusher | null = null;
  private speedFactor = 1;

  constructor(
    readonly path: Path,
    balls: readonly Ball[],
    private readonly params: ChainParams,
  ) {
    this.items = [...balls].sort((a, b) => a.s - b.s);
  }

  /**
   * A chain waiting in the entrance tunnel: the head on the entrance,
   * every other ball touching the one ahead of it.
   */
  static queued(path: Path, balls: readonly Ball[], params: ChainParams): Chain {
    const diameter = params.ballRadius * 2;
    balls.forEach((ball, i) => (ball.s = (i + 1 - balls.length) * diameter));
    return new Chain(path, balls, params);
  }

  get balls(): readonly BallView[] {
    return this.items;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  get diameter(): number {
    return this.params.ballRadius * 2;
  }

  /** True once a ball (or the pusher) has reached the hole: the game is lost. */
  get reachedHole(): boolean {
    const head = this.items[this.items.length - 1];
    if (head !== undefined && head.s >= this.path.length) return true;
    return this.pusher !== null && this.pusher.s >= this.path.length;
  }

  /** Arc length of the pusher's centre, or null without one. */
  get pusherArc(): number | null {
    return this.pusher?.s ?? null;
  }

  /**
   * From now on, a body of `radius` behind the tail pushes the chain; the tail
   * only moves when it touches it.
   */
  attachPusher(radius: number): void {
    const tail = this.items[0];
    const s = tail ? tail.s - this.params.ballRadius - radius : -radius;
    this.pusher = { s, radius };
  }

  /** Multiplies the pushing speed (a Colossus getting angry). */
  setSpeedFactor(factor: number): void {
    this.speedFactor = factor;
  }

  /** New balls appear just in front of the pusher (or behind the tail) and push the rest. */
  feed(balls: readonly Ball[]): void {
    const r = this.params.ballRadius;
    const first = this.pusher
      ? this.pusher.s + this.pusher.radius + r
      : (this.items[0]?.s ?? 0) - balls.length * this.diameter;
    balls.forEach((ball, i) => (ball.s = first + i * this.diameter));
    this.items.unshift(...balls);
    this.resolveOverlaps();
  }

  /**
   * Takes one ball out of the chain (Abyss world, magnet). The gap it leaves
   * behaves like any other: if both sides share a colour they pull together
   * and may explode.
   */
  extract(index: number): Ball {
    const [ball] = this.items.splice(index, 1);
    if (!ball) throw new RangeError(`No ball at index ${index}`);
    return ball;
  }

  /** Removes every ball, for the final cascade of a level. */
  clear(): Ball[] {
    this.pusher = null;
    return this.items.splice(0, this.items.length);
  }

  /** True when no segment is being pulled back: the current chain reaction is over. */
  get settled(): boolean {
    for (let i = 0; i + 1 < this.items.length; i++) {
      if (this.attracts(i)) return false;
    }
    return true;
  }

  /** Colours still on the track, so the shooter never offers a useless ball. */
  tones(): Set<Tone> {
    return new Set(this.items.map((ball) => ball.tone));
  }

  positionOf(ball: BallView): Vec2 {
    return this.path.pointAt(ball.s);
  }

  /** Moves the chain by `dt` seconds and returns the explosions caused by joins. */
  advance(dt: number): Explosion[] {
    const head = this.items[this.items.length - 1];
    const front = head?.s ?? this.pusher?.s ?? 0;
    const speed =
      (front < this.params.rushDistance ? this.params.rushSpeed : this.params.speed) *
      this.speedFactor;
    if (this.pusher) this.pusher.s += speed * dt;
    if (this.isEmpty) return [];
    const wasTouching = this.items.slice(0, -1).map((_, i) => this.touching(i));

    if (this.pusher) {
      const contact = this.pusher.s + this.pusher.radius + this.params.ballRadius;
      if (this.items[0]!.s < contact) this.items[0]!.s = contact;
    } else {
      this.items[0]!.s += speed * dt;
    }

    // Segments are found before anything moves: moving one changes the gaps.
    const pulled = wasTouching.flatMap((_, i) =>
      this.attracts(i) ? [this.segmentFrom(i + 1)] : [],
    );
    for (const [start, end] of pulled) {
      for (let i = start; i <= end; i++) this.items[i]!.s -= this.params.retreatSpeed * dt;
    }
    this.resolveOverlaps();

    const joins = wasTouching.flatMap((was, i) => (!was && this.touching(i) ? [i] : []));
    const explosions: Explosion[] = [];
    // From the head down: an explosion only shifts the indexes above it.
    for (const join of joins.reverse()) {
      const left = this.items[join];
      const right = this.items[join + 1];
      if (!left || !right || left.tone !== right.tone || !this.touching(join)) continue;
      const explosion = this.explodeAround(join, 'reaction');
      if (explosion) explosions.push(explosion);
    }

    if (this.settled) this.reaction = 0;
    return explosions;
  }

  /**
   * The first visible ball the point touches, if any, and whether the point is
   * ahead of it (insert after) or behind it (insert before).
   */
  hitTest(point: Vec2): Hit | null {
    let best: Hit | null = null;
    let bestDistance = this.diameter;
    for (let index = 0; index < this.items.length; index++) {
      const ball = this.items[index]!;
      if (ball.s < 0) continue;
      const centre = this.path.pointAt(ball.s);
      const distance = centre.distanceTo(point);
      if (distance >= bestDistance) continue;
      bestDistance = distance;
      best = { index, after: this.path.tangentAt(ball.s).dot(point.sub(centre)) > 0 };
    }
    return best;
  }

  /**
   * Inserts a shot ball next to the touched one, pushing the balls ahead of it,
   * and returns the explosion it causes, if any.
   */
  insert(ball: Ball, hit: Hit): Explosion | null {
    const touched = this.items[hit.index];
    if (!touched) throw new RangeError(`No ball at index ${hit.index}`);
    const index = hit.after ? hit.index + 1 : hit.index;
    ball.s = hit.after ? touched.s + this.diameter : touched.s - this.diameter;
    this.items.splice(index, 0, ball);
    this.resolveOverlaps();
    return this.explodeAround(index, 'shot');
  }

  private touching(i: number): boolean {
    return this.items[i + 1]!.s - this.items[i]!.s <= this.diameter + EPSILON;
  }

  /** A gap after ball `i` whose two sides share a colour: the front side is pulled back. */
  private attracts(i: number): boolean {
    return !this.touching(i) && this.items[i]!.tone === this.items[i + 1]!.tone;
  }

  /** First and last indexes of the segment starting at `start`. */
  private segmentFrom(start: number): readonly [number, number] {
    let end = start;
    while (end + 1 < this.items.length && this.touching(end)) end++;
    return [start, end];
  }

  /** Pushes balls forwards so that none overlaps the ball behind it. */
  private resolveOverlaps(): void {
    for (let i = 0; i + 1 < this.items.length; i++) {
      const minimum = this.items[i]!.s + this.diameter;
      if (this.items[i + 1]!.s < minimum) this.items[i + 1]!.s = minimum;
    }
  }

  /** Removes the touching same-colour group around `index` if it is large enough. */
  private explodeAround(index: number, cause: ExplosionCause): Explosion | null {
    const tone = this.items[index]!.tone;
    let first = index;
    while (first > 0 && this.items[first - 1]!.tone === tone && this.touching(first - 1)) first--;
    let last = index;
    while (
      last + 1 < this.items.length &&
      this.items[last + 1]!.tone === tone &&
      this.touching(last)
    ) {
      last++;
    }
    if (last - first + 1 < this.params.minMatch) return null;
    const balls = this.items.splice(first, last - first + 1);
    this.reaction++;
    return { balls, cause, depth: this.reaction };
  }
}
