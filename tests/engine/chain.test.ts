import { describe, expect, it } from 'vitest';
import { Ball, BallFactory } from '@/engine/chain/Ball';
import { Chain } from '@/engine/chain/Chain';
import { ChainGenerator } from '@/engine/chain/ChainGenerator';
import { SeededRandom } from '@/engine/core/Random';
import { Vec2 } from '@/engine/geometry/Vec2';
import { chainOf, D, describe as layout, PARAMS, straightPath } from './helpers';

/** Advances a chain in small steps and collects every explosion. */
const run = (chain: Chain, seconds: number) => {
  const explosions = [];
  for (let t = 0; t < seconds; t += 1 / 120) explosions.push(...chain.advance(1 / 120));
  return explosions;
};

const shot = (tone: number) => new Ball(999, tone, 0);

describe('Chain movement', () => {
  it('pushes the rear segment only', () => {
    const chain = chainOf('ab__cd');
    const front = chain.balls[2]!.s;
    chain.advance(0.1);
    expect(chain.balls[0]!.s).toBeCloseTo(105);
    expect(chain.balls[1]!.s).toBeCloseTo(125);
    expect(chain.balls[2]!.s).toBe(front);
  });

  it('pushes the front segment once the rear one reaches it', () => {
    const chain = chainOf('ab_cd');
    expect(run(chain, 1)).toEqual([]);
    expect(layout(chain)).toBe('abcd');
    expect(chain.balls[3]!.s).toBeGreaterThan(100 + 4 * D);
  });

  it('rushes in at the start of a level, then slows down', () => {
    const chain = chainOf('ab', 0, { ...PARAMS, rushSpeed: 500, rushDistance: 200 });
    chain.advance(0.1);
    expect(chain.balls[0]!.s).toBeCloseTo(50);
    chain.advance(1);
    const cruising = chain.balls[0]!.s;
    chain.advance(0.1);
    expect(chain.balls[0]!.s - cruising).toBeCloseTo(5);
  });

  describe('hurries back in when the board runs out of balls', () => {
    const HURRY = { ...PARAMS, speed: 50, rushSpeed: 500, rushDistance: 0 };
    /** `count` touching balls, the first `onBoard` of them (from the head) on the board. */
    const lined = (count: number, onBoard: number, params = HURRY) =>
      new Chain(
        straightPath(),
        Array.from({ length: count }, (_, i) => new Ball(i + 1, i % 3, (i - count + onBoard) * D)),
        params,
      );
    const step = (chain: Chain) => {
      const tail = chain.balls[0]!.s;
      chain.advance(0.01);
      return chain.balls[0]!.s - tail;
    };

    it('at its opening speed while the board is nearly empty and balls wait in the tunnel', () => {
      expect(step(lined(8, 2))).toBeCloseTo(5);
    });

    it('easing off as the board fills, and at its own pace from eight balls on', () => {
      expect(step(lined(10, 6))).toBeCloseTo(2.75);
      expect(step(lined(10, 8))).toBeCloseTo(0.5);
      // Nothing left in the tunnel: nothing to hurry.
      expect(step(lined(2, 2))).toBeCloseTo(0.5);
    });

    it('never near the hole, behind a Colossus, or for a chain that stands still', () => {
      const rear = [1, 2, 3].map((i) => new Ball(i, i % 3, -i * D));
      const ahead = [new Ball(4, 0, 500), new Ball(5, 1, 500 + D)];
      expect(step(new Chain(straightPath(), [...rear, ...ahead], HURRY))).toBeCloseTo(0.5);
      const pushed = lined(8, 2);
      pushed.attachPusher(30);
      const before = pushed.pusherArc!;
      pushed.advance(0.01);
      expect(pushed.pusherArc! - before).toBeCloseTo(0.5);
      expect(step(lined(8, 2, { ...HURRY, speed: 0 }))).toBe(0);
    });
  });

  it('queues a new chain in the entrance tunnel, head first', () => {
    const factory = new BallFactory();
    const chain = Chain.queued(
      straightPath(),
      [0, 1, 2].map((tone) => factory.create(tone)),
      PARAMS,
    );
    expect(chain.balls.map((ball) => ball.s)).toEqual([-2 * D, -D, 0]);
    expect(chain.balls.map((ball) => ball.id)).toEqual([1, 2, 3]);
  });

  it('detects the hole', () => {
    const chain = chainOf('ab', 1000 - D - 1);
    expect(chain.reachedHole).toBe(false);
    chain.advance(0.1);
    expect(chain.reachedHole).toBe(true);
  });
});

describe('Chain insertion and explosions', () => {
  it('inserts after the touched ball and pushes the balls ahead', () => {
    const chain = chainOf('abc');
    expect(chain.insert(shot(3), { index: 0, after: true })).toBeNull();
    expect(layout(chain)).toBe('adbc');
    expect(chain.balls[3]!.s).toBe(100 + 3 * D);
  });

  it('inserts before the touched ball', () => {
    const chain = chainOf('abc');
    chain.insert(shot(3), { index: 1, after: false });
    expect(layout(chain)).toBe('adbc');
  });

  it('explodes a group of three made by a shot', () => {
    const chain = chainOf('abbc');
    const explosion = chain.insert(shot(1), { index: 2, after: true });
    expect(explosion?.balls.map((ball) => ball.tone)).toEqual([1, 1, 1]);
    expect(explosion?.cause).toBe('shot');
    expect(explosion?.depth).toBe(1);
    expect(layout(chain)).toBe('a|c');
  });

  it('pulls a matching front segment back and chains the reaction', () => {
    // a c c b b c a: shooting a "b" into the b group leaves c c | c, which join.
    const chain = chainOf('accbbca');
    const first = chain.insert(shot(1), { index: 4, after: true });
    expect(first?.depth).toBe(1);
    expect(layout(chain)).toBe('acc|ca');
    expect(chain.settled).toBe(false);

    const reactions = run(chain, 1);
    expect(reactions).toHaveLength(1);
    expect(reactions[0]).toMatchObject({ cause: 'reaction', depth: 2 });
    expect(reactions[0]!.balls).toHaveLength(3);
    // The remaining "a | a" also attract: the reaction goes on until it fizzles out.
    expect(layout(chain)).toBe('aa');
  });

  it('does not pull back a segment of another colour', () => {
    const chain = chainOf('abbbc');
    chain.insert(shot(1), { index: 1, after: false });
    expect(layout(chain)).toBe('a|c');
    expect(chain.settled).toBe(true);
    const c = chain.balls[1]!.s;
    chain.advance(0.1);
    expect(chain.balls[1]!.s).toBe(c);
  });

  it('does not explode a join of fewer than three balls', () => {
    // "b c" is pulled back onto "a b": the join only makes a pair of b.
    const chain = chainOf('ab__bc');
    expect(run(chain, 1)).toEqual([]);
    expect(layout(chain)).toBe('abbc');
  });

  it('restarts the depth once the reaction is over', () => {
    const chain = chainOf('abbcddc');
    chain.insert(shot(1), { index: 2, after: true });
    expect(layout(chain)).toBe('a|cddc');
    run(chain, 0.1);
    const explosion = chain.insert(shot(3), { index: 2, after: true });
    expect(explosion?.depth).toBe(1);
  });

  it('lists the colours still on the track', () => {
    expect([...chainOf('abca').tones()].sort()).toEqual([0, 1, 2]);
  });
});

describe('Chain hit test', () => {
  const chain = chainOf('abc');

  it('finds the touched ball and the side of the impact', () => {
    expect(chain.hitTest(new Vec2(125, 110))).toEqual({ index: 1, after: true });
    expect(chain.hitTest(new Vec2(115, 90))).toEqual({ index: 1, after: false });
  });

  it('misses when too far', () => {
    expect(chain.hitTest(new Vec2(120, 130))).toBeNull();
  });

  it('ignores balls still in the entrance tunnel', () => {
    expect(chainOf('ab', -60).hitTest(new Vec2(-40, 100))).toBeNull();
  });
});

describe('ChainGenerator', () => {
  const generator = () => new ChainGenerator(SeededRandom.fromString('test'), 3);

  it('draws the requested length among the requested colours', () => {
    const tones = generator().tones({ length: 200, tones: 4, repeatChance: 0.5 });
    expect(tones).toHaveLength(200);
    expect(new Set(tones)).toEqual(new Set([0, 1, 2, 3]));
  });

  it('never draws a group that would explode on its own', () => {
    const tones = generator().tones({ length: 500, tones: 3, repeatChance: 0.9 });
    for (let i = 2; i < tones.length; i++) {
      expect(tones[i] === tones[i - 1] && tones[i] === tones[i - 2], `index ${i}`).toBe(false);
    }
  });

  it('is reproducible', () => {
    const recipe = { length: 50, tones: 5, repeatChance: 0.3 };
    expect(generator().tones(recipe)).toEqual(generator().tones(recipe));
  });

  it('needs at least two colours', () => {
    expect(() => generator().tones({ length: 5, tones: 1, repeatChance: 0 })).toThrow();
  });
});
