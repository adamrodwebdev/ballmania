import type { Vec2 } from '../geometry/Vec2';
import type { Tone } from './Ball';

/**
 * Jewel world: colours mix like light (specification § 3.2). The three
 * primaries are ruby (0), lime (2) and violet (4); two different primaries
 * make the other three colours:
 *   ruby + lime = amber (1), lime + violet = cyan (3), ruby + violet = rose (5).
 */
export const PRIMARIES: readonly Tone[] = [0, 2, 4];
export const SECONDARIES: readonly Tone[] = [1, 3, 5];

const MIXES: Readonly<Record<string, Tone>> = {
  '0+2': 1,
  '2+4': 3,
  '0+4': 5,
};

export function isPrimary(tone: Tone): boolean {
  return PRIMARIES.includes(tone);
}

/** The colour two different primaries make together, or null if they do not mix. */
export function mix(a: Tone, b: Tone): Tone | null {
  if (a === b) return null;
  return MIXES[a < b ? `${a}+${b}` : `${b}+${a}`] ?? null;
}

/**
 * A shot fuses only when its flight passes this close to the centre of the
 * ball it touches, in ball radii (v1.8.1, decided on 29/10/2026): farther off,
 * it slips in beside it, as in every other world, so that a near miss never
 * makes a colour by accident.
 */
export const FUSE_REACH = 0.7;

/** How far a flight's line passes from a ball's centre: 0 for a shot dead on it. */
export function offCentre(centre: Vec2, position: Vec2, velocity: Vec2): number {
  const towards = centre.sub(position);
  const length = velocity.length();
  return length === 0
    ? towards.length()
    : Math.abs(velocity.x * towards.y - velocity.y * towards.x) / length;
}

/** The two primaries that make a secondary, or null for a primary. */
export function ingredients(tone: Tone): readonly [Tone, Tone] | null {
  for (const [key, result] of Object.entries(MIXES)) {
    if (result !== tone) continue;
    const [a, b] = key.split('+').map(Number) as [Tone, Tone];
    return [a, b];
  }
  return null;
}
