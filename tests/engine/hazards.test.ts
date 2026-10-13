import { describe, expect, it } from 'vitest';
import { Ball } from '@/engine/chain/Ball';
import { Chain } from '@/engine/chain/Chain';
import { SeededRandom } from '@/engine/core/Random';
import { Game, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Arrhythmia, Weather, type WeatherKind } from '@/engine/hazards/Hazards';
import { findLevel } from '@/levels/campaign';
import { resolveLevel } from '@/levels/resolveLevel';
import { FRAMES } from '@/levels/tracks';
import { describe as layout, FixedRandom, PARAMS, straightPath } from './helpers';

const run = (game: Game, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) game.update(1 / 60);
};

/** A still chain along y = 100 from x = 300, the shooter below, with one kind of weather. */
const level = (tones: readonly number[], weather?: WeatherKind): LevelSetup => ({
  board: { width: 1000, height: 1000 },
  shooter: new Vec2(500, 700),
  chains: [
    { path: straightPath(), recipe: { length: 4, tones: 3, repeatChance: 0 }, tones, tail: 300 },
  ],
  chain: { ...PARAMS, speed: 0, rushSpeed: 0 },
  projectileSpeed: 1000,
  fireCooldown: 0,
  ...(weather
    ? { hazards: { weather: { kinds: [weather], every: 0.5, duration: 3, strength: 1 } } }
    : {}),
});

/** Waits for the weather to start. */
const untilWeather = (game: Game) => {
  for (let i = 0; i < 120 && !game.weather; i++) game.update(1 / 60);
  expect(game.weather).not.toBeNull();
};

describe('hazards', () => {
  it('make the arrhythmia swing the pace both ways', () => {
    const arrhythmia = new Arrhythmia({ amplitude: 0.3, period: 9 });
    const paces = Array.from({ length: 200 }, (_, i) => arrhythmia.pace(i * 0.1));
    expect(Math.max(...paces)).toBeGreaterThan(1.2);
    expect(Math.min(...paces)).toBeLessThan(0.8);
    expect(Math.min(...paces)).toBeGreaterThanOrEqual(0.2);
  });

  it('alternate calm and weather, taking each kind in turn', () => {
    const weather = new Weather(
      { kinds: ['solar', 'wind'], every: 2, duration: 1, strength: 1 },
      new FixedRandom(0.5),
    );
    const kinds: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const { started } = weather.update(0.01);
      if (started) kinds.push(started.kind);
    }
    expect(kinds).toEqual(['solar', 'wind', 'solar']);
  });

  it('make balls immune in a solar storm, then burst the groups made', () => {
    const game = new Game(level([0, 0, 1, 2], 'solar'), new FixedRandom(0));
    const causes: string[] = [];
    game.events.on('exploded', ({ cause }) => causes.push(cause));
    untilWeather(game);
    game.aimAt(new Vec2(305, 100));
    game.fire();
    run(game, 1);
    expect(game.chains[0]!.balls).toHaveLength(5);
    expect(causes).toEqual([]);
    run(game, 3);
    expect(causes).toEqual(['reaction']);
    expect(layout(game.chains[0]!)).toBe('bc');
  });

  it('slow shots in the cold, and shatter frozen balls with a chain reaction', () => {
    const game = new Game(level([1, 0, 0, 1, 1, 2, 2, 1, 2, 1, 2], 'cold'), new FixedRandom(0));
    untilWeather(game);
    game.chains[0]!.freeze([game.chains[0]!.balls[9]!]);
    expect(game.shooter.current).toBe(0);
    game.aimAt(new Vec2(325, 100));
    game.fire();
    const shot = game.projectiles[0]!;
    const from = shot.position;
    game.update(0.1);
    expect(shot.position.distanceTo(from)).toBeCloseTo(65, 0);
    const depths: number[] = [];
    game.events.on('exploded', ({ depth }) => depths.push(depth));
    run(game, 1.5);
    // The pair of ones closes on the lone one: a reaction of depth 2, which shatters
    // the frozen ball too.
    expect(depths).toEqual([1, 2, 3]);
    expect(game.chains[0]!.balls.some((ball) => ball.frozen)).toBe(false);
  });

  it('make the wind bend shots, but not a charged shot', () => {
    const game = new Game(level([0, 1, 2, 0], 'wind'), new FixedRandom(0));
    untilWeather(game);
    const direction = game.weather!.direction;
    game.aimAt(new Vec2(500, 100));
    const drift = game.aimLine().points.at(-1)!.x - 500;
    expect(Math.sign(drift)).toBe(direction);
    expect(Math.abs(game.aimLine(2, true).points.at(-1)!.x - 500)).toBeLessThan(1);
  });

  it('drop balls from the sky that never make a group', () => {
    const setup: LevelSetup = {
      ...level([0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 2, 2]),
      hazards: { meteors: 1 },
    };
    const game = new Game(setup, SeededRandom.fromString('meteors'));
    const events: string[] = [];
    game.events.on('meteorWarning', () => events.push('warning'));
    game.events.on('meteor', () => events.push('meteor'));
    game.events.on('exploded', () => events.push('exploded'));
    run(game, 5);
    expect(events.filter((event) => event === 'meteor').length).toBeGreaterThanOrEqual(2);
    expect(events).not.toContain('exploded');
    expect(events[0]).toBe('warning');
    expect(game.chains[0]!.balls.length).toBeGreaterThan(24);
  });

  it('swap neighbouring balls in a massive gust without making a group', () => {
    let id = 1;
    const balls = [0, 0, 1, 0, 2].map((tone, i) => new Ball(id++, tone, 100 + i * 20));
    const chain = new Chain(straightPath(), balls, PARAMS);
    expect(chain.swapTones(2)).toBe(false);
    expect(chain.swapTones(3)).toBe(true);
    expect(layout(chain)).toBe('aabca');
  });

  it('scale everything with the difficulty', () => {
    const volcano = findLevel('volcano-03')!;
    const explorer = resolveLevel(volcano, FRAMES.square, 'explorer');
    const legend = resolveLevel(volcano, FRAMES.square, 'legend');
    expect(legend.speed).toBeGreaterThan(explorer.speed);
    expect(legend.hazards!.weather!.every).toBeLessThan(explorer.hazards!.weather!.every);
    expect(legend.hazards!.weather!.strength).toBeGreaterThan(1);
    expect(legend.scoreFactor).toBeGreaterThan(explorer.scoreFactor!);
  });
});
