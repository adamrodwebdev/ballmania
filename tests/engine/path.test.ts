import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/core/Random';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Path } from '@/engine/path/Path';

describe('Vec2', () => {
  it('computes lengths, angles and interpolations', () => {
    const v = new Vec2(3, 4);
    expect(v.length()).toBe(5);
    expect(v.normalize().x).toBeCloseTo(0.6);
    expect(Vec2.ZERO.normalize()).toBe(Vec2.ZERO);
    expect(new Vec2(0, 0).lerp(new Vec2(10, 20), 0.5)).toEqual(new Vec2(5, 10));
    expect(Vec2.fromAngle(Math.PI / 2, 2).y).toBeCloseTo(2);
    expect(new Vec2(1, 0).dot(new Vec2(0, 1))).toBe(0);
  });
});

describe('Path', () => {
  const line = Path.fromPoints([new Vec2(0, 0), new Vec2(100, 0), new Vec2(100, 50)]);

  it('measures arc length across corners', () => {
    expect(line.length).toBe(150);
    expect(line.pointAt(50)).toEqual(new Vec2(50, 0));
    expect(line.pointAt(125)).toEqual(new Vec2(100, 25));
    expect(line.start).toEqual(new Vec2(0, 0));
    expect(line.end).toEqual(new Vec2(100, 50));
  });

  it('gives the direction of travel', () => {
    expect(line.tangentAt(10)).toEqual(new Vec2(1, 0));
    expect(line.tangentAt(140)).toEqual(new Vec2(0, 1));
  });

  it('extends straight beyond both ends (entrance tunnel, hole)', () => {
    expect(line.pointAt(-20)).toEqual(new Vec2(-20, 0));
    expect(line.pointAt(160)).toEqual(new Vec2(100, 60));
  });

  it('flattens Bézier curves accurately', () => {
    // Quarter circle of radius 100, approximated by the usual cubic (k = 0.5523).
    const k = 0.5523 * 100;
    const arc = Path.fromCurves(new Vec2(100, 0), [
      { c1: new Vec2(100, k), c2: new Vec2(k, 100), to: new Vec2(0, 100) },
    ]);
    expect(arc.length).toBeCloseTo((Math.PI / 2) * 100, 0);
    expect(arc.pointAt(arc.length / 2).length()).toBeCloseTo(100, 0);
  });

  it('samples evenly for drawing', () => {
    const points = line.sample(30);
    expect(points).toHaveLength(6);
    expect(points[0]).toEqual(line.start);
    expect(points[5]).toEqual(line.end);
  });

  it('rejects degenerate tracks', () => {
    expect(() => Path.fromPoints([new Vec2(0, 0)])).toThrow();
    expect(() => Path.fromPoints([new Vec2(1, 1), new Vec2(1, 1)])).toThrow();
  });
});

describe('SeededRandom', () => {
  it('replays the same sequence from the same seed', () => {
    const a = SeededRandom.fromString('ballmania:20261012');
    const b = SeededRandom.fromString('ballmania:20261012');
    const c = SeededRandom.fromString('ballmania:20261013');
    const draw = (random: SeededRandom) => Array.from({ length: 8 }, () => random.nextInt(6));
    const first = draw(a);
    expect(draw(b)).toEqual(first);
    expect(draw(c)).not.toEqual(first);
    for (const value of first) expect(value).toBeGreaterThanOrEqual(0);
  });
});
