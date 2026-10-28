import { describe, expect, it } from 'vitest';
import { Ball } from '@/engine/chain/Ball';
import { placePowers } from '@/engine/powers/Powers';
import { TRAINING, trainingLevel } from '@/levels/training';
import { chainOf } from '../engine/helpers';

describe('the training (v1.8.0)', () => {
  it('plays three showcases of three worlds, each teaching its gesture', () => {
    expect(
      TRAINING.map((level) => [level.step, level.world, level.lessons, level.victory]),
    ).toEqual([
      // E1 teaches every control, one at a time (v1.8.1).
      [1, 'nebula', ['shot', 'swap', 'charge'], 'short'],
      [2, 'neon', ['bank'], 'short'],
      [3, 'singularity', ['curve'], 'promise'],
    ]);
    expect(trainingLevel(2).mirrors?.length).toBeGreaterThan(0);
    expect(trainingLevel(3).gravity).toBeGreaterThan(0);
    // A still launcher, so that the curve reads at once.
    expect(trainingLevel(3).orbit).toBeUndefined();
    // Nothing of the campaign's progress: none of them is a campaign level.
    expect(TRAINING.every((level) => level.id.startsWith('training-'))).toBe(true);
  });

  it('lays out E1 as the showcase: a cascade behind the Nova, a Laser behind it', () => {
    const showcase = trainingLevel(1);
    expect(showcase.gift).toBe('bomb');
    const tailFirst = showcase.sequence!;
    // Head first, six balls for the Nova, then a cascade whose middle pair, at
    // 10 and 11, has the colour of the next ball after the Nova (v1.8.1): the
    // ball loaded then makes no more than a group, so the swap pays.
    const [, loaded, swapped] = showcase.opening!;
    const middle = tailFirst.length - 1 - 11;
    expect(tailFirst[middle]).toBe(swapped);
    expect(loaded).not.toBe(swapped);
    const cascade = (colour: number, index: number) => {
      const fresh = chainOf(tailFirst.map((tone) => String.fromCharCode(97 + tone)).join(''));
      const depths = [fresh.insert(new Ball(999, colour, 0), { index, after: true })!.depth];
      for (let t = 0; t < 3; t += 1 / 120) {
        depths.push(...fresh.advance(1 / 120).map((explosion) => explosion.depth));
      }
      return depths;
    };
    expect(cascade(swapped!, middle)).toEqual([1, 2, 3]);
    // Into either pair of its colour in the cascade, the loaded ball bursts a group, nothing more.
    const pairs = tailFirst
      .map((tone, index) => ({ tone, index }))
      .filter(({ tone, index }) => tone === loaded && tailFirst[index - 1] === loaded)
      .filter(({ index }) => index >= tailFirst.length - 16 && index < tailFirst.length - 6);
    expect(pairs.length).toBeGreaterThan(0);
    for (const { index } of pairs) expect(cascade(loaded!, index)).toEqual([1]);
    // The Laser rides in the pair right behind the cascade, 16 balls from the head.
    expect(placePowers(tailFirst, showcase.powers!).indexOf('laser')).toBe(
      tailFirst.length - 1 - 16,
    );
  });
  it('lays out E2 and E3 with a cascade at the head, then pairs in turn', () => {
    for (const step of [2, 3] as const) {
      const level = trainingLevel(step);
      const tailFirst = level.sequence!;
      expect(tailFirst).toHaveLength(level.length);
      // No run of three: nothing bursts before a shot.
      expect(
        tailFirst.some((tone, i) => tone === tailFirst[i + 1] && tone === tailFirst[i + 2]),
      ).toBe(false);
      // The colour dealt first fits the middle pair, 4 and 5 balls from the head:
      // a shot of it there sets off a three-step cascade.
      const colour = level.opening![0]!;
      const middle = tailFirst.length - 1 - 5;
      expect(tailFirst[middle]).toBe(colour);
      const chain = chainOf(tailFirst.map((tone) => String.fromCharCode(97 + tone)).join(''));
      const depths = [
        chain.insert(new Ball(999, colour, 0), { index: middle, after: true })!.depth,
      ];
      for (let t = 0; t < 3; t += 1 / 120) {
        depths.push(...chain.advance(1 / 120).map((explosion) => explosion.depth));
      }
      expect(depths, `E${step}`).toEqual([1, 2, 3]);
    }
  });
});
