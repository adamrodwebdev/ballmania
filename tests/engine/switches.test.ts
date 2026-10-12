import { describe, expect, it } from 'vitest';
import { Game, HOT_MULTIPLIER, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { ForkedRoute } from '@/engine/path/ForkedRoute';
import { POINTS_PER_BALL } from '@/engine/Scoring';
import { FixedRandom, PARAMS } from './helpers';

/**
 * Along y = 100: a line to x = 300, a fork to x = 500 (short: straight; long:
 * a 200-unit detour down to y = 300 and back), then a line to x = 1000.
 */
const route = new ForkedRoute([
  { kind: 'line', points: [new Vec2(0, 100), new Vec2(300, 100)] },
  {
    kind: 'fork',
    short: [new Vec2(300, 100), new Vec2(500, 100)],
    long: [new Vec2(300, 100), new Vec2(300, 300), new Vec2(500, 300), new Vec2(500, 100)],
  },
  { kind: 'line', points: [new Vec2(500, 100), new Vec2(1000, 100)] },
]);

describe('ForkedRoute', () => {
  it('builds a path for each choice, identical before the fork', () => {
    const short = route.build(['short']);
    const long = route.build(['long']);
    expect(short.path.length).toBe(1000);
    expect(long.path.length).toBe(1400);
    expect(short.spans).toEqual([{ start: 300, end: 500, branch: 'short' }]);
    expect(long.spans).toEqual([{ start: 300, end: 900, branch: 'long' }]);
    expect(long.path.pointAt(150)).toEqual(short.path.pointAt(150));
    expect(route.forkCount).toBe(1);
    expect(route.forks).toHaveLength(1);
  });
});

describe('Game with switches', () => {
  const level: LevelSetup = {
    board: { width: 1000, height: 1000 },
    shooter: new Vec2(400, 600),
    chains: [
      {
        path: route.build(['short']).path,
        route,
        recipe: { length: 4, tones: 2, repeatChance: 0.5 },
      },
    ],
    chain: { ...PARAMS, speed: 40, rushSpeed: 40, rushDistance: 0 },
    projectileSpeed: 1500,
    fireCooldown: 0.2,
  };

  it('flips a switch until the chain reaches it, then locks it', () => {
    const game = new Game(level, new FixedRandom(0));
    const flips: string[] = [];
    game.events.on('switched', ({ branch }) => flips.push(branch));
    expect(game.switches()).toMatchObject([{ chain: 0, fork: 0, branch: 'short', locked: false }]);
    expect(game.switches()[0]!.position).toEqual(new Vec2(300, 100));
    expect(game.toggleSwitch(0, 0)).toBe(true);
    expect(game.chains[0]!.path.length).toBe(1400);
    expect(game.toggleSwitch(0, 0)).toBe(true);
    expect(flips).toEqual(['long', 'short']);
    // The head reaches the fork after about 7 s at 40 units per second.
    for (let i = 0; i < 60 * 8; i++) game.update(1 / 60);
    expect(game.switches()[0]!.locked).toBe(true);
    expect(game.toggleSwitch(0, 0)).toBe(false);
    expect(game.summary().switches).toBe(2);
    expect(game.toggleSwitch(0, 5)).toBe(false);
  });

  it('doubles the points of balls blown up on a short branch', () => {
    const game = new Game(
      { ...level, chain: { ...level.chain, speed: 0, rushSpeed: 400, rushDistance: 420 } },
      new FixedRandom(0),
    );
    for (let i = 0; i < 120; i++) game.update(1 / 60);
    const chain = game.chains[0]!;
    // FixedRandom: tones 0 0 1 1; the shooter holds 0; the 0 pair sits on the short branch.
    expect(chain.balls.map((ball) => ball.tone)).toEqual([0, 0, 1, 1]);
    expect(chain.balls[0]!.s).toBeGreaterThan(300);
    let event = { points: 0, hot: false };
    game.events.on('exploded', (e) => (event = e));
    game.aimAt(chain.positionOf(chain.balls[0]!));
    game.fire();
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    expect(event.hot).toBe(true);
    expect(event.points).toBe(3 * POINTS_PER_BALL * HOT_MULTIPLIER);
  });
});
