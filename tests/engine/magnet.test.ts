import { describe, expect, it } from 'vitest';
import { Game, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Shooter } from '@/engine/shooter/Shooter';
import { chainOf, describe as layout, FixedRandom, PARAMS, straightPath } from './helpers';

describe('Shooter with a pulled ball', () => {
  const shooter = () => new Shooter(new Vec2(0, 0), new FixedRandom(0), 100, 0.2, [0, 1]);

  it('loads the ball, keeps the previous one next, and waits before firing', () => {
    const s = shooter();
    s.load(4);
    expect([s.current, s.next]).toEqual([4, 0]);
    expect(s.ready).toBe(false);
  });

  it('keeps the pulled colour even when it left the track, wherever it is', () => {
    const s = shooter();
    s.load(4);
    s.refresh([0, 1]);
    expect(s.current).toBe(4);
    s.swap();
    s.refresh([0, 1]);
    expect(s.next).toBe(4);
    s.tick(1);
    s.fire([0, 1]);
    s.refresh([0, 1]);
    expect(s.current).toBe(4);
    s.tick(1);
    s.fire([0, 1]);
    s.refresh([0, 1]);
    expect([s.current, s.next]).not.toContain(4);
  });
});

describe('Chain.extract', () => {
  it('takes a ball out; equal colours on both sides then pull together and explode', () => {
    const chain = chainOf('aabaa');
    expect(chain.extract(2).tone).toBe(1);
    expect(layout(chain)).toBe('aa|aa');
    const explosions = [];
    for (let i = 0; i < 60; i++) explosions.push(...chain.advance(1 / 60));
    expect(explosions).toHaveLength(1);
    expect(explosions[0]!.balls).toHaveLength(4);
    expect(chain.isEmpty).toBe(true);
  });
});

describe('Game with a magnet', () => {
  const level = (magnet = true): LevelSetup => ({
    board: { width: 1000, height: 1000 },
    shooter: new Vec2(500, 400),
    chains: [{ path: straightPath(), recipe: { length: 8, tones: 2, repeatChance: 0.5 } }],
    chain: { ...PARAMS, speed: 0, rushSpeed: 600, rushDistance: 500 },
    projectileSpeed: 1500,
    fireCooldown: 0.2,
    ...(magnet ? { magnet: { charges: 1, max: 2, rechargeEvery: 2 } } : {}),
  });

  const settle = (game: Game) => {
    for (let i = 0; i < 120; i++) game.update(1 / 60);
  };

  it('has no magnet on ordinary levels', () => {
    const game = new Game(level(false), new FixedRandom(0));
    settle(game);
    expect(game.magnet).toBeNull();
    expect(game.pull()).toBe(false);
  });

  it('pulls the aimed ball into the shooter and spends a charge', () => {
    const game = new Game(level(), new FixedRandom(0));
    settle(game);
    const chain = game.chains[0]!;
    const before = chain.balls.length;
    const target = chain.balls[3]!;
    game.aimAt(chain.positionOf(target));
    const pulled: number[] = [];
    game.events.on('pulled', ({ ball }) => pulled.push(ball.id));
    expect(game.pull()).toBe(true);
    expect(pulled).toEqual([target.id]);
    expect(chain.balls).toHaveLength(before - 1);
    expect(game.shooter.current).toBe(target.tone);
    expect(game.magnet).toEqual({ charges: 0, max: 2 });
    for (let i = 0; i < 30; i++) game.update(1 / 60);
    expect(game.pull()).toBe(false);
    expect(game.summary().pulls).toBe(1);
  });

  it('gets a charge back every few explosions, up to its maximum', () => {
    const game = new Game(level(), new FixedRandom(0));
    settle(game);
    const chain = game.chains[0]!;
    // The fixed draw makes pairs: 0 0 1 1 0 0 1 1; the shooter holds 0s.
    expect(chain.balls.map((ball) => ball.tone)).toEqual([0, 0, 1, 1, 0, 0, 1, 1]);
    const charged: number[] = [];
    game.events.on('magnetCharged', ({ charges }) => charged.push(charges));
    for (let shot = 0; shot < 2; shot++) {
      const pair = chain.balls.findIndex(
        (ball, i) => ball.tone === game.shooter.current && chain.balls[i + 1]?.tone === ball.tone,
      );
      expect(pair).toBeGreaterThanOrEqual(0);
      game.aimAt(chain.positionOf(chain.balls[pair]!));
      game.fire();
      for (let i = 0; i < 60; i++) game.update(1 / 60);
    }
    expect(charged).toEqual([2]);
    expect(game.magnet).toEqual({ charges: 2, max: 2 });
  });
});
