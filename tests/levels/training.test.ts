import { describe, expect, it } from 'vitest';
import { Ball } from '@/engine/chain/Ball';
import { placePowers } from '@/engine/powers/Powers';
import { TRAINING, trainingLevel } from '@/levels/training';
import { chainOf } from '../engine/helpers';

describe('the training (v1.8.0)', () => {
  it('plays three showcases of three worlds, each teaching its gesture', () => {
    expect(TRAINING.map((level) => [level.step, level.world, level.lesson, level.victory])).toEqual(
      [
        [1, 'nebula', 'shot', 'short'],
        [2, 'neon', 'bank', 'short'],
        [3, 'singularity', 'curve', 'promise'],
      ],
    );
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
    const chain = chainOf(tailFirst.map((tone) => String.fromCharCode(97 + tone)).join(''));
    // Head first, six balls for the Nova, then a cascade whose middle pair, at
    // 10 and 11, has the colour the launcher deals after the Nova.
    const colour = showcase.opening![1]!;
    const middle = tailFirst.length - 1 - 11;
    expect(tailFirst[middle]).toBe(colour);
    const depths = [chain.insert(new Ball(999, colour, 0), { index: middle, after: true })!.depth];
    for (let t = 0; t < 3; t += 1 / 120) {
      depths.push(...chain.advance(1 / 120).map((explosion) => explosion.depth));
    }
    expect(depths).toEqual([1, 2, 3]);
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
