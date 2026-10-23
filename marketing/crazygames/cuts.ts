import type { MomentId } from '@/showcase/lineup';

/** One cut of a trailer: a moment of the title's reel, filmed from its start for so many seconds. */
export interface Cut {
  readonly moment: MomentId;
  readonly seconds: number;
}

/** Seconds the trailer holds the cover first: the thumbnail flows into the video. */
export const COVER_SECONDS = 1;
/** Seconds one cut fades into the next (and the cover into the first). */
export const CROSSFADE = 0.3;

/**
 * The cuts of the trailers (v1.8.0): the title reel's own moments, the same
 * scenes in both videos, six of them so that the whole trailer, cover
 * included, stays under the 20 seconds CrazyGames allows. The colour mix and
 * the switch stay in the reel: the mix never peaks on a phone's tall board,
 * and a flipped switch reads less than a burst.
 */
export const CUTS: readonly Cut[] = [
  { moment: 'nova', seconds: 2.6 },
  { moment: 'bank', seconds: 3.2 },
  { moment: 'magnet', seconds: 2.8 },
  { moment: 'blackHole', seconds: 3 },
  { moment: 'duel', seconds: 3 },
  // Its fall, and the light running along the track: the end, before the board is empty.
  { moment: 'colossus', seconds: 3 },
];

/** Seconds a trailer lasts: the cover, then each cut until the next one has faded in. */
export function trailerSeconds(cuts: readonly Cut[] = CUTS): number {
  return cuts.reduce((seconds, cut) => seconds + cut.seconds - CROSSFADE, COVER_SECONDS);
}
