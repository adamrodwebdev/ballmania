import { describe, expect, it } from 'vitest';
import {
  AFTERGLOW,
  afterglow,
  gathering,
  moteAt,
  NOVA,
  novaAge,
  novaCore,
  RESULT,
  shockRings,
  stardust,
  surge,
  SURGE,
} from '@/play/effects/Victory';

/** A repeatable random source. */
const sequence = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
};

describe('Victory', () => {
  it('runs the light, bursts, then opens the result while the afterglow fades', () => {
    expect(SURGE).toBeLessThanOrEqual(NOVA);
    expect(NOVA).toBeLessThan(RESULT);
    expect(RESULT).toBeLessThan(AFTERGLOW);
    // The result comes soon after the burst: the player is not kept waiting.
    expect(RESULT).toBeLessThanOrEqual(2);
  });

  it('carries the light from the entrance to the hole, smoothly', () => {
    expect(surge(0)).toBe(0);
    expect(surge(SURGE)).toBe(1);
    expect(surge(SURGE * 2)).toBe(1);
    let last = 0;
    for (let t = 0; t <= SURGE; t += 0.05) {
      expect(surge(t)).toBeGreaterThanOrEqual(last);
      last = surge(t);
    }
    // It eases in and out: slow at both ends, fast in the middle.
    expect(surge(SURGE * 0.1)).toBeLessThan(0.1);
    expect(surge(SURGE * 0.9)).toBeGreaterThan(0.9);
  });

  it('keeps the tracks lit while the light runs, then fades them out', () => {
    expect(afterglow(0)).toBe(1);
    expect(afterglow(SURGE)).toBe(1);
    expect(afterglow((SURGE + AFTERGLOW) / 2)).toBeGreaterThan(0);
    expect(afterglow((SURGE + AFTERGLOW) / 2)).toBeLessThan(1);
    expect(afterglow(AFTERGLOW)).toBe(0);
  });

  it('gathers the light in the hole just before the burst', () => {
    expect(gathering(0)).toBe(0);
    expect(gathering(NOVA - 0.01)).toBeGreaterThan(0.9);
    expect(gathering(NOVA)).toBe(0);
    expect(novaAge(NOVA - 0.01)).toBeNull();
    expect(novaAge(NOVA + 0.5)).toBeCloseTo(0.5);
  });

  it('sends shock rings out to the edge of the screen, then lets them go', () => {
    expect(shockRings(0, 1000)).toEqual([]);
    const early = shockRings(0.1, 1000);
    const later = shockRings(0.4, 1000);
    expect(later[0]!.radius).toBeGreaterThan(early[0]!.radius);
    expect(later[0]!.alpha).toBeLessThan(early[0]!.alpha);
    for (let age = 0; age < 2; age += 0.05) {
      for (const ring of shockRings(age, 1000)) {
        expect(ring.radius).toBeLessThanOrEqual(1000);
        expect(ring.alpha).toBeGreaterThan(0);
      }
    }
    expect(shockRings(2, 1000)).toEqual([]);
    expect(novaCore(0)!.alpha).toBe(1);
    expect(novaCore(1)).toBeNull();
  });

  it('throws the same stardust for the same win, which drifts up and fades', () => {
    const dust = stardust(30, 400, sequence(7));
    expect(dust).toEqual(stardust(30, 400, sequence(7)));
    for (const mote of dust) {
      expect(moteAt(mote, 0)).toBeNull();
      const thrown = moteAt(mote, 1)!;
      // Thrown out, then rising: higher a second later than it was thrown.
      expect(Math.hypot(thrown.dx, thrown.dy)).toBeGreaterThan(0);
      const after = moteAt(mote, 1.5);
      if (after) expect(after.dy).toBeLessThan(thrown.dy);
      expect(moteAt(mote, mote.life)).toBeNull();
    }
  });
});
