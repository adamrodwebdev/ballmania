import type { EndlessStage } from '@/engine/objectives/EndlessObjective';
import type { LevelDefinition } from '../LevelDefinition';
import { resolveLevel } from '../resolveLevel';
import type { Frame } from '../tracks';

/** Faster and more colourful, stage after stage (seconds from the start). */
export const ENDLESS_STAGES: readonly EndlessStage[] = [
  { at: 0, speed: 1, tones: 3 },
  { at: 40, speed: 1.15, tones: 4 },
  { at: 90, speed: 1.3, tones: 4 },
  { at: 150, speed: 1.45, tones: 5 },
  { at: 220, speed: 1.6, tones: 5 },
  { at: 300, speed: 1.8, tones: 6 },
  { at: 400, speed: 2, tones: 6 },
];

/** Endless mode on a long spiral: a chain that never ends (specification § 3.2, Arcade). */
export function endlessLevel(frame: Frame): LevelDefinition {
  // Endless mode is never won: the par time of the resolved level has no effect.
  const level = resolveLevel(
    {
      id: 'endless',
      world: 'nebula',
      number: 1,
      track: {
        kind: 'spiral',
        turns: 1.75,
        outer: 0.88,
        inner: 0.36,
        start: 0.75,
        clockwise: true,
      },
      length: 30,
      tones: 3,
      repeatChance: 0.4,
      speed: 32,
    },
    frame,
  );
  return { ...level, endless: { stages: ENDLESS_STAGES, feed: 8 } };
}
