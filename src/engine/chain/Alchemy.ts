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

/** The two primaries that make a secondary, or null for a primary. */
export function ingredients(tone: Tone): readonly [Tone, Tone] | null {
  for (const [key, result] of Object.entries(MIXES)) {
    if (result !== tone) continue;
    const [a, b] = key.split('+').map(Number) as [Tone, Tone];
    return [a, b];
  }
  return null;
}
