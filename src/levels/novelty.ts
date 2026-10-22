import type { PowerKind } from '@/engine/powers/Powers';
import { WORLDS, type CampaignLevel, type HintId, type WorldId } from './campaign';

/**
 * What a level of the campaign brings for the first time (specification
 * § 3.2): announced on the button that leads there after a win.
 */
export type Novelty =
  | { readonly kind: 'world'; readonly world: WorldId }
  | { readonly kind: 'colossus'; readonly world: WorldId; readonly young: boolean }
  | { readonly kind: 'power'; readonly power: PowerKind }
  | { readonly kind: 'mechanic'; readonly hint: HintId };

/** The levels that teach a power marble, by the hint they open with. */
const POWER_HINTS: Partial<Record<HintId, PowerKind>> = {
  power: 'rewind',
  powerSlow: 'slow',
  powerRainbow: 'rainbow',
  powerLaser: 'laser',
};

/** Hints that bring a new mechanic (the basics of the first levels bring none). */
const MECHANIC_HINTS: ReadonlySet<HintId> = new Set<HintId>([
  'twin',
  'ricochet',
  'prism',
  'spin',
  'magnet',
  'magnetCombo',
  'alchemy',
  'alchemySecondary',
  'switch',
  'hot',
  'gravity',
  'orbit',
  'arrhythmia',
  'meteors',
  'wind',
  'cold',
  'solar',
]);

/** A new world first, then its Colossus, a power marble, a mechanic; null for the rest. */
export function noveltyOf(level: CampaignLevel): Novelty | null {
  const world = WORLDS.find((candidate) => candidate.id === level.world);
  const opensWorld = world !== undefined && world !== WORLDS[0] && world.levels[0]?.id === level.id;
  if (opensWorld) return { kind: 'world', world: level.world };
  if (level.colossus) {
    return { kind: 'colossus', world: level.world, young: level.colossus.young === true };
  }
  const power = level.hint && POWER_HINTS[level.hint];
  if (power) return { kind: 'power', power };
  if (level.hint && MECHANIC_HINTS.has(level.hint)) return { kind: 'mechanic', hint: level.hint };
  return null;
}
