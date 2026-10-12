import { describe, expect, it } from 'vitest';
import { Game, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Gravity } from '@/engine/orbit/Gravity';
import { Orbit } from '@/engine/orbit/Orbit';
import { Path } from '@/engine/path/Path';
import { Projectile } from '@/engine/shooter/Projectile';
import { FixedRandom, PARAMS } from './helpers';

const CENTRE = new Vec2(500, 500);
const gravity = { centre: CENTRE, strength: 6e7, horizon: 46 };

describe('Gravity', () => {
  const hole = new Gravity(gravity);

  it('pulls towards the centre, less and less with distance', () => {
    const near = hole.acceleration(new Vec2(500, 700));
    const far = hole.acceleration(new Vec2(500, 900));
    expect(near.x).toBeCloseTo(0);
    expect(near.y).toBeLessThan(0);
    expect(near.length()).toBeGreaterThan(far.length() * 3);
    // Softened at the centre: no infinite pull.
    expect(Number.isFinite(hole.acceleration(CENTRE).length())).toBe(true);
  });

  it('swallows what crosses the horizon', () => {
    expect(hole.swallows(new Vec2(530, 500))).toBe(true);
    expect(hole.swallows(new Vec2(560, 500))).toBe(false);
  });
});

describe('Orbit', () => {
  it('glides along its ring at a steady angular speed', () => {
    const orbit = new Orbit({
      centre: CENTRE,
      radiusX: 400,
      radiusY: 300,
      speed: Math.PI / 2,
      start: Math.PI / 2,
    });
    expect(orbit.position.x).toBeCloseTo(500);
    expect(orbit.position.y).toBeCloseTo(800);
    orbit.advance(1);
    expect(orbit.position.x).toBeCloseTo(100);
    expect(orbit.position.y).toBeCloseTo(500);
  });
});

describe('Projectile', () => {
  it('measures how far its course was bent', () => {
    const projectile = new Projectile(1, 0, Vec2.ZERO, new Vec2(100, 0));
    projectile.accelerate(new Vec2(0, 100), 1);
    projectile.move(0.5);
    expect(projectile.deflection).toBeCloseTo(Math.PI / 4);
    expect(projectile.age).toBe(0.5);
  });
});

describe('Game around a black hole', () => {
  /** A still chain along the top of the board, the shooter at the bottom. */
  const level = (extra: Partial<LevelSetup> = {}): LevelSetup => ({
    board: { width: 1000, height: 1000 },
    shooter: new Vec2(500, 930),
    chains: [
      {
        path: Path.fromPoints([new Vec2(0, 100), new Vec2(1000, 100)]),
        recipe: { length: 30, tones: 3, repeatChance: 0.3 },
      },
    ],
    chain: { ...PARAMS, speed: 0, rushSpeed: 600, rushDistance: 800 },
    projectileSpeed: 1000,
    fireCooldown: 0.2,
    gravity,
    ...extra,
  });

  /** Lets the chain roll in and stop. */
  const settle = (game: Game) => {
    for (let i = 0; i < 180; i++) game.update(1 / 60);
  };

  it('swallows a shot aimed through the hole', () => {
    const game = new Game(level(), new FixedRandom(0));
    settle(game);
    const events: string[] = [];
    game.events.on('swallowed', () => events.push('swallowed'));
    game.events.on('missed', () => events.push('missed'));
    game.aimAt(new Vec2(500, 100));
    expect(game.aimTarget()).toBeNull();
    expect(game.aimPath().at(-1)!.distanceTo(CENTRE)).toBeLessThan(gravity.horizon);
    expect(game.fire()).toBe(true);
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    expect(events).toEqual(['swallowed', 'missed']);
    expect(game.projectiles).toHaveLength(0);
  });

  it('bends shots, and the aim line shows exactly where they land', () => {
    const game = new Game(level(), new FixedRandom(0));
    settle(game);
    game.aimAt(new Vec2(760, 100));
    const line = game.aimLine();
    const end = line.points.at(-1)!;
    // Pulled towards the centre: the shot lands left of where it was aimed.
    expect(end.y).toBeLessThan(140);
    expect(end.x).toBeLessThan(720);
    expect(line.rebounds).toEqual([]);
    const landed: Vec2[] = [];
    game.events.on('inserted', ({ from }) => landed.push(from));
    game.fire();
    for (let i = 0; i < 60 && landed.length === 0; i++) game.update(1 / 60);
    expect(landed).toHaveLength(1);
    expect(landed[0]!.distanceTo(end)).toBeLessThan(1e-6);
  });

  it('moves the shooter along its ring, still aiming at the same point', () => {
    const game = new Game(
      level({
        orbit: { centre: CENTRE, radiusX: 430, radiusY: 430, speed: 0.5, start: Math.PI / 2 },
      }),
      new FixedRandom(0),
    );
    expect(game.shooter.position.distanceTo(new Vec2(500, 930))).toBeLessThan(1e-9);
    expect(game.ring?.radiusX).toBe(430);
    const target = new Vec2(300, 100);
    game.aimAt(target);
    game.update(1);
    const moved = game.shooter.position;
    expect(moved.x).toBeLessThan(500);
    expect(moved.distanceTo(CENTRE)).toBeCloseTo(430);
    expect(game.shooter.angle).toBeCloseTo(target.sub(moved).angle());
    expect(game.summary().curves).toBe(0);
  });
});
