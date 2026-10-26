/**
 * Where the danger cues start (v1.8.0, step 6), as the share of its track a
 * chain's head has covered: the music tenses from half way; from two thirds
 * the hole reddens, the heart beats and the danger is announced. They stand
 * where a newcomer's chain actually goes (its peaks at 55–70 % of the track),
 * not only at the hole's edge, where they used to start (65, 75, 80 %).
 */
export const MUSIC_FROM = 0.5;
export const ALARM_FROM = 2 / 3;

/** How far a cue has risen at this share of the track: 0 up to its start, 1 at the hole. */
export function rise(share: number, from: number): number {
  return Math.max(0, Math.min(1, (share - from) / (1 - from)));
}
