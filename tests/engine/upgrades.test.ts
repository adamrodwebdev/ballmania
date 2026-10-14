import { describe, expect, it } from 'vitest';
import { Game, GIFT_BOMB_RADIUS, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { StarFragments } from '@/engine/upgrades/StarFragments';
import { Upgrades, type UpgradeRanks } from '@/engine/upgrades/Upgrades';
import { FixedRandom, PARAMS, straightPath } from './helpers';

const run = (game: Game, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) game.update(1 / 60);
};

/** A still chain along y = 100 from x = 300, the shooter below it, with upgrades. */
const level = (
  tones: readonly number[],
  upgrades: UpgradeRanks,
  extra: Partial<LevelSetup> = {},
): LevelSetup => ({
  board: { width: 1000, height: 1000 },
  shooter: new Vec2(500, 700),
  chains: [
    { path: straightPath(), recipe: { length: 4, tones: 3, repeatChance: 0 }, tones, tail: 300 },
  ],
  chain: { ...PARAMS, speed: 0, rushSpeed: 0 },
  projectileSpeed: 1500,
  fireCooldown: 0,
  upgrades,
  ...extra,
});

describe('upgrades', () => {
  it('scale every effect with their rank, from none to rank 3', () => {
    const none = new Upgrades();
    const full = new Upgrades({ chronos: 3, anchor: 3, shield: 2, nova: 1, eye: 9 });
    expect(none.chronos).toBe(1);
    expect(full.chronos).toBeCloseTo(0.88);
    expect(none.windPull).toBe(1);
    expect(full.windPull).toBe(0);
    expect(none.solarImmunity).toBe(Infinity);
    expect(full.solarImmunity).toBe(0);
    expect(none.novaBalls).toBeNull();
    expect(full.novaBalls).toBe(30);
    // Ranks are capped at 3.
    expect(full.rank('eye')).toBe(3);
    expect(full.reactionPreview).toBe(true);
  });

  it('let a shot catch the star fragments crossing the board', () => {
    const fragments = new StarFragments(1, { width: 1000, height: 1000 }, new FixedRandom(0.5));
    for (let i = 0; i < 60; i++) fragments.update(1 / 30);
    expect(fragments.fragments).toHaveLength(1);
    const at = fragments.fragments[0]!.position;
    expect(fragments.catchAt(at.add(new Vec2(100, 0)), 40)).toBeNull();
    expect(fragments.catchAt(at.add(new Vec2(30, 0)), 40)?.id).toBe(1);
    expect(fragments.fragments).toHaveLength(0);
  });

  it('load a rainbow ball every few shots, which takes the colour it touches', () => {
    const game = new Game(level([1, 1, 2, 2], { prism: 3 }), new FixedRandom(0));
    for (let i = 0; i < 9; i++) {
      game.aimAt(new Vec2(500, 1000));
      expect(game.loadedSpecial).toBeNull();
      game.fire();
    }
    expect(game.loadedSpecial).toBe('wild');
    // The loaded colour is red (0); the rainbow ball turns cyan (1) next to the cyan pair.
    game.aimAt(new Vec2(305, 100));
    game.fire();
    run(game, 1);
    expect(game.chains[0]!.balls.map((ball) => ball.tone)).toEqual([2, 2]);
  });

  it('charge a Nova bomb with exploded balls, which clears all around it', () => {
    const game = new Game(level([0, 0, 1, 2, 1, 2, 1, 2, 1, 2], { nova: 3 }), new FixedRandom(0));
    expect(game.nova).toBe(0);
    game.aimAt(new Vec2(305, 100));
    game.fire();
    run(game, 1);
    expect(game.nova).toBeCloseTo(3 / 18);
    // Fill it up, as eighteen balls would.
    for (let i = 0; i < 5; i++) {
      (game as unknown as { chargeNova(balls: number): void }).chargeNova(3);
    }
    expect(game.loadedSpecial).toBe('bomb');
    game.aimAt(new Vec2(400, 100));
    game.fire();
    run(game, 1);
    expect(game.chains[0]!.balls.length).toBeLessThan(3);
    expect(game.nova).toBe(0);
  });

  it('push the chain back after every explosion with the shockwave', () => {
    const game = new Game(level([0, 0, 1, 2, 1], { shockwave: 2 }), new FixedRandom(0));
    game.aimAt(new Vec2(305, 100));
    game.fire();
    run(game, 1);
    // The shot pushed the rest one slot (to 360), three reds went up, then the
    // chain recoiled 40 units.
    expect(game.chains[0]!.tail).toBeCloseTo(360 - 40);
  });

  it('give a second chance once, when the chain reaches the hole', () => {
    const setup = level(
      [0, 1, 2, 0, 1, 2],
      { secondChance: 1 },
      {
        chain: { ...PARAMS, speed: 400, rushSpeed: 400 },
      },
    );
    const game = new Game(setup, new FixedRandom(0));
    const events: string[] = [];
    game.events.on('secondChance', () => events.push('second chance'));
    run(game, 2);
    expect(events).toEqual(['second chance']);
    run(game, 5);
    expect(game.state).toBe('lost');
    expect(events).toHaveLength(1);
  });
});

describe('the gift bomb of the first level', () => {
  it('makes the very first shot a bomb, once, even without the Nova upgrade', () => {
    const setup = { ...level([0, 1, 2, 0, 1, 2, 0, 1, 2, 0], {}), gift: 'bomb' as const };
    const game = new Game(setup, new FixedRandom(0));
    const bombs: number[] = [];
    game.events.on('bomb', ({ radius }) => bombs.push(radius));
    expect(game.loadedSpecial).toBe('bomb');
    game.aimAt(new Vec2(400, 100));
    expect(game.fire()).toBe(true);
    expect(game.loadedSpecial).toBeNull();
    run(game, 1);
    expect(bombs).toEqual([GIFT_BOMB_RADIUS]);
    expect(game.chains[0]!.balls.length).toBeLessThan(10);
  });

  it('is not given on other levels', () => {
    expect(new Game(level([0, 1, 2], {}), new FixedRandom(0)).loadedSpecial).toBeNull();
  });
});
