import { describe, expect, it } from 'vitest';
import { Vec2 } from '@/engine/geometry/Vec2';
import { DEMO_LEVEL } from '@/levels/demo';
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

describe('demo level', () => {
  const setup = toLevelSetup(DEMO_LEVEL);
  const path = setup.chains[0]!.path;
  const radius = setup.chain.ballRadius;

  it('keeps the visible track on the board', () => {
    for (const point of path.sample(10)) {
      if (point.y < 0) continue; // entrance tunnel, above the board
      expect(point.x).toBeGreaterThanOrEqual(radius);
      expect(point.x).toBeLessThanOrEqual(setup.board.width - radius);
      expect(point.y).toBeLessThanOrEqual(setup.board.height - radius);
    }
  });

  it('leaves room around the shooter', () => {
    for (const point of path.sample(10)) {
      expect(point.distanceTo(setup.shooter)).toBeGreaterThan(58 + radius * 2);
    }
  });

  it('keeps the turns of the spiral apart', () => {
    const samples = path.sample(10);
    samples.forEach((point, i) => {
      for (let j = i + 40; j < samples.length; j++) {
        expect(point.distanceTo(samples[j]!), `${i}-${j}`).toBeGreaterThan(radius * 2);
      }
    });
  });

  it('is longer than its chain, so the player has time to play', () => {
    expect(path.length).toBeGreaterThan(DEMO_LEVEL.chains[0]!.length * radius * 2);
  });
});
