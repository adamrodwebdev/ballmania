import { describe, expect, it } from 'vitest';
import { Ball } from '@/engine/chain/Ball';
import { Chain } from '@/engine/chain/Chain';
import { SeededRandom } from '@/engine/core/Random';
import { Game, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { TUG_SPEED } from '@/engine/objectives/DuelObjective';
import { Path } from '@/engine/path/Path';
import { Groove, MAX_GROOVE, Tempo } from '@/engine/rhythm/Tempo';
import { POINTS_PER_BALL } from '@/engine/Scoring';
import { D, describe as layout, FixedRandom, PARAMS, straightPath } from './helpers';

const balls = (tones: readonly number[], from = 1) =>
  tones.map((tone, i) => new Ball(from + i, tone, 0));

/** Runs the game for `seconds`, in 60 fps frames. */
const run = (game: Game, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) game.update(1 / 60);
};

describe('Chain, arcade helpers', () => {
  it('can start on the track, grow at the head and slide both ways', () => {
    const chain = Chain.placed(straightPath(), balls([0, 1, 2]), PARAMS, 200);
    expect(chain.balls.map((ball) => ball.s)).toEqual([200, 200 + D, 200 + 2 * D]);
    expect(chain.tail).toBe(200);
    chain.append(balls([3, 4], 10));
    expect(chain.balls.at(-1)!.s).toBe(200 + 4 * D);
    chain.shift(-50);
    expect(chain.tail).toBe(150);
  });

  it('closes every gap of a compact chain, both sides meeting halfway', () => {
    const params = { ...PARAMS, speed: 0, compact: true };
    const chain = new Chain(
      straightPath(),
      [new Ball(1, 0, 100), new Ball(2, 1, 120), new Ball(3, 2, 200), new Ball(4, 3, 220)],
      params,
    );
    for (let i = 0; i < 120; i++) chain.advance(1 / 60);
    expect(layout(chain)).toBe('abcd');
    // The gap of 60 closed by 30 on each side.
    expect(chain.tail).toBeCloseTo(130);
    expect(chain.balls.at(-1)!.s).toBeCloseTo(190);
  });
});

describe('Puzzle mode', () => {
  /** A still chain: two reds, two greens, two reds; the player picks colours. */
  const puzzle = (shots: number): LevelSetup => ({
    board: { width: 1000, height: 1000 },
    shooter: new Vec2(500, 500),
    chains: [
      {
        path: straightPath(),
        recipe: { length: 6, tones: 2, repeatChance: 0 },
        tones: [0, 0, 1, 1, 0, 0],
        tail: 300,
      },
    ],
    chain: { ...PARAMS, speed: 0, rushSpeed: 0 },
    projectileSpeed: 1500,
    fireCooldown: 0.1,
    puzzle: { shots },
  });

  /** Aims at the ball at `index` of the chain, slightly ahead of it. */
  const aimAt = (game: Game, index: number) => {
    const chain = game.chains[0]!;
    game.aimAt(chain.path.pointAt(chain.balls[index]!.s + 4));
  };

  it('lets the player pick the colour, which stays loaded after a shot', () => {
    const game = new Game(puzzle(2), new FixedRandom(0));
    expect([game.shooter.current, game.shooter.next]).toEqual([0, 1]);
    game.swap();
    expect([game.shooter.current, game.shooter.next]).toEqual([1, 0]);
    game.swap();
    expect(game.shooter.current).toBe(0);
    expect(game.shotsLeft).toBe(2);
  });

  it('is solved in one shot by a chain reaction', () => {
    const game = new Game(puzzle(1), new FixedRandom(0));
    game.swap();
    aimAt(game, 2);
    expect(game.fire()).toBe(true);
    expect(game.shotsLeft).toBe(0);
    expect(game.fire()).toBe(false);
    run(game, 1.5);
    expect(game.state).toBe('won');
    expect(game.summary().shots).toBe(1);
  });

  it('is lost once the last shot has landed and balls are left', () => {
    const game = new Game(puzzle(1), new FixedRandom(0));
    aimAt(game, 0);
    game.fire();
    run(game, 1.5);
    expect(game.state).toBe('lost');
  });
});

describe('Endless mode', () => {
  const endless: LevelSetup = {
    board: { width: 1000, height: 1000 },
    shooter: new Vec2(500, 800),
    chains: [{ path: straightPath(), recipe: { length: 10, tones: 3, repeatChance: 0.3 } }],
    chain: { ...PARAMS, speed: 60, rushSpeed: 60 },
    projectileSpeed: 1500,
    fireCooldown: 0.2,
    endless: {
      feed: 6,
      stages: [
        { at: 0, speed: 1, tones: 3 },
        { at: 5, speed: 1.5, tones: 4 },
      ],
    },
  };

  it('never runs out of balls and speeds up by stages', () => {
    const game = new Game(endless, SeededRandom.fromString('endless'));
    const stages: number[] = [];
    game.events.on('stage', ({ stage }) => stages.push(stage));
    expect(game.stage).toBe(0);
    run(game, 6);
    expect(stages).toEqual([1]);
    expect(game.stage).toBe(1);
    expect(game.chains[0]!.balls.length).toBeGreaterThan(10);
    // Balls keep waiting in the tunnel.
    expect(game.chains[0]!.tail!).toBeLessThan(0);
    expect(game.state).toBe('playing');
    expect(game.summary().stage).toBe(1);
  });
});

describe('Rhythm mode', () => {
  it('pulses the chain on the beat, at its nominal speed on average', () => {
    const tempo = new Tempo({ bpm: 120, window: 0.15 });
    expect(tempo.beat).toBe(0.5);
    const samples = Array.from({ length: 1000 }, (_, i) => tempo.pulse((i / 1000) * 0.5));
    expect(samples.reduce((sum, value) => sum + value, 0) / samples.length).toBeCloseTo(1, 2);
    expect(tempo.pulse(0)).toBeGreaterThan(tempo.pulse(0.4));
    expect(tempo.onBeat(1.03)).toBe(true);
    expect(tempo.onBeat(0.97)).toBe(true);
    expect(tempo.onBeat(1.25)).toBe(false);
  });

  it('raises the groove every two shots on the beat, up to ×4', () => {
    const groove = new Groove();
    const multipliers: number[] = [];
    for (let i = 0; i < 8; i++) {
      groove.shot(true);
      multipliers.push(groove.multiplier);
    }
    expect(multipliers).toEqual([1, 2, 2, 3, 3, 4, 4, 4]);
    expect(MAX_GROOVE).toBe(4);
    groove.shot(false);
    expect(groove.multiplier).toBe(1);
  });

  it('announces beats, judges shots and multiplies points by the groove', () => {
    const game = new Game(
      {
        board: { width: 1000, height: 1000 },
        shooter: new Vec2(500, 500),
        chains: [
          {
            path: straightPath(),
            recipe: { length: 4, tones: 2, repeatChance: 0 },
            tones: [0, 0, 1, 1],
            tail: 300,
          },
        ],
        chain: { ...PARAMS, speed: 0, rushSpeed: 0 },
        projectileSpeed: 1500,
        fireCooldown: 0,
        rhythm: { bpm: 120, window: 0.15 },
      },
      new FixedRandom(0),
    );
    const beats: number[] = [];
    const judged: boolean[] = [];
    const points: number[] = [];
    game.events.on('beat', ({ index }) => beats.push(index));
    game.events.on('groove', ({ onBeat }) => judged.push(onBeat));
    game.events.on('exploded', (event) => points.push(event.points));
    run(game, 1.01);
    expect(beats).toEqual([1, 2]);
    // Two shots on the beat raise the groove to ×2 before the explosion lands.
    const chain = game.chains[0]!;
    game.aimAt(chain.path.pointAt(chain.balls[0]!.s));
    game.fire();
    game.fire();
    expect(judged).toEqual([true, true]);
    expect(game.grooveMultiplier).toBe(2);
    run(game, 0.5);
    expect(points[0]).toBe(3 * POINTS_PER_BALL * 2);
  });
});

describe('Duel mode', () => {
  const path = Path.fromPoints([new Vec2(0, 300), new Vec2(1000, 300)]);
  const duel = (cadence: number): LevelSetup => ({
    board: { width: 1000, height: 1000 },
    shooter: new Vec2(500, 900),
    chains: [
      {
        path,
        recipe: { length: 20, tones: 3, repeatChance: 0.3 },
        tail: 300,
      },
    ],
    chain: { ...PARAMS, speed: 0, rushSpeed: 0, compact: true },
    projectileSpeed: 1500,
    fireCooldown: 0.2,
    duel: {
      push: 10,
      minimum: 8,
      regrow: 4,
      growEvery: 1000,
      rival: { position: new Vec2(500, 80), cadence, error: 0, focus: 1 },
    },
  });

  it('gives the rival its own shooter, shots and score', () => {
    const game = new Game(duel(0.5), SeededRandom.fromString('duel'));
    const shooters: string[] = [];
    game.events.on('fired', ({ projectile }) => shooters.push(projectile.by));
    run(game, 6);
    expect(game.rival).not.toBeNull();
    expect(shooters.filter((by) => by === 'rival').length).toBeGreaterThan(4);
    expect(game.rivalScore).toBeGreaterThan(0);
    expect(game.score).toBe(0);
  });

  it("pushes the chain towards the rival's hole when the player explodes balls", () => {
    const game = new Game(
      { ...duel(1000), chains: [{ ...duel(0).chains[0]!, tones: [0, 0, 1, 1, 0, 1, 2, 2, 1, 0] }] },
      new FixedRandom(0),
    );
    const chain = game.chains[0]!;
    const before = chain.tail!;
    game.aimAt(chain.path.pointAt(chain.balls[0]!.s));
    game.fire();
    run(game, (3 * 10) / TUG_SPEED + 0.5);
    // The shot made room half on each side, three balls exploded at the tail, then
    // their explosion pulled the chain 30 units towards the rival's hole.
    expect(chain.tail).toBeCloseTo(before + 3 * D - D / 2 - 30);
    expect(game.state).toBe('playing');
    chain.shift(-chain.tail!);
    run(game, 0.05);
    expect(game.state).toBe('won');
  });
});
