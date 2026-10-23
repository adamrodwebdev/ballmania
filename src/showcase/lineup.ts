import type { WorldId } from '@/levels/campaign';

/** The reel's moments (roadmap 1.8.0, step 3). */
export type MomentId =
  'nova' | 'bank' | 'magnet' | 'alchemy' | 'switch' | 'blackHole' | 'colossus' | 'duel';

/** Where a moment is played when it is not a world's level: a boss fight, the Duel. */
export type Venue = 'boss' | 'duel';

/** A highlight of the game, as the reel's caption names it. */
export interface Highlight {
  readonly id: MomentId;
  /** The world it shows: its look, and its caption's first word unless a venue is named. */
  readonly world: WorldId;
  readonly venue?: Venue;
}

/**
 * The title reel's lineup (v1.8.0): its moments in the order they play. Light
 * on purpose: the title screen reads it for the captions without loading any
 * game code.
 */
export const LINEUP: readonly Highlight[] = [
  { id: 'nova', world: 'nebula' },
  { id: 'bank', world: 'neon' },
  { id: 'magnet', world: 'abyss' },
  { id: 'alchemy', world: 'jewel' },
  { id: 'switch', world: 'volcano' },
  { id: 'blackHole', world: 'singularity' },
  { id: 'colossus', world: 'nebula', venue: 'boss' },
  { id: 'duel', world: 'volcano', venue: 'duel' },
];
