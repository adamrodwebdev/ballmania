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
export type Landing = 'title' | 'training' | 'first-level';

/** True for a player who has never played: the first visit. */
export function isFirstVisit(trace: PlayerTrace): boolean {
  return trace.gamesPlayed === 0 && trace.levelsFinished === 0 && trace.worldsFinished === 0;
}

/**
 * A newcomer's first Play opens the training (v1.8.0, § 3.13), on a portal as
 * on our own site, until it is finished or skipped.
 */
export function startsTraining(trace: PlayerTrace, trainingDone: boolean): boolean {
  return isFirstVisit(trace) && !trainingDone;
}

/**
 * Where a visit begins (specification § 3.7). Portals want players in the
 * game at once: on a portal, a player who has never played lands straight in
 * the training, or in the first level once the training is over. A returning
 * player, and every visitor of our own site, finds the title screen.
 */
export function landing(platform: PlatformId, trace: PlayerTrace, trainingDone: boolean): Landing {
  if (platform === 'standalone' || !isFirstVisit(trace)) return 'title';
  return trainingDone ? 'first-level' : 'training';
}
