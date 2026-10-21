import type { Tone } from '../chain/Ball';

/** The powers a ball of the chain may hold (specification § 3.9, v1.7). */
export type PowerKind = 'rewind' | 'slow' | 'rainbow' | 'laser';

export const POWER_KINDS: readonly PowerKind[] = ['rewind', 'slow', 'rainbow', 'laser'];

/** Balls the chain goes back by when a Rewind ball explodes. */
export const REWIND_BALLS = 8;
/** How fast the chain goes back, in units per second: a short pull the eye can follow. */
export const REWIND_SPEED = 900;
/** Slow-down: the chain's speed factor, and for how long (seconds). */
export const SLOW_FACTOR = 0.5;
export const SLOW_SECONDS = 8;
/** Laser: balls the next shot pierces before it fades. */
export const LASER_PIERCE = 4;
/**
 * Points for setting a power off: a good shot, and the time a Rewind adds to
 * a level (less speed bonus) is not a loss.
 */
export const POWER_BONUS = 100;

/** The powers of a level's chain. */
export interface PowerSetup {
  /** The powers drawn from, in turn. */
  readonly kinds: readonly PowerKind[];
  /** One power ball every `every` balls of the chain, and at least one. */
  readonly every: number;
  /** The power this level teaches: it comes first, towards the head, so it arrives early. */
  readonly first?: PowerKind;
}

/** A shot a power loads into the launcher. */
export type PowerShot = 'wild' | 'laser';

/** What a power may do to a game: the narrow port the engine opens to them. */
export interface PowerTarget {
  /** Diameter of a ball, in board units. */
  readonly diameter: number;
  /** Pulls every chain back by `distance` units, at `speed` units per second. */
  rewind(distance: number, speed: number): void;
  /** Slows every chain down by `factor` for `seconds`. */
  slow(factor: number, seconds: number): void;
  /** Turns the next shot into this one. */
  load(shot: PowerShot): void;
}

/** One power: what it does when its ball explodes. */
export interface Power {
  apply(target: PowerTarget): void;
}

class Rewind implements Power {
  apply(target: PowerTarget): void {
    target.rewind(REWIND_BALLS * target.diameter, REWIND_SPEED);
  }
}

class SlowDown implements Power {
  apply(target: PowerTarget): void {
    target.slow(SLOW_FACTOR, SLOW_SECONDS);
  }
}

class LoadShot implements Power {
  constructor(private readonly shot: PowerShot) {}

  apply(target: PowerTarget): void {
    target.load(this.shot);
  }
}

const POWERS: Readonly<Record<PowerKind, Power>> = {
  rewind: new Rewind(),
  slow: new SlowDown(),
  rainbow: new LoadShot('wild'),
  laser: new LoadShot('laser'),
};

export function powerOf(kind: PowerKind): Power {
  return POWERS[kind];
}

/** Balls this close to either end of a chain never hold a power: it would come or go too soon. */
const MARGIN = 3;

/** True if the ball at `index` has a neighbour of its colour: one shot can make it explode. */
const paired = (tones: readonly Tone[], index: number) =>
  tones[index - 1] === tones[index] || tones[index + 1] === tones[index];

/**
 * Where a new chain's powers go: deterministic (the same colours, the same
 * places), so a seeded game replays exactly. A power ball always has a
 * neighbour of its colour; powers are spread along the chain, and the one a
 * level teaches comes first, towards the head, so it arrives early.
 */
export function placePowers(tones: readonly Tone[], setup: PowerSetup): (PowerKind | null)[] {
  const placed: (PowerKind | null)[] = tones.map(() => null);
  if (setup.kinds.length === 0) return placed;
  const candidates: number[] = [];
  for (let i = MARGIN; i < tones.length - MARGIN; i++) if (paired(tones, i)) candidates.push(i);
  if (candidates.length === 0) return placed;
  const count = Math.max(1, Math.floor(tones.length / setup.every));
  const order = setup.first
    ? [setup.first, ...setup.kinds.filter((kind) => kind !== setup.first)]
    : [...setup.kinds];
  const taken: number[] = [];
  for (let k = 0; k < count; k++) {
    // From near the head (the last index, which enters first) towards the tail.
    const share = count === 1 ? 0.8 : 0.8 - (0.6 * k) / (count - 1);
    const wanted = share * (tones.length - 1);
    let best: number | null = null;
    for (const i of candidates) {
      if (taken.some((j) => Math.abs(i - j) < 2)) continue;
      if (best === null || Math.abs(i - wanted) < Math.abs(best - wanted)) best = i;
    }
    if (best === null) break;
    taken.push(best);
    placed[best] = order[k % order.length]!;
  }
  return placed;
}

/**
 * A power for a batch of balls fed into a running chain (Endless, a
 * Colossus): the middlemost ball that has a neighbour of its colour.
 */
export function placeInBatch(tones: readonly Tone[], kind: PowerKind): (PowerKind | null)[] {
  const placed: (PowerKind | null)[] = tones.map(() => null);
  const middle = (tones.length - 1) / 2;
  let best: number | null = null;
  for (let i = 0; i < tones.length; i++) {
    if (!paired(tones, i)) continue;
    if (best === null || Math.abs(i - middle) < Math.abs(best - middle)) best = i;
  }
  if (best !== null) placed[best] = kind;
  return placed;
}
