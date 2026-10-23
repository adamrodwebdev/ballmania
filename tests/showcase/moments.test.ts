import { describe, expect, it } from 'vitest';
import { LINEUP } from '@/showcase/lineup';
import { MOMENTS, type Moment } from '@/showcase/moments';
import type { MomentRun } from '@/showcase/MomentRun';
import { Take } from '@/showcase/Take';
import { fakeCanvas, reelStyle } from './fakeCanvas';

/**
 * A moment played to its end as the title's reel plays it: the game's own
 * play session, with its effects and slow motion, on the reel's board shape.
 */
function play(moment: Moment): MomentRun {
  const take = new Take(moment, fakeCanvas(), reelStyle());
  take.resize(510, 300, 1);
  take.run.settle();
  while (!take.run.over) take.run.step();
  take.destroy();
  return take.run;
}

describe('the moments of the title reel (v1.8.0)', () => {
  it('are the lineup, eight of three to five seconds: a lap of about half a minute', () => {
    expect(MOMENTS.map((moment) => moment.id)).toEqual(LINEUP.map((highlight) => highlight.id));
    expect(MOMENTS).toHaveLength(8);
    for (const moment of MOMENTS) {
      expect(moment.seconds, moment.id).toBeGreaterThanOrEqual(3);
      expect(moment.seconds, moment.id).toBeLessThanOrEqual(5);
    }
    const lap = MOMENTS.reduce((seconds, moment) => seconds + moment.seconds, 0);
    expect(lap).toBeGreaterThan(25);
    expect(lap).toBeLessThan(40);
  });

  it.each(MOMENTS.map((moment) => [moment.id, moment] as const))(
    '%s reaches its peak within three seconds',
    (_, moment) => {
      expect(moment.peakBy).toBeLessThan(3);
      const run = play(moment);
      expect(run.peak).not.toBeNull();
      expect(run.peak!).toBeLessThanOrEqual(moment.peakBy);
    },
  );

  it('plays each moment the same every time', () => {
    for (const moment of MOMENTS) expect(play(moment).peak, moment.id).toBe(play(moment).peak);
  });
});
