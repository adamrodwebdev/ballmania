import { describe, expect, it } from 'vitest';
import { Game, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import {
  LASER_PIERCE,
  placeInBatch,
  placePowers,
  REWIND_BALLS,
  SLOW_SECONDS,
  type PowerKind,
} from '@/engine/powers/Powers';
import { D, FixedRandom, PARAMS, straightPath } from './helpers';

const run = (game: Game, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) game.update(1 / 60);
};

/**
 * A chain along y = 100 from x = 300, tail first; its only pair (red, 0)
 * holds the power, at index 5; the shooter fires red.
 */
const TONES = [0, 1, 2, 1, 0, 0, 2, 1, 2, 1];

const level = (kind: PowerKind, extra: Partial<LevelSetup> = {}): LevelSetup => ({
  board: { width: 1000, height: 1000 },
  shooter: new Vec2(500, 700),
  chains: [
    {
      path: straightPath(),
      recipe: { length: TONES.length, tones: 3, repeatChance: 0 },
      tones: TONES,
      tail: 300,
    },
  ],
  chain: { ...PARAMS, speed: 0, rushSpeed: 0 },
  projectileSpeed: 1500,
  fireCooldown: 0,
  powers: { kinds: [kind], every: 99 },
  ...extra,
});

/** Sets a power off as its ball exploding would. */
const setOff = (game: Game, kind: PowerKind) =>
  (game as unknown as { setOff(kind: PowerKind, at: Vec2, tone: number): void }).setOff(
    kind,
    new Vec2(0, 0),
    0,
  );

describe('placePowers', () => {
  it('gives each power ball a neighbour of its colour, away from the ends', () => {
    const tones = [0, 1, 2, 2, 0, 1, 1, 2, 0, 0, 1, 2, 2, 1, 0, 2, 2, 1, 0, 1];
    const placed = placePowers(tones, { kinds: ['rewind', 'slow'], every: 8 });
    const at = placed.flatMap((power, i) => (power ? [i] : []));
    expect(at).toHaveLength(2);
    for (const i of at) {
      expect(tones[i - 1] === tones[i] || tones[i + 1] === tones[i]).toBe(true);
      expect(i).toBeGreaterThanOrEqual(3);
      expect(i).toBeLessThan(tones.length - 3);
    }
    expect(placePowers(tones, { kinds: ['rewind', 'slow'], every: 8 })).toEqual(placed);
  });

  it('puts the power a level teaches first, towards the head, which enters first', () => {
    const tones = [0, 1, 1, 2, 0, 0, 1, 2, 2, 0, 1, 1, 2, 0, 0, 2];
    const placed = placePowers(tones, { kinds: ['rewind', 'laser'], every: 6, first: 'laser' });
    const at = placed.flatMap((power, i) => (power ? [i] : []));
    expect(placed[Math.max(...at)]).toBe('laser');
    expect(placePowers(tones, { kinds: ['rewind'], every: 99 }).filter(Boolean)).toHaveLength(1);
  });

  it('puts the first power behind as many balls as the level asks, from the head', () => {
    const tones = [0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 2, 2, 0, 0, 1, 1];
    // Head first, the ball after the first eight: index 15 - 8 = 7, in a pair.
    const placed = placePowers(tones, { kinds: ['laser'], every: 99, lead: 8 });
    expect(placed.indexOf('laser')).toBe(7);
    // Without a lead, a fifth of the chain from the head, as before.
    expect(placePowers(tones, { kinds: ['laser'], every: 99 }).indexOf('laser')).toBe(12);
  });

  it('places one power in a batch fed to a running chain', () => {
    // The pairs are at 1-2 and 4-5: ball 4 is the closest to the middle.
    expect(placeInBatch([0, 1, 1, 2, 0, 0, 2, 1], 'slow')).toEqual([
      null,
      null,
      null,
      null,
      'slow',
      null,
      null,
      null,
    ]);
    expect(placeInBatch([0, 1, 2], 'slow').filter(Boolean)).toHaveLength(0);
  });
});

describe('powers', () => {
  it('sets off a power when its ball explodes: Rewind pulls the chain back', () => {
    const game = new Game(level('rewind'), new FixedRandom(0));
    expect(game.chains[0]!.balls[5]!.power).toBe('rewind');
    const powers: PowerKind[] = [];
    game.events.on('power', ({ kind }) => powers.push(kind));
    game.aimAt(new Vec2(385, 100));
    game.fire();
    // The shot flies for about 0.4 s; the rewind starts with the explosion.
    run(game, 0.45);
    expect(powers).toEqual(['rewind']);
    expect(game.rewinding).toBe(true);
    run(game, 1);
    expect(game.rewinding).toBe(false);
    expect(game.chains[0]!.tail).toBeCloseTo(300 - REWIND_BALLS * D, 0);
  });

  it('Stasis halves the speed of the chain for a while', () => {
    const moving = { chain: { ...PARAMS, speed: 50, rushSpeed: 50 } };
    const game = new Game(level('slow', moving), new FixedRandom(0));
    setOff(game, 'slow');
    expect(game.slowRemaining).toBe(SLOW_SECONDS);
    const before = game.chains[0]!.tail!;
    run(game, 1);
    expect(game.chains[0]!.tail! - before).toBeCloseTo(25, 0);
    run(game, SLOW_SECONDS);
    expect(game.slowRemaining).toBe(0);
    const after = game.chains[0]!.tail!;
    run(game, 1);
    expect(game.chains[0]!.tail! - after).toBeCloseTo(50, 0);
  });

  it('Rainbow shot loads a ball of every colour, once', () => {
    const game = new Game(level('rainbow'), new FixedRandom(0));
    setOff(game, 'rainbow');
    expect(game.loadedSpecial).toBe('wild');
    expect(game.powerShot).toBe('wild');
    game.aimAt(new Vec2(500, 1000));
    game.fire();
    expect(game.powerShot).toBeNull();
    expect(game.loadedSpecial).toBeNull();
  });

  it('Laser pierces the first balls it touches, then fades', () => {
    // The shooter stands on the track's line, past the head: the beam runs along the chain.
    const game = new Game(level('laser', { shooter: new Vec2(900, 100) }), new FixedRandom(0));
    setOff(game, 'laser');
    game.aimAt(new Vec2(0, 100));
    const path = game.laserPath()!;
    expect(path.targets).toHaveLength(LASER_PIERCE);
    expect(path.targets[0]!.x).toBeCloseTo(300 + 9 * D);
    const exploded: number[] = [];
    game.events.on('exploded', ({ balls }) => exploded.push(balls.length));
    game.fire();
    run(game, 1);
    expect(exploded.slice(0, LASER_PIERCE)).toEqual([1, 1, 1, 1]);
    expect(game.chains[0]!.balls.length).toBeLessThanOrEqual(TONES.length - LASER_PIERCE);
    expect(game.laserPath()).toBeNull();
  });
});
