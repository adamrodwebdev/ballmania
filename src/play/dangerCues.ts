import { GRACE_FROM } from '@/levels/grace';

/**
 * Where the danger cues start (v1.8.0, step 6), as the share of its track a
 * chain's head has covered: the music tenses from half way; from two thirds
 * the hole reddens, the heart beats and the danger is announced. They stand
 * where a newcomer's chain actually goes (its peaks at 55–70 % of the track),
 * not only at the hole's edge, where they used to start (65, 75, 80 %).
 */
export const MUSIC_FROM = 0.5;
export const ALARM_FROM = 2 / 3;

/**
 * Where the tiers of the tension music come in (v1.8.1, spec § 3.17): a bass
 * that pushes and the hi-hat with the music cue; the strong beat, sixteenths
 * and a rising tempo with the alarm; rolls with the heart in the grace zone.
 */
export const TENSION_TIERS: readonly number[] = [MUSIC_FROM, ALARM_FROM, GRACE_FROM];
/** A tier leaves once the chain is back this far below where it came in: it never flickers. */
export const TIER_SLACK = 0.06;

/** The tier of tension (0, calm, to 3) at this share of the track, the music being at `previous`. */
export function tensionTier(previous: number, share: number): number {
  let tier = 0;
  TENSION_TIERS.forEach((from, index) => {
    const layer = index + 1;
    if (share >= from || (layer <= previous && share >= from - TIER_SLACK)) tier = layer;
  });
  return tier;
}

/** How far a cue has risen at this share of the track: 0 up to its start, 1 at the hole. */
export function rise(share: number, from: number): number {
  return Math.max(0, Math.min(1, (share - from) / (1 - from)));
}
