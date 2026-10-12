import { describe, expect, it } from 'vitest';
import { Ball } from '@/engine/chain/Ball';
import { SeededRandom } from '@/engine/core/Random';
import { Game, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { ColossusObjective } from '@/engine/objectives/ColossusObjective';
import type { ObjectiveContext } from '@/engine/objectives/Objective';
import { chainOf, D, describe as layout, PARAMS, straightPath } from './helpers';

describe('Chain pushed from behind', () => {
  it('is pushed by the pusher, not by its tail', () => {
    const chain = chainOf('ab__cd');
    chain.attachPusher(30);
    expect(chain.pusherArc).toBe(100 - 10 - 30);
    chain.advance(0.1);
    expect(chain.pusherArc).toBeCloseTo(65);
    expect(chain.balls[0]!.s).toBeCloseTo(105);
  });

  it('leaves a detached tail where it is until the pusher catches up', () => {
    const chain = chainOf('ab');
    chain.attachPusher(30);
    (chain.balls[0] as Ball).s = 300;
    (chain.balls[1] as Ball).s = 320;
    chain.advance(0.1);
    expect(chain.balls[0]!.s).toBe(300);
  });

  it('grows new balls in front of the pusher, pushing the rest', () => {
    const chain = chainOf('ab');
    chain.attachPusher(30);
    chain.feed([new Ball(10, 2, 0), new Ball(11, 3, 0)]);
    expect(layout(chain)).toBe('cdab');
    expect(chain.balls[0]!.s).toBe(100);
    expect(chain.balls[2]!.s).toBe(100 + 2 * D);
  });

  it('feeds behind the tail without a pusher', () => {
    const chain = chainOf('ab');
    chain.feed([new Ball(10, 2, 0)]);
    expect(layout(chain)).toBe('cab');
  });

  it('loses when the pusher itself reaches the hole', () => {
    const chain = chainOf('');
    chain.attachPusher(30);
    for (let i = 0; i < 400; i++) chain.advance(0.1);
    expect(chain.reachedHole).toBe(true);
  });

  it('clears every ball for the final cascade', () => {
    const chain = chainOf('abc');
    chain.attachPusher(30);
    expect(chain.clear()).toHaveLength(3);
    expect(chain.isEmpty).toBe(true);
    expect(chain.pusherArc).toBeNull();
  });
});

describe('ColossusObjective', () => {
  const setup = {
    chain: 0,
    hp: 30,
    radius: 30,
    reach: 3 * D,
    phases: [1, 1.5, 2],
    spit: 4,
  };

  const context = (layoutText: string) => {
    const chain = chainOf(layoutText);
    let id = 100;
    const events: string[] = [];
    const ctx: ObjectiveContext = {
      chains: [chain],
      elapsed: 0,
      shotsLeft: null,
      inFlight: 0,
      createBalls: (count) => Array.from({ length: count }, () => new Ball(id++, 5, 0)),
      stageReached: () => undefined,
      colossusHit: ({ damage, hp }) => events.push(`hit ${damage} → ${hp}`),
      colossusPhase: ({ phase }) => events.push(`phase ${phase}`),
    };
    return { chain, ctx, events };
  };

  it('is hurt by explosions close to its body only', () => {
    const { chain, ctx, events } = context('abbbcaaaaaaaaaaddd');
    const objective = new ColossusObjective(setup);
    objective.start(ctx);
    const near = chain.insert(new Ball(50, 1, 0), { index: 1, after: true })!;
    objective.onExplosion(ctx, 0, near);
    const far = chain.insert(new Ball(51, 3, 0), { index: chain.balls.length - 1, after: true })!;
    objective.onExplosion(ctx, 0, far);
    expect(events).toEqual(['hit 4 → 26']);
  });

  it('gets faster and spits balls at each third of its health, then falls', () => {
    const { chain, ctx, events } = context('abbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    const objective = new ColossusObjective(setup);
    objective.start(ctx);
    const blow = (balls: number, depth: number) => ({
      balls: chain.balls.slice(1, 1 + balls),
      cause: 'shot' as const,
      depth,
    });
    objective.onExplosion(ctx, 0, blow(5, 2));
    expect(objective.phase).toBe(1);
    expect(chain.balls.filter((ball) => ball.tone === 5)).toHaveLength(4);
    objective.onExplosion(ctx, 0, blow(3, 4));
    expect(objective.isComplete()).toBe(false);
    objective.onExplosion(ctx, 0, blow(2, 4));
    expect(objective.isComplete()).toBe(true);
    expect(events).toEqual(['hit 10 → 20', 'phase 1', 'hit 12 → 8', 'phase 2', 'hit 8 → 0']);
  });

  it('grows its chain back when it runs out', () => {
    const { chain, ctx } = context('a');
    const objective = new ColossusObjective(setup);
    objective.start(ctx);
    chain.clear();
    chain.attachPusher(30);
    objective.update(ctx);
    expect(chain.balls).toHaveLength(4);
  });
});

describe('Game with a Colossus', () => {
  const classic: LevelSetup = {
    board: { width: 1000, height: 500 },
    shooter: new Vec2(500, 400),
    chains: [{ path: straightPath(), recipe: { length: 10, tones: 3, repeatChance: 0.3 } }],
    chain: PARAMS,
    projectileSpeed: 1500,
    fireCooldown: 0.2,
    parTime: 60,
  };
  const level: LevelSetup = {
    ...classic,
    colossus: { chain: 0, hp: 40, radius: 40, reach: 3 * D, phases: [1, 1.3, 1.6], spit: 5 },
  };

  it('exposes the health of the Colossus and is lost if it reaches the hole', () => {
    const game = new Game(level, SeededRandom.fromString('boss'));
    expect(game.colossus).toEqual({ hp: 40, maxHp: 40, phase: 0 });
    let outcome = '';
    game.events.on('ended', (event) => (outcome = event.outcome));
    for (let i = 0; i < 60 * 40 && game.state === 'playing'; i++) game.update(1 / 60);
    expect(outcome).toBe('lost');
  });

  it('has no Colossus in a classic level', () => {
    expect(new Game(classic, SeededRandom.fromString('x')).colossus).toBeNull();
  });
});
