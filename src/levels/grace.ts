import type { Grace } from '@/engine/chain/Chain';
import type { WorldId } from './campaign';
import { DIFFICULTY_RULES, type Difficulty } from './difficulty';

/** The last fifth of the track, where the danger cues already play (v1.8.0). */
export const GRACE_FROM = 0.8;

/**
 * How much of its speed a campaign chain keeps in the grace zone, world by
 * world (roadmap 1.8.0, step 6): half in the first three worlds, which teach
 * the game; a smaller respite from the Jewel world on.
 */
const GRACE_FACTORS: Readonly<Record<WorldId, number>> = {
  nebula: 0.5,
  neon: 0.5,
  abyss: 0.5,
  jewel: 0.7,
  volcano: 0.7,
  singularity: 0.7,
};

/**
 * The grace zone of a campaign level's chains at a difficulty: the near miss
 * stays a near miss more often, the danger cues playing; none in Legend.
 */
export function graceOf(world: WorldId, difficulty: Difficulty): Grace | null {
  return DIFFICULTY_RULES[difficulty].grace
    ? { from: GRACE_FROM, factor: GRACE_FACTORS[world] }
    : null;
}
