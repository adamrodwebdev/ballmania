import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/core/Random';
import { Game, STEP, type GameEvents, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { CLEAR_BONUS, POINTS_PER_BALL, Scoring, SPEED_BONUS, STREAK_BONUS } from '@/engine/Scoring';
import { Shooter } from '@/engine/shooter/Shooter';
import { FixedRandom, PARAMS, straightPath } from './helpers';

const level = (length: number, tones = 4): LevelSetup => ({
  board: { width: 1000, height: 500 },
  shooter: new Vec2(500, 400),
  chains: [{ path: straightPath(), recipe: { length, tones, repeatChance: 0.5 } }],
  chain: PARAMS,
  projectileSpeed: 1500,
  fireCooldown: 0.2,
});

/** Runs the game until the predicate holds, in 60 fps frames; fails after `limit` seconds. */
const until = (game: Game, predicate: () => boolean, limit = 60) => {
  for (let t = 0; t < limit; t += 1 / 60) {
    if (predicate()) return;
    game.update(1 / 60);
  }
  throw new Error('Condition never met');
};

const record = (game: Game) => {
  const log: string[] = [];
  const events: (keyof GameEvents)[] = ['fired', 'inserted', 'missed', 'exploded', 'ended'];
  for (const type of events) game.events.on(type, () => log.push(type));
  return log;
};

describe('Scoring', () => {
  it('multiplies by the depth of the chain reaction', () => {
    const scoring = new Scoring();
    expect(scoring.explosion(3, 1, true)).toBe(3 * POINTS_PER_BALL);
    expect(scoring.explosion(4, 2, false)).toBe(4 * POINTS_PER_BALL * 2);
    expect(scoring.bestDepth).toBe(2);
  });

  it('rewards streaks of successful shots and breaks them on a miss', () => {
    const scoring = new Scoring();
    scoring.explosion(3, 1, true);
    scoring.explosion(3, 1, true);
    expect(scoring.explosion(3, 1, true)).toBe(3 * POINTS_PER_BALL + STREAK_BONUS);
    expect(scoring.streak).toBe(3);
    scoring.miss();
    expect(scoring.streak).toBe(0);
    expect(Scoring.levelBonus(50, 80)).toBe(CLEAR_BONUS + 30 * SPEED_BONUS);
    expect(Scoring.levelBonus(90, 80)).toBe(CLEAR_BONUS);
    expect([
      Scoring.secondsAhead(50, 80),
      Scoring.secondsAhead(90, 80),
      Scoring.secondsAhead(5),
    ]).toEqual([30, 0, 0]);
    scoring.bonus(100);
    expect(scoring.score).toBe(3 * 3 * POINTS_PER_BALL + STREAK_BONUS + 100);
  });
});

describe('Shooter', () => {
  const shooter = () => new Shooter(new Vec2(0, 0), new FixedRandom(0.99), 100, 0.5, [0, 3]);

  it('fires the loaded ball towards the aim, then reloads', () => {
    const s = shooter();
    s.aimAt(new Vec2(0, 10));
    const projectile = s.fire([0, 3]);
    expect(projectile?.tone).toBe(3);
    expect(projectile?.velocity.y).toBeCloseTo(100);
    expect(s.fire([0, 3])).toBeNull();
    s.tick(0.5);
    expect(s.fire([0, 3])?.id).toBe(2);
  });

  it('swaps the loaded and next balls', () => {
    const s = new Shooter(new Vec2(0, 0), new FixedRandom(0), 100, 0, [1, 2]);
    s.refresh([2]);
    expect([s.current, s.next]).toEqual([2, 2]);
    const other = shooter();
    other.refresh([0]);
    other.swap();
    expect(other.current).toBe(0);
  });

  it('needs at least one colour', () => {
    expect(() => new Shooter(new Vec2(0, 0), new FixedRandom(), 1, 0, [])).toThrow();
  });
});

describe('Game', () => {
  it('is lost when the chain reaches the hole', () => {
    const game = new Game(level(10), SeededRandom.fromString('lost'));
    const log = record(game);
    until(game, () => game.state !== 'playing', 40);
    expect(game.state).toBe('lost');
    expect(log).toEqual(['ended']);
    game.update(1);
    expect(game.fire()).toBe(false);
  });

  it('reports the balls still in the chain when it is lost (v1.8.1)', () => {
    const game = new Game(level(10), SeededRandom.fromString('lost'));
    until(game, () => game.state !== 'playing', 40);
    const left = game.chains.reduce((sum, chain) => sum + chain.balls.length, 0);
    expect(left).toBeGreaterThan(0);
    expect(game.summary().ballsLeft).toBe(left);
    expect(game.summary().colossus).toBeNull();
  });

  it('is won when the last balls explode', () => {
    // Fixed randomness: a chain of two balls of tone 0, and a shooter loaded with tone 0.
    const game = new Game(level(2, 2), new FixedRandom(0));
    expect(game.chains[0]!.balls.map((ball) => ball.tone)).toEqual([0, 0]);
    const log = record(game);
    const chain = game.chains[0]!;
    until(game, () => chain.balls[1]!.s >= 500);
    game.aimAt(chain.path.pointAt(chain.balls[1]!.s + 10));
    expect(game.fire()).toBe(true);
    until(game, () => game.state !== 'playing', 5);
    expect(game.state).toBe('won');
    expect(log).toEqual(['fired', 'inserted', 'exploded', 'ended']);
    expect(game.score).toBe(3 * POINTS_PER_BALL + CLEAR_BONUS);
  });

  it('pays each second saved under the reference time, and says how many', () => {
    const game = new Game({ ...level(2, 2), parTime: 60 }, new FixedRandom(0));
    let ended: { readonly timeBonus: number; readonly ahead: number } | null = null;
    game.events.on('ended', (event) => (ended = event));
    const chain = game.chains[0]!;
    until(game, () => chain.balls[1]!.s >= 500);
    game.aimAt(chain.path.pointAt(chain.balls[1]!.s + 10));
    game.fire();
    until(game, () => game.state !== 'playing', 5);
    const saved = 60 - game.elapsed;
    expect(ended).toEqual({
      outcome: 'won',
      score: game.score,
      bonus: CLEAR_BONUS + Math.round(saved * SPEED_BONUS),
      timeBonus: Math.round(saved * SPEED_BONUS),
      ahead: Math.floor(saved),
    });
  });

  it('counts a shot out of the board as a miss', () => {
    const game = new Game(level(20), SeededRandom.fromString('miss'));
    const log = record(game);
    game.aimAt(new Vec2(500, 1000));
    game.fire();
    until(game, () => game.projectiles.length === 0, 2);
    expect(log).toEqual(['fired', 'missed']);
  });

  it('replays identically from the same seed and the same commands', () => {
    const play = () => {
      const game = new Game(level(30), SeededRandom.fromString('replay'));
      const log: string[] = [];
      game.events.on('exploded', (e) => log.push(`${e.depth}:${e.balls.length}`));
      for (let frame = 0; frame < 60 * 20; frame++) {
        if (frame % 30 === 0) {
          const head = game.chains[0]!.balls.at(-1);
          if (head) game.aimAt(game.chains[0]!.path.pointAt(head.s));
          game.fire();
        }
        game.update(1 / 60);
      }
      return { log, score: game.score, state: game.state, tones: game.chains[0]!.balls.length };
    };
    expect(play()).toEqual(play());
  });

  it('simulates in fixed steps whatever the frame rate', () => {
    const a = new Game(level(10), SeededRandom.fromString('steps'));
    const b = new Game(level(10), SeededRandom.fromString('steps'));
    for (let i = 0; i < 120; i++) a.update(1 / 120);
    for (let i = 0; i < 30; i++) b.update(1 / 30);
    expect(a.elapsed).toBeCloseTo(1);
    expect(b.elapsed).toBeCloseTo(1);
    expect(a.chains[0]!.balls.map((ball) => ball.s)).toEqual(
      b.chains[0]!.balls.map((ball) => ball.s),
    );
    expect(STEP).toBeCloseTo(1 / 120);
  });
});

describe('Game invariants', () => {
  it.each(['alpha', 'beta', 'gamma', 'delta'])(
    'keeps every chain sorted, without overlap, under random play (%s)',
    (seed) => {
      const random = SeededRandom.fromString(`aim:${seed}`);
      const game = new Game(level(80, 4), SeededRandom.fromString(seed));
      const seen = new Set<number>();
      let explosions = 0;
      game.events.on('exploded', (event) => {
        explosions++;
        for (const ball of event.balls) {
          expect(seen.has(ball.id)).toBe(false);
          seen.add(ball.id);
        }
      });
      for (let frame = 0; frame < 60 * 60 && game.state === 'playing'; frame++) {
        if (frame % 10 === 0) {
          const chain = game.chains[0]!;
          const visible = chain.balls.filter((ball) => ball.s >= 0);
          const target = visible[random.nextInt(visible.length)];
          if (target) game.aimAt(chain.positionOf(target));
          game.fire();
        }
        game.update(1 / 60);
        const balls = game.chains[0]!.balls;
        for (let i = 1; i < balls.length; i++) {
          expect(balls[i]!.s - balls[i - 1]!.s).toBeGreaterThanOrEqual(
            PARAMS.ballRadius * 2 - 1e-6,
          );
        }
      }
      expect(explosions).toBeGreaterThan(0);
    },
  );
});
