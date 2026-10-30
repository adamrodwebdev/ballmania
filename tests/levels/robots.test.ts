import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/core/Random';
import { findLevel } from '@/levels/campaign';
import { FRAMES, type FrameKind } from '@/levels/tracks';
import {
  BOARD_OF,
  MIX_LOOKS,
  NewcomerBrain,
  playRobot,
  PRESSURE_FROM,
  robotOf,
  type Device,
  type Newcomer,
  type Option,
} from './bot';

/** A marble's width on every board, in board units. */
const MARBLE = 52;
const DRAWS = 4000;

const brainOf = (newcomer: Newcomer, device: Device, seed = 'robots') =>
  new NewcomerBrain(robotOf(newcomer, device), SeededRandom.fromString(seed), MARBLE);

const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
const quantile = (values: number[], q: number) => sorted(values)[Math.floor(q * values.length)]!;
const deviation = (values: number[]) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
};

/**
 * The robot players of v1.8.1 (spec § 3.17): a hand per device and three
 * newcomers, as the published studies describe people.
 */
describe('robot players (v1.8.1)', () => {
  it('shoot at uneven times around their median, nine in ten under 1.37 times it', () => {
    for (const [newcomer, median] of [
      ['quick', 1.2],
      ['typical', 1.6],
      ['slow', 2.4],
    ] as const) {
      const brain = brainOf(newcomer, 'mouse');
      const pauses = Array.from({ length: DRAWS }, () => brain.pause() / 60);
      expect(quantile(pauses, 0.5), newcomer).toBeCloseTo(median, 1);
      expect(quantile(pauses, 0.9) / median, newcomer).toBeGreaterThan(1.3);
      expect(quantile(pauses, 0.9) / median, newcomer).toBeLessThan(1.45);
    }
  });

  it('take 0.35 s more a shot with a finger', () => {
    const median = (device: Device) => {
      const brain = brainOf('typical', device);
      return quantile(
        Array.from({ length: DRAWS }, () => brain.pause() / 60),
        0.5,
      );
    };
    expect(median('finger') - median('mouse')).toBeCloseTo(0.35, 1);
  });

  it('scatter their aim like a person, three times as much on a bank shot', () => {
    for (const [newcomer, device, spread] of [
      ['typical', 'mouse', 0.25],
      ['typical', 'finger', 0.3],
      ['quick', 'mouse', 0.2],
      ['slow', 'finger', 0.45],
    ] as const) {
      const brain = brainOf(newcomer, device);
      const straight = Array.from({ length: DRAWS }, () => brain.error(() => false));
      const banked = Array.from({ length: DRAWS }, () => brain.error(() => true));
      expect(deviation(straight) / MARBLE, `${newcomer} ${device}`).toBeCloseTo(spread, 1);
      expect(deviation(banked) / deviation(straight)).toBeCloseTo(3, 0);
    }
  });

  it('weigh only a few targets, drawn at random, best first', () => {
    const targets = Array.from({ length: 20 }, (_, i) => ({ score: i }));
    for (const [newcomer, looks] of [
      ['quick', 6],
      ['typical', 4],
      ['slow', 2],
    ] as const) {
      const brain = brainOf(newcomer, 'mouse');
      const weighed = brain.weigh(targets);
      expect(weighed).toHaveLength(looks);
      expect(weighed.map((target) => target.score)).toEqual(
        [...weighed.map((target) => target.score)].sort((a, b) => b - a),
      );
      expect(brain.weigh(targets.slice(0, 1))).toHaveLength(1);
    }
    // Over many shots, the typical newcomer still finds the best target now and then.
    const brain = brainOf('typical', 'mouse');
    const best = Array.from({ length: DRAWS }, () => brain.weigh(targets)[0]!.score === 19);
    expect(best.filter(Boolean).length / DRAWS).toBeCloseTo(4 / 20, 1);
  });

  it('sometimes forget to swap for a better next ball', () => {
    for (const [newcomer, rate] of [
      ['quick', 0.9],
      ['typical', 0.7],
      ['slow', 0.4],
    ] as const) {
      const brain = brainOf(newcomer, 'finger');
      const swaps = Array.from({ length: DRAWS }, () => brain.swaps()).filter(Boolean).length;
      expect(swaps / DRAWS, newcomer).toBeCloseTo(rate, 1);
    }
  });

  it("use the worlds' tools as newcomers: magnet charges kept until the chain presses", () => {
    for (const [newcomer, rate] of [
      ['quick', 0.9],
      ['typical', 0.7],
      ['slow', 0.4],
    ] as const) {
      const brain = brainOf(newcomer, 'finger');
      expect(Array.from({ length: 50 }, () => brain.pulls(PRESSURE_FROM - 0.01))).not.toContain(
        true,
      );
      const pulls = Array.from({ length: DRAWS }, () => brain.pulls(0.8)).filter(Boolean).length;
      expect(pulls / DRAWS, newcomer).toBeCloseTo(rate, 1);
      const flips = Array.from({ length: DRAWS }, () => brain.flips()).filter(Boolean).length;
      expect(flips / DRAWS, newcomer).toBeCloseTo(rate, 1);
    }
  });

  it('weigh a colour mix as one look more than the same-colour targets', () => {
    const plain: Option[] = Array.from({ length: 20 }, (_, i) => ({ score: i }));
    const mixes: Option[] = Array.from({ length: 20 }, (_, i) => ({ score: 100 + i, mix: true }));
    const weighed = brainOf('typical', 'mouse').weigh([...plain, ...mixes]);
    expect(weighed.filter((option) => !option.mix)).toHaveLength(4);
    expect(weighed.filter((option) => option.mix)).toHaveLength(MIX_LOOKS);
  });

  it('flip lava switches and pull with the magnet only when they think of it', () => {
    const robot = robotOf('typical', 'finger');
    const tools = (id: string, board: FrameKind, chance: number) =>
      playRobot(findLevel(id)!, FRAMES[board], 'tools', { ...robot, tools: chance }, 'a').report;
    expect(tools('volcano-03', 'portrait', 0).switches).toBe(0);
    expect(tools('volcano-03', 'portrait', 1).switches).toBeGreaterThan(0);
    expect(tools('abyss-07', 'portrait', 0).pulls).toBe(0);
    expect(tools('abyss-07', 'portrait', 1).pulls).toBeGreaterThan(0);
  }, 60_000);

  it('play each device on its own board, one sequence of colours with several hands', () => {
    expect(BOARD_OF).toEqual({ mouse: 'wide', finger: 'tall' });
    const level = findLevel('nebula-01')!;
    const robot = robotOf('typical', 'finger');
    const hands = ['a', 'b', 'c'].map((hand) =>
      playRobot(level, FRAMES[BOARD_OF.finger], 'robots', robot, hand),
    );
    for (const game of hands) expect(game.outcome).toBe('won');
    expect(new Set(hands.map((game) => game.elapsed)).size).toBeGreaterThan(1);
  }, 60_000);
});
