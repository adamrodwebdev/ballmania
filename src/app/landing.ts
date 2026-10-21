import type { PlatformId } from '@/platform/PlatformAdapter';

/** What a save tells of a player's past: enough to recognise a first visit. */
export interface PlayerTrace {
  /** Games played, in any mode. */
  readonly gamesPlayed: number;
  /** Campaign levels finished. */
  readonly levelsFinished: number;
  /** Worlds finished. */
  readonly worldsFinished: number;
}

/** The first screen of a visit. */
export type Landing = 'title' | 'first-level';

/**
 * Where a visit begins (specification § 3.7). Portals want players in the
 * game at once: on a portal, a player who has never played lands straight in
 * the first level. A returning player, and every visitor of our own site,
 * finds the title screen.
 */
export function landing(platform: PlatformId, trace: PlayerTrace): Landing {
  if (platform === 'standalone') return 'title';
  const firstVisit =
    trace.gamesPlayed === 0 && trace.levelsFinished === 0 && trace.worldsFinished === 0;
  return firstVisit ? 'first-level' : 'title';
}
