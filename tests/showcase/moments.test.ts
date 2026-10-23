import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/core/Random';
import { Game } from '@/engine/Game';
import { toLevelSetup } from '@/levels/LevelDefinition';
import { FRAMES } from '@/levels/tracks';
import { MOMENTS, type Moment } from '@/showcase/moments';
import { MomentRun, REEL_FPS } from '@/showcase/MomentRun';
import { GameStage } from '@/showcase/stage';

/** A moment played to its end on the reel's board shape, as the title's window plays it. */
function play(moment: Moment): MomentRun {
  const game = new Game(
    toLevelSetup(moment.level(FRAMES.wide)),
    SeededRandom.fromString(moment.seed),
  );
  const run = new MomentRun(moment, new GameStage(game));
  run.settle();
  while (!run.over) run.advance(1 / REEL_FPS);
  return run;
}

describe('the moments of the title reel (v1.8.0)', () => {
  it('are eight, of three to five seconds: a lap of about half a minute', () => {
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
