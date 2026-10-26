import { describe, expect, it } from 'vitest';
import { FRAMES } from '@/levels/tracks';
import { LINEUP } from '@/showcase/lineup';
import { MOMENTS } from '@/showcase/moments';
import { Take } from '@/showcase/Take';
import { CROSSFADE, CUTS, trailerSeconds } from '../../marketing/crazygames/cuts';
import { fakeCanvas, reelStyle } from './fakeCanvas';

/** Seconds a cut's peak shows before the next cut starts fading in over it. */
const SEEN = 0.3;

describe("the trailers' cuts (v1.8.0)", () => {
  it('are moments of the title reel, the whole trailer between 15 and 20 seconds', () => {
    for (const cut of CUTS) expect(LINEUP.map((highlight) => highlight.id)).toContain(cut.moment);
    expect(new Set(CUTS.map((cut) => cut.moment)).size).toBe(CUTS.length);
    expect(trailerSeconds()).toBeGreaterThanOrEqual(15);
    expect(trailerSeconds()).toBeLessThanOrEqual(20);
  });

  // The landscape video films the reel's wide board, the portrait one a phone's tall board.
  it.each(
    CUTS.flatMap((cut) =>
      (['wide', 'tall'] as const).map((board) => [cut.moment, board, cut] as const),
    ),
  )('%s peaks within its cut on the %s board', (_, board, cut) => {
    const moment = MOMENTS.find((candidate) => candidate.id === cut.moment)!;
    const take = new Take({
      scene: moment,
      canvas: fakeCanvas(),
      style: reelStyle(),
      frame: FRAMES[board],
    });
    take.resize(board === 'wide' ? 1920 : 1080, board === 'wide' ? 1080 : 1620, 1);
    take.run.settle();
    while (take.run.time < cut.seconds) take.run.step();
    take.destroy();
    expect(take.run.peak).not.toBeNull();
    expect(take.run.peak!).toBeLessThanOrEqual(cut.seconds - CROSSFADE - SEEN);
  });
});
