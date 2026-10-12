import { describe, expect, it } from 'vitest';
import { CAMPAIGN, findLevel, starsFor } from '@/levels/campaign';
import { FRAMES } from '@/levels/tracks';
import { playLevel } from './bot';

const SEEDS = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('playability (casual bot: one shot every 1.2 s, imprecise)', () => {
  it.each(CAMPAIGN.map((level) => [level.id, level] as const))('%s can be won', (_, level) => {
    const runs = SEEDS.map((seed) => playLevel(level, FRAMES.square, seed, 72, 24));
    expect(runs.filter((run) => run.outcome === 'won').length).toBeGreaterThanOrEqual(4);
  });

  it('starts gently and saves the greatest pressure for the Colossus', () => {
    const danger = (id: string) => {
      const runs = SEEDS.map((seed) => playLevel(findLevel(id)!, FRAMES.square, seed, 72, 24));
      return runs.reduce((sum, run) => sum + run.danger, 0) / runs.length;
    };
    const first = danger('nebula-01');
    expect(first).toBeLessThan(0.5);
    expect(danger('nebula-12')).toBeGreaterThan(first + 0.2);
  });

  it('gives a casual player one or two stars, rarely three', () => {
    const stars = CAMPAIGN.flatMap((level) =>
      SEEDS.slice(0, 3).map((seed) => {
        const run = playLevel(level, FRAMES.square, seed, 72, 24);
        return starsFor(level, run.score, run.outcome === 'won');
      }),
    );
    const average = stars.reduce((sum, value) => sum + value, 0) / stars.length;
    expect(average).toBeGreaterThan(1.2);
    expect(average).toBeLessThan(2.6);
  });
});
