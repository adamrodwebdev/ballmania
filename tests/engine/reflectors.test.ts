import { describe, expect, it } from 'vitest';
import { Segment } from '@/engine/geometry/Segment';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Game, MAX_BOUNCES, type LevelSetup } from '@/engine/Game';
import { Prism, Reflectors } from '@/engine/reflectors/Reflectors';
import { POINTS_PER_BALL, Scoring } from '@/engine/Scoring';
import { FixedRandom, PARAMS, straightPath } from './helpers';

describe('Segment', () => {
  const segment = new Segment(new Vec2(0, 0), new Vec2(10, 0));

  it('finds the closest point, clamped to the ends', () => {
    expect(segment.closestPoint(new Vec2(4, 7))).toEqual(new Vec2(4, 0));
    expect(segment.closestPoint(new Vec2(-5, 3))).toEqual(new Vec2(0, 0));
    expect(segment.distanceTo(new Vec2(13, 4))).toBe(5);
    expect(Math.abs(segment.normal().y)).toBe(1);
  });
});

describe('Reflectors', () => {
  const wall = new Reflectors([{ kind: 'wall', from: new Vec2(100, 0), to: new Vec2(100, 200) }]);

  it('reflects a ball heading into a mirror and pushes it out', () => {
    const bounce = wall.bounce(new Vec2(95, 50), new Vec2(10, 3), 10)!;
    expect(bounce.velocity.x).toBeCloseTo(-10);
    expect(bounce.velocity.y).toBeCloseTo(3);
    expect(bounce.position.x).toBeCloseTo(90);
  });

  it('ignores a ball moving away or out of reach', () => {
    expect(wall.bounce(new Vec2(95, 50), new Vec2(-10, 0), 10)).toBeNull();
    expect(wall.bounce(new Vec2(50, 50), new Vec2(10, 0), 10)).toBeNull();
  });

  it('turns prisms and moves their faces with them', () => {
    const prism = new Prism(new Vec2(0, 0), 50, 3, 0, Math.PI);
    const before = prism.segments[0]!.a;
    prism.update(0.5);
    expect(prism.angle).toBeCloseTo(Math.PI / 2);
    expect(prism.segments[0]!.a.y).toBeCloseTo(50);
    expect(before.x).toBeCloseTo(50);
    expect(prism.corners).toHaveLength(3);
  });
});

describe('Scoring with ricochets', () => {
  it('multiplies the balls by 1 + bounces and remembers the best', () => {
    const scoring = new Scoring();
    expect(scoring.explosion(3, 1, true, 2)).toBe(3 * POINTS_PER_BALL * 3);
    expect(scoring.bestBounce).toBe(2);
  });
});

describe('Game with mirrors', () => {
  // A chain of 2 balls of tone 0 along y = 100; a wall at x = 700 sends shots back left.
  const level: LevelSetup = {
    board: { width: 1000, height: 1000 },
    shooter: new Vec2(500, 400),
    chains: [{ path: straightPath(), recipe: { length: 2, tones: 2, repeatChance: 0.5 } }],
    chain: { ...PARAMS, speed: 0, rushSpeed: 600, rushDistance: 400 },
    projectileSpeed: 1500,
    fireCooldown: 0.2,
    reflectors: [{ kind: 'wall', from: new Vec2(700, 0), to: new Vec2(700, 1000) }],
  };

  const settle = (game: Game) => {
    for (let i = 0; i < 120; i++) game.update(1 / 60);
  };

  it('scores a bank shot with its multiplier', () => {
    const game = new Game(level, new FixedRandom(0));
    settle(game);
    const head = game.chains[0]!.balls[1]!;
    const target = game.chains[0]!.positionOf(head);
    // Aim at the mirror image of the target behind the wall.
    game.aimAt(new Vec2(1400 - target.x - 10, target.y));
    const bounces: number[] = [];
    let points = 0;
    game.events.on('bounced', () => bounces.push(1));
    game.events.on('exploded', (event) => {
      points = event.points;
      expect(event.bounces).toBe(1);
    });
    expect(game.aimPath()).toHaveLength(3);
    game.fire();
    for (let i = 0; i < 120 && game.state === 'playing'; i++) game.update(1 / 60);
    expect(bounces).toHaveLength(1);
    expect(points).toBe(3 * POINTS_PER_BALL * 2);
    expect(game.summary().bestBounce).toBe(1);
  });

  it('shatters a shot caught between two mirrors', () => {
    const trap: LevelSetup = {
      ...level,
      reflectors: [
        { kind: 'wall', from: new Vec2(400, 300), to: new Vec2(400, 500) },
        { kind: 'wall', from: new Vec2(600, 300), to: new Vec2(600, 500) },
      ],
    };
    const game = new Game(trap, new FixedRandom(0));
    settle(game);
    const missed: number[] = [];
    game.events.on('missed', ({ projectile }) => missed.push(projectile.bounces));
    game.aimAt(new Vec2(1000, 400));
    game.fire();
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    expect(missed).toEqual([MAX_BOUNCES + 1]);
    expect(game.projectiles).toHaveLength(0);
  });
});
