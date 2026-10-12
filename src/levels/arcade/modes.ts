import type { WorldId } from '../campaign';

export type ArcadeModeId = 'endless' | 'puzzle' | 'rhythm' | 'duel';

/**
 * A mode of the Arcade (specification § 3.2): opened by finishing a world of
 * the campaign, so players get new reasons to come back as they progress.
 */
export interface ArcadeMode {
  readonly id: ArcadeModeId;
  /** Finishing this world opens the mode. */
  readonly unlockedBy: WorldId;
  /** The world whose backdrop the mode wears when the player keeps "the world's own". */
  readonly world: WorldId;
}

export const ARCADE_MODES: readonly ArcadeMode[] = [
  { id: 'endless', unlockedBy: 'nebula', world: 'nebula' },
  { id: 'puzzle', unlockedBy: 'neon', world: 'abyss' },
  { id: 'rhythm', unlockedBy: 'abyss', world: 'neon' },
  { id: 'duel', unlockedBy: 'jewel', world: 'volcano' },
];

export function findMode(id: ArcadeModeId): ArcadeMode {
  return ARCADE_MODES.find((mode) => mode.id === id)!;
}
