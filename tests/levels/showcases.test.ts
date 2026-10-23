import { describe, expect, it } from 'vitest';
import { FRAMES } from '@/levels/tracks';
import { trainingDefinition, trainingLevel, type TrainingStep } from '@/levels/training';
import { playShowcase, type ShowcaseRun } from './newcomer';

/** Newcomers per board shape: their hesitations, errors and first shots differ. */
const NEWCOMERS = 10;
/** The share of games that must reach each showcase's strong moment (roadmap 1.8.0, step 2). */
const SURE = 0.9;

/** Each showcase played by newcomers on the three board shapes. */
const play = (step: TrainingStep): ShowcaseRun[] =>
  Object.values(FRAMES).flatMap((frame) =>
    Array.from({ length: NEWCOMERS }, (_, seed) =>
      playShowcase(trainingDefinition(trainingLevel(step), frame), seed),
    ),
  );

const share = (runs: readonly ShowcaseRun[], reached: (run: ShowcaseRun) => boolean) =>
  runs.filter(reached).length / runs.length;

/**
 * The training played by newcomers (v1.8.0, specification § 3.13), their
 * first shot anywhere on the chain: each showcase reaches its strong moment
 * in at least nine games out of ten, on every board shape, and every game
 * ends: without a defeat, nobody is ever stuck in it.
 */
describe('the showcases played by newcomers', () => {
  it('E1: the Nova, then a cascade', () => {
    const runs = play(1);
    expect(share(runs, (run) => run.learntAt !== null)).toBe(1);
    expect(share(runs, (run) => run.bestDepth >= 2)).toBeGreaterThanOrEqual(SURE);
    expect(share(runs, (run) => run.won)).toBe(1);
  }, 120_000);

  it('E2: a bank shot off the neon that explodes', () => {
    const runs = play(2);
    expect(share(runs, (run) => run.lessonShots > 0)).toBeGreaterThanOrEqual(SURE);
    expect(share(runs, (run) => run.won)).toBe(1);
  }, 120_000);

  it('E3: a shot the black hole bends that explodes, then the supernova', () => {
    const runs = play(3);
    expect(share(runs, (run) => run.lessonShots > 0)).toBeGreaterThanOrEqual(SURE);
    expect(share(runs, (run) => run.won)).toBe(1);
  }, 120_000);
});
