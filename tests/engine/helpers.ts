import { Ball } from '@/engine/chain/Ball';
import { Chain, type ChainParams } from '@/engine/chain/Chain';
import type { RandomSource } from '@/engine/core/Random';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Path } from '@/engine/path/Path';

/** Balls of radius 10: they touch when 20 units apart. */
export const PARAMS: ChainParams = {
  ballRadius: 10,
  speed: 50,
  rushSpeed: 50,
  rushDistance: 0,
  retreatSpeed: 200,
  minMatch: 3,
};

export const D = PARAMS.ballRadius * 2;

/** A straight track along y = 100, from x = 0 to x = 1000. */
export const straightPath = (): Path => Path.fromPoints([new Vec2(0, 100), new Vec2(1000, 100)]);

/**
 * Builds a chain from a compact description, tail first: each letter is a
 * ball whose tone is its index in the alphabet, each "_" an empty slot.
 * `start` is the arc length of the first slot.
 */
export function chainOf(layout: string, start = 100, params: ChainParams = PARAMS): Chain {
  let id = 1;
  const balls: Ball[] = [];
  for (let slot = 0; slot < layout.length; slot++) {
    const code = layout.charCodeAt(slot);
    if (layout[slot] === '_') continue;
    balls.push(new Ball(id++, code - 97, start + slot * params.ballRadius * 2));
  }
  return new Chain(straightPath(), balls, params);
}

/** Tones of a chain written back as letters, with "|" between segments. */
export function describe(chain: Chain): string {
  let text = '';
  chain.balls.forEach((ball, i) => {
    const previous = chain.balls[i - 1];
    if (previous && ball.s - previous.s > D + 1e-6) text += '|';
    text += String.fromCharCode(97 + ball.tone);
  });
  return text;
}

/** Randomness that always returns the same value. */
export class FixedRandom implements RandomSource {
  constructor(private readonly value = 0) {}

  next(): number {
    return this.value;
  }

  nextInt(max: number): number {
    return Math.floor(this.value * max);
  }
}
