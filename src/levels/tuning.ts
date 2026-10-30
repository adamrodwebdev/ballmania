import type { CampaignLevel } from './campaign';
import { onBoard, type Seat } from './seat';
import { TUNING } from './tuning.data';

/** A chain's pace: its speed, in units per second, and how many balls it brings. */
export interface Pace {
  readonly speed: number;
  readonly length: number;
}

/**
 * A campaign level's pace at a seat (v1.8.1, spec § 3.17): the speed, then
 * the length, at which its typical newcomer's wins sit in its band, found by
 * the tuning tool for that board and hand; the level's own pace on a board
 * no seat was tuned for.
 */
export function paceAt(level: Pick<CampaignLevel, 'id' | 'speed' | 'length'>, seat: Seat): Pace {
  const tuned = onBoard(TUNING[level.id], seat);
  return { speed: tuned?.speed ?? level.speed, length: tuned?.length ?? level.length };
}
