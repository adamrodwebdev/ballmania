import { describe, expect, it } from 'vitest';
import { Vec2 } from '@/engine/geometry/Vec2';
import {
  buildPath,
  LEVEL_DEFAULTS,
  spiral,
  toLevelSetup,
  type LevelDefinition,
} from '@/levels/LevelDefinition';

const minimal: LevelDefinition = {
  id: 'test',
  board: { width: 100, height: 100 },
  shooter: [50, 50],
  chains: [
    {
      path: {
        kind: 'points',
        points: [
          [0, 10],
          [100, 10],
        ],
      },
      length: 5,
      tones: 3,
      repeatChance: 0,
    },
  ],
  speed: 20,
};

describe('LevelDefinition', () => {
  it('builds polylines and Bézier tracks', () => {
    expect(
      buildPath({
        kind: 'points',
        points: [
          [0, 0],
          [30, 40],
        ],
      }).length,
    ).toBe(50);
    const curve = buildPath({
      kind: 'curves',
      start: [0, 0],
      segments: [
        [
          [0, 0],
          [10, 0],
          [10, 0],
        ],
      ],
    });
    expect(curve.end).toEqual(new Vec2(10, 0));
  });

  it('fills the optional settings with the defaults', () => {
    const setup = toLevelSetup(minimal);
    expect(setup.chain).toEqual({
      ballRadius: LEVEL_DEFAULTS.ballRadius,
      speed: 20,
      rushSpeed: 20,
      rushDistance: 0,
      retreatSpeed: LEVEL_DEFAULTS.retreatSpeed,
      minMatch: 3,
    });
    expect(setup.projectileSpeed).toBe(LEVEL_DEFAULTS.projectileSpeed);
    expect(setup.chains[0]!.recipe).toEqual({ length: 5, tones: 3, repeatChance: 0 });
    expect(setup.shooter).toEqual(new Vec2(50, 50));
  });

  it('draws inward spirals', () => {
    const points = spiral([0, 0], 100, 50, 1, 0);
    expect(points[0]![0]).toBeCloseTo(100);
    expect(Math.hypot(...points[points.length - 1]!)).toBeCloseTo(50);
  });
});
