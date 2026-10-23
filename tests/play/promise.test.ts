import { describe, expect, it } from 'vitest';
import {
  GONE_AT,
  PROMISE_AFTER,
  PROMISE_LENGTH,
  promisePose,
  RISE_AT,
  ROAR_AT,
  type PromisePose,
} from '@/play/effects/Promise';
import { effectTime, NOVA, OVER, promiseTime, RESULT, SHORT_PACE } from '@/play/effects/Victory';

const STEP = 1 / 120;
const poses = (still: boolean) =>
  Array.from({ length: Math.floor(PROMISE_LENGTH / STEP) }, (_, i) => ({
    t: i * STEP,
    pose: promisePose(i * STEP, still)!,
  }));

describe('the victory of each style (v1.8.0)', () => {
  it('ends a showcase in about a second, the training after the promise', () => {
    expect(OVER.supernova).toBe(RESULT);
    expect(OVER.short).toBeGreaterThan(0.9);
    expect(OVER.short).toBeLessThan(1.3);
    // The promise plays whole, about 4 s after the supernova, before the end screen.
    expect(OVER.promise - NOVA).toBeGreaterThan(PROMISE_AFTER + PROMISE_LENGTH);
    expect(OVER.promise - NOVA).toBeLessThan(6);
  });

  it('runs the short burst on a faster clock, and the promise after the supernova', () => {
    expect(effectTime('short', 0.5)).toBeCloseTo(0.5 * SHORT_PACE);
    expect(effectTime('promise', 0.5)).toBe(0.5);
    expect(promiseTime(NOVA + PROMISE_AFTER)).toBeCloseTo(0);
    expect(promiseTime(NOVA)).toBeLessThan(0);
  });
});

describe('the promise of the young Colossus', () => {
  it('stirs the hole, then rises out of it, roars, stares at the player and dives back', () => {
    expect(promisePose(-0.1, false)).toBeNull();
    expect(promisePose(PROMISE_LENGTH, false)).toBeNull();
    // Nothing yet but the hole stirring.
    const stirring = promisePose(RISE_AT / 2, false)!;
    expect(stirring.alpha).toBe(0);
    expect(stirring.stir).toBeGreaterThan(0.3);
    // Risen: above the hole, at its size, its eye open, looking up.
    const risen = promisePose(1.4, false)!;
    expect(risen.alpha).toBe(1);
    expect(risen.lift).toBeGreaterThan(0.4);
    expect(risen.scale).toBeCloseTo(1, 1);
    expect(risen.open).toBeGreaterThan(0.9);
    expect(risen.ahead).toBe(1);
    // The roar: swollen, runes flung out, raging.
    const roaring = promisePose(ROAR_AT + 0.2, false)!;
    expect(roaring.scale).toBeGreaterThan(1.05);
    expect(roaring.spread).toBeGreaterThan(1.5);
    expect(roaring.rage).toBe(1);
    // The stare: the eye turned to the player.
    const staring = promisePose(2.7, false)!;
    expect(staring.ahead).toBe(0);
    expect(staring.rage).toBe(0);
    // Gone, back into the hole.
    expect(promisePose(GONE_AT - 0.05, false)!.scale).toBeLessThan(0.5);
    expect(promisePose(GONE_AT, false)!.alpha).toBe(0);
  });

  it('never pops: every part of the pose moves smoothly while it shows', () => {
    // The most each part may change in 1/120 s: the roar and the dive are quick, never a jump.
    const limits: Record<keyof PromisePose, number> = {
      scale: 0.06,
      lift: 0.05,
      alpha: 0.12,
      spread: 0.08,
      turn: 0.25,
      open: 0.2,
      ahead: 0.1,
      rage: 0.1,
      stir: 0.08,
    };
    const frames = poses(false);
    for (let i = 1; i < frames.length; i++) {
      const [before, now] = [frames[i - 1]!.pose, frames[i]!.pose];
      // Unseen, the body may take its first size or leave its last.
      const shown = before.alpha > 0 && now.alpha > 0;
      for (const key of Object.keys(limits) as (keyof PromisePose)[]) {
        if (!shown && key !== 'alpha' && key !== 'stir') continue;
        expect(
          Math.abs(now[key] - before[key]),
          `${key} at ${frames[i]!.t.toFixed(3)}`,
        ).toBeLessThan(limits[key]);
      }
      // The runes only ever turn forwards.
      if (shown) expect(now.turn).toBeGreaterThanOrEqual(before.turn);
    }
  });

  it('keeps still with reduced motion: no growth, no roar that moves it, no tremble', () => {
    for (const { pose } of poses(true)) {
      expect(pose.scale === 0 || pose.scale === 1).toBe(true);
      expect(pose.rage).toBe(0);
    }
    expect(promisePose(2.7, true)!.alpha).toBe(1);
    expect(promisePose(2.7, true)!.ahead).toBe(0);
  });
});
