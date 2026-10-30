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

  it("deals the level's opening colours first, while they are on the track", () => {
    const game = new Game(level([0, 1, 2, 0, 1, 2], { opening: [2, 1, 2] }), new FixedRandom(0));
    expect([game.shooter.current, game.shooter.next]).toEqual([2, 1]);
    // Straight up, past the chain: a miss, and the next colour of the opening.
    game.aimAt(new Vec2(500, 0));
    expect(game.fire()).toBe(true);
    expect([game.shooter.current, game.shooter.next]).toEqual([1, 2]);
    // A colour no longer on the track is skipped, and chance takes over.
    const skipped = new Game(level([0, 1], { opening: [2, 1] }), new FixedRandom(0));
    expect([skipped.shooter.current, skipped.shooter.next]).toEqual([0, 1]);
  });

  it('deals a colour that has a pair after two shots of colours that had none', () => {
    // Tail first: a pair of cyan, then yellow and red; chance always deals red (index 0).
    const game = new Game(level([1, 1, 2, 0]), new FixedRandom(0));
    expect([game.shooter.current, game.shooter.next]).toEqual([0, 0]);
    // Straight up, past the chain: red shots, with no red pair on the board.
    game.aimAt(new Vec2(500, 0));
    expect(game.fire()).toBe(true);
    expect(game.shooter.next).toBe(0);
    expect(game.fire()).toBe(true);
    expect(game.shooter.next).toBe(1);
    // A shot of a colour that has a pair is never dry: chance keeps dealing.
    const lucky = new Game(level([0, 0, 2, 1]), new FixedRandom(0));
    lucky.aimAt(new Vec2(500, 0));
    lucky.fire();
    lucky.fire();
    expect(lucky.shooter.next).toBe(0);
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

  it('follows the aim once: the line knows its target, and the preview reuses it', () => {
    const game = new Game(level([0, 0, 1, 2]), new FixedRandom(0));
    game.aimAt(new Vec2(325, 100));
    const line = game.aimLine();
    expect(line.target).toMatchObject({ chain: 0, index: 1, after: true });
    expect(game.aimTarget()?.index).toBe(line.target?.index);
    expect(game.preview(false, line)).toEqual(game.preview());
  });

  it('draws the line of any angle without turning the shooter, up to the edge of the board', () => {
    const game = new Game(level([0, 0, 1, 2]), new FixedRandom(0));
    game.aimAt(new Vec2(325, 100));
    const angle = game.shooter.angle;
    const down = game.aimLineAt(Math.PI / 2);
    expect(game.shooter.angle).toBe(angle);
    expect(down.target).toBeNull();
    // A shot given up past the edge (plus a margin): the line stops there too.
    expect(down.points.at(-1)!.y).toBeLessThan(1000 + PARAMS.ballRadius * 2 + 20);
    expect(game.aimLineAt(angle)).toEqual(game.aimLine());
  });

  it('shows the chain reaction a shot would set off, when asked', () => {
    // A red shot between the two reds: they burst, and the blues on either side meet.
    const game = new Game(level([1, 0, 0, 1, 1]), new FixedRandom(0));
    game.loadTone(0);
    game.aimAt(new Vec2(345, 100));
    expect(game.preview()?.reaction).toEqual([]);
    expect(game.preview(false, game.aimLine(), true)?.reaction.length).toBeGreaterThan(0);
  });

  it('counts the charged shots among the shots (v1.8.1)', () => {
    const game = new Game(level([0, 1, 2, 0, 1, 2]), new FixedRandom(0));
    game.aimAt(new Vec2(500, 0));
    expect(game.fire(true)).toBe(true);
    for (let step = 0; step < 600 && !game.shooter.ready; step++) game.update(1 / 120);
    expect(game.fire()).toBe(true);
    expect(game.summary().shots).toBe(2);
    expect(game.summary().chargedShots).toBe(1);
  });

  it("loads a puzzle hint's colour without counting a swap of the player", () => {
    const game = new Game(level([0, 1, 2, 0, 1, 2]), new FixedRandom(0));
    const other = game.shooter.next;
    game.loadTone(other);
    expect(game.shooter.current).toBe(other);
    expect(game.summary().swaps).toBe(0);
    game.swap();
    expect(game.summary().swaps).toBe(1);
  });
});
