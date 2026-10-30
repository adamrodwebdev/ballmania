import { describe, expect, it } from 'vitest';
import { starsFor } from '@/levels/calibration';
import { CAMPAIGN, findLevel } from '@/levels/campaign';
import { FRAMES } from '@/levels/tracks';
import { boardOn } from './boards';
import { AIMING, playLevel, playRobot, robotOf } from './bot';

const SEEDS = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('playability (casual bot: one shot every 1.2 s, imprecise)', () => {
  /**
   * No level out of reach (v1.8.1): the quick newcomer, at the finger on the
   * board a phone gives the level, wins at least half of its games, even where
   * the typical one is meant to win only a third (the hardest of worlds 5 and 6).
   * Judged on 48 games, within two standard errors as the gate is (§ 3.17): on
   * twelve, 4-10 and 6-11 failed on the luck of their colours, though the quick
   * newcomer wins them 77 and 61 times in 100 (30/10/2026).
   */
  const quick = robotOf('quick', 'finger');
  const REACH = Array.from({ length: 48 }, (_, i) => `reach-${i}`);
  /** Half the games, less two standard errors. */
  const HALF = REACH.length / 2 - Math.sqrt(REACH.length);
  // 48 whole games per level: a busy or hot machine can take longer than the default 5 s.
  it.each(CAMPAIGN.map((level) => [level.id, level] as const))(
    '%s can be won',
    (_, level) => {
      const frame = FRAMES[boardOn(level, 'phone')];
      const runs = REACH.map((seed) => playRobot(level, frame, seed, quick, `${seed}/quick`));
      expect(runs.filter((run) => run.outcome === 'won').length).toBeGreaterThanOrEqual(HALF);
    },
    120_000,
  );

  it('starts gently and saves the greatest pressure for the Colossus', () => {
    const danger = (id: string) => {
      const runs = SEEDS.map((seed) => playLevel(findLevel(id)!, FRAMES.square, seed, 72, 24));
      return runs.reduce((sum, run) => sum + run.danger, 0) / runs.length;
    };
    const first = danger('nebula-01');
    expect(first).toBeLessThan(0.5);
    const boss = danger('nebula-12');
    expect(boss).toBeGreaterThan(first + 0.2);
    // The young Colossus of 1-3 is a first boss, not the last one: less pressure.
    expect(danger('nebula-03')).toBeLessThan(boss);
  });

  it('lets a casual player beat the young Colossus of 1-3 nearly every time', () => {
    const level = findLevel('nebula-03')!;
    for (const frame of Object.values(FRAMES)) {
      const runs = SEEDS.map((seed) => playLevel(level, frame, seed, 72, 24));
      expect(runs.filter((run) => run.outcome === 'won').length, frame.kind).toBeGreaterThanOrEqual(
        5,
      );
    }
  }, 30_000);

  it('never keeps the player waiting for balls in world 1', () => {
    for (const level of CAMPAIGN.filter((candidate) => candidate.id.startsWith('nebula-'))) {
      // A player quicker than most humans (a shot every 0.9 s): humans take longer to decide.
      const runs = SEEDS.slice(0, 3).map((seed) => playLevel(level, FRAMES.square, seed, 54, 18));
      const waited = runs.reduce((sum, run) => sum + run.thin, 0);
      const played = runs.reduce((sum, run) => sum + run.seconds, 0);
      // Fewer than three balls on the board while more wait in the tunnel: under 5 % of the game.
      expect(waited / played, level.id).toBeLessThan(0.05);
    }
  }, 60_000);

  // The typical newcomer of the v1.8.1 robots: the stars are calibrated seat by seat on careful ones.
  it('gives a typical newcomer one or two stars, rarely three, on a phone as on a desktop', () => {
    for (const [device, screen] of [
      ['finger', 'phone'],
      ['mouse', 'desktop'],
    ] as const) {
      const typical = robotOf('typical', device);
      const stars = CAMPAIGN.flatMap((level) =>
        SEEDS.slice(0, 3).map((seed) => {
          const board = boardOn(level, screen);
          const run = playRobot(level, FRAMES[board], seed, typical, `${seed}/stars`);
          const seat = { board, aiming: AIMING[device] };
          return starsFor(level, seat, { score: run.score, won: run.outcome === 'won' });
        }),
      );
      const average = stars.reduce((sum, value) => sum + value, 0) / stars.length;
      expect(average, device).toBeGreaterThan(1);
      expect(average, device).toBeLessThan(2.2);
      expect(stars.filter((value) => value === 3).length / stars.length, device).toBeLessThan(0.2);
    }
  }, 120_000);
});
