import { describe, expect, it } from 'vitest';
import { Game, POWER_SPEED, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { FixedRandom, PARAMS, straightPath } from './helpers';

/** A still chain along y = 100 (tail at x = 300), the shooter below it. */
const level = (tones: readonly number[], extra: Partial<LevelSetup> = {}): LevelSetup => ({
  board: { width: 1000, height: 1000 },
  shooter: new Vec2(500, 700),
  chains: [
    { path: straightPath(), recipe: { length: 4, tones: 3, repeatChance: 0 }, tones, tail: 300 },
  ],
  chain: { ...PARAMS, speed: 0, rushSpeed: 0 },
  projectileSpeed: 1000,
  fireCooldown: 0,
  ...extra,
});

describe('the shooting module', () => {
  it('fires a powered shot twice as fast, straight through gravity', () => {
    const gravity = { centre: new Vec2(700, 400), strength: 6e7, horizon: 20 };
    const game = new Game(level([0, 1, 2, 0, 1, 2], { gravity }), new FixedRandom(0));
    game.aimAt(new Vec2(500, 0));
    const bent = game.aimLine(2, false).points.at(-1)!;
    const straight = game.aimLine(2, true).points.at(-1)!;
    expect(Math.abs(straight.x - 500)).toBeLessThan(1);
    expect(bent.x).toBeGreaterThan(510);
    expect(game.fire(true)).toBe(true);
    const projectile = game.projectiles[0]!;
    expect(projectile.powered).toBe(true);
    game.update(0.05);
    expect(projectile.position.y).toBeCloseTo(700 - 1000 * POWER_SPEED * 0.05, -1);
    expect(projectile.position.x).toBeCloseTo(500);
  });

  it('previews the slot of the shot and the group it would burst', () => {
    // Tail first: a a b c, ball radius 10 so balls are 20 apart from x = 300.
    const game = new Game(level([0, 0, 1, 2]), new FixedRandom(0));
    expect(game.shooter.current).toBe(0);
    // Just ahead of the second red: the new ball lands after it, next to both reds.
    game.aimAt(new Vec2(325, 100));
    const preview = game.preview()!;
    expect(preview.position.x).toBeCloseTo(330);
    expect(preview.group.map((point) => point.x)).toEqual([320, 300]);
    // Onto the cyan ball: no group to burst, only the slot.
    game.aimAt(new Vec2(360, 100));
    expect(game.preview()?.group).toEqual([]);
    game.aimAt(new Vec2(500, 900));
    expect(game.preview()).toBeNull();
  });
});
