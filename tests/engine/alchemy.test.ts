import { describe, expect, it } from 'vitest';
import {
  FUSE_REACH,
  ingredients,
  isPrimary,
  mix,
  offCentre,
  PRIMARIES,
  SECONDARIES,
} from '@/engine/chain/Alchemy';
import { ChainGenerator } from '@/engine/chain/ChainGenerator';
import { SeededRandom } from '@/engine/core/Random';
import { Game, type LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { chainOf, describe as layout, FixedRandom, PARAMS, straightPath } from './helpers';

describe('Alchemy', () => {
  it('mixes two different primaries like light', () => {
    expect(mix(0, 2)).toBe(1);
    expect(mix(2, 0)).toBe(1);
    expect(mix(2, 4)).toBe(3);
    expect(mix(4, 0)).toBe(5);
    expect(mix(0, 0)).toBeNull();
    expect(mix(0, 1)).toBeNull();
    expect(mix(1, 3)).toBeNull();
  });

  it('knows primaries, secondaries and their ingredients', () => {
    expect(PRIMARIES.every(isPrimary)).toBe(true);
    expect(SECONDARIES.some(isPrimary)).toBe(false);
    for (const secondary of SECONDARIES) {
      const [a, b] = ingredients(secondary)!;
      expect(mix(a, b)).toBe(secondary);
    }
    expect(ingredients(0)).toBeNull();
  });

  it('measures how far a flight passes from a centre, whatever its speed', () => {
    const centre = new Vec2(100, 0);
    expect(offCentre(centre, new Vec2(100, 300), new Vec2(0, -900))).toBeCloseTo(0);
    expect(offCentre(centre, new Vec2(106, 300), new Vec2(0, -900))).toBeCloseTo(6);
    expect(offCentre(centre, new Vec2(94, 300), new Vec2(0, -1))).toBeCloseTo(6);
  });
});

describe('ChainGenerator with a palette', () => {
  it('draws only the given colours, never three in a row', () => {
    const generator = new ChainGenerator(SeededRandom.fromString('palette'), 3);
    const tones = generator.tones({
      length: 300,
      tones: 4,
      repeatChance: 0.6,
      palette: [0, 2, 4, 5],
    });
    expect(new Set(tones)).toEqual(new Set([0, 2, 4, 5]));
    for (let i = 2; i < tones.length; i++) {
      expect(tones[i] === tones[i - 1] && tones[i] === tones[i - 2]).toBe(false);
    }
  });
});

describe('Chain.recolour', () => {
  it('recolours a ball and explodes the group it completes', () => {
    // f f a f: recolouring the "a" into "f" makes four "f" in a row.
    const chain = chainOf('ffaf');
    const explosion = chain.recolour(2, 5);
    expect(explosion?.balls).toHaveLength(4);
    expect(explosion?.cause).toBe('shot');
    expect(chain.isEmpty).toBe(true);
  });

  it('only recolours when no group forms', () => {
    const chain = chainOf('bab');
    expect(chain.recolour(1, 3)).toBeNull();
    expect(layout(chain)).toBe('bdb');
  });
});

describe('Game with alchemy', () => {
  /** A chain of one ruby (0) at s = 0 on y = 100; the shooter below aims straight up. */
  const level = (alchemy: boolean): LevelSetup => ({
    board: { width: 1000, height: 1000 },
    shooter: new Vec2(500, 400),
    chains: [
      { path: straightPath(), recipe: { length: 2, tones: 2, repeatChance: 0, palette: [0, 4] } },
    ],
    chain: { ...PARAMS, speed: 0, rushSpeed: 600, rushDistance: 520 },
    projectileSpeed: 1500,
    fireCooldown: 0.2,
    alchemy,
  });

  /** Aims at the head, `aside` units off its centre along the track, then shoots. */
  const shootAtHead = (game: Game, aside = 0) => {
    for (let i = 0; i < 120; i++) game.update(1 / 60);
    const chain = game.chains[0]!;
    const head = chain.balls[chain.balls.length - 1]!;
    game.aimAt(chain.positionOf(head).add(new Vec2(aside, 0)));
    const centred = game.aimTarget()?.centred;
    const preview = game.preview();
    game.fire();
    for (let i = 0; i < 40; i++) game.update(1 / 60);
    return { centred, preview };
  };

  it('loads only primaries', () => {
    const game = new Game(level(true), new FixedRandom(0.99));
    expect(PRIMARIES).toContain(game.shooter.current);
    expect(PRIMARIES).toContain(game.shooter.next);
  });

  it('fuses a primary shot onto another primary instead of inserting it', () => {
    // FixedRandom(0): the chain is "ruby, violet" (0 then 4); the shooter holds ruby (0).
    const game = new Game(level(true), new FixedRandom(0));
    expect(game.chains[0]!.balls.map((ball) => ball.tone)).toEqual([0, 4]);
    expect(game.shooter.current).toBe(0);
    const fused: string[] = [];
    game.events.on('fused', ({ from, ball }) => fused.push(`${from.join('+')}=${ball.tone}`));
    shootAtHead(game);
    expect(fused).toEqual(['0+4=5']);
    expect(game.chains[0]!.balls.map((ball) => ball.tone)).toEqual([0, 5]);
    expect(game.summary().fusions).toBe(1);
  });

  it('slips an off-centre shot in beside the ball, and says so before the shot (v1.8.1)', () => {
    const near = new Game(level(true), new FixedRandom(0));
    const centred = shootAtHead(near, 0.4 * FUSE_REACH * PARAMS.ballRadius);
    expect(centred.centred).toBe(true);
    // A fusion has no ghost marble: the ring of the mix shows instead.
    expect(centred.preview).toBeNull();
    expect(near.summary().fusions).toBe(1);

    const off = new Game(level(true), new FixedRandom(0));
    const glancing = shootAtHead(off, 1.4 * FUSE_REACH * PARAMS.ballRadius);
    expect(glancing.centred).toBe(false);
    expect(glancing.preview).not.toBeNull();
    expect(off.summary().fusions).toBe(0);
    expect(off.chains[0]!.balls.map((ball) => ball.tone)).toEqual([0, 4, 0]);
  });

  it('inserts as usual outside the Jewel world', () => {
    const game = new Game(level(false), new FixedRandom(0));
    shootAtHead(game);
    expect(game.chains[0]!.balls).toHaveLength(3);
  });
});

describe('ChainGenerator with paired colours', () => {
  it('always draws them two by two, still never three in a row', () => {
    const generator = new ChainGenerator(SeededRandom.fromString('pairs'), 3);
    const tones = generator.tones({
      length: 400,
      tones: 6,
      repeatChance: 0.3,
      palette: [0, 2, 4, 1, 3, 5],
      paired: [1, 3, 5],
    });
    // Runs of a paired colour are exactly two long (except possibly at the very end).
    let i = 0;
    while (i < tones.length) {
      let j = i;
      while (j + 1 < tones.length && tones[j + 1] === tones[i]) j++;
      const run = j - i + 1;
      if ([1, 3, 5].includes(tones[i]!) && j < tones.length - 1) expect(run, `at ${i}`).toBe(2);
      expect(run).toBeLessThan(3);
      i = j + 1;
    }
  });
});
