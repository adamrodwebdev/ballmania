import { describe, expect, it } from 'vitest';
import { Game } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Prism } from '@/engine/reflectors/Reflectors';
import { SeededRandom } from '@/engine/core/Random';
import {
  CAMPAIGN,
  findLevel,
  nextLevel,
  starsFor,
  starThresholds,
  WORLDS,
} from '@/levels/campaign';
import { resolveLevel } from '@/levels/resolveLevel';
import { toLevelSetup } from '@/levels/LevelDefinition';
import { FRAMES } from '@/levels/tracks';

const SHOOTER_RADIUS = 58;

describe('campaign', () => {
  it('has six worlds of twelve levels, each ending with a Colossus', () => {
    expect(WORLDS.map((world) => world.id)).toEqual([
      'nebula',
      'neon',
      'abyss',
      'jewel',
      'volcano',
      'singularity',
    ]);
    for (const world of WORLDS) {
      expect(world.levels).toHaveLength(12);
      expect(world.levels.map((level) => level.number)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
      expect(world.levels.every((level) => level.world === world.id)).toBe(true);
      expect(world.levels[11]!.colossus).toBeDefined();
      expect(world.levels.slice(0, 11).every((level) => !level.colossus)).toBe(true);
    }
    // Every Neon level has mirrors; Nebula has none.
    expect(WORLDS[1]!.levels.every((level) => (level.mirrors?.length ?? 0) > 0)).toBe(true);
    expect(WORLDS[0]!.levels.every((level) => !level.mirrors)).toBe(true);
    // Every Abyss level has a magnet.
    expect(WORLDS[2]!.levels.every((level) => level.magnet !== undefined)).toBe(true);
    // Every Jewel level has a palette of primaries, then of secondaries.
    // Every Volcano level has switches.
    for (const level of WORLDS[4]!.levels) {
      expect(level.track.kind === 'serpentine' && (level.track.forks?.length ?? 0) > 0).toBe(true);
    }
    for (const level of WORLDS[3]!.levels) {
      expect(level.palette!.slice(0, 3)).toEqual([0, 2, 4]);
    }
    // Every Singularity level has a black hole and spirals coming out of a portal;
    // the first one introduces gravity alone, the shooter starts gliding at the second.
    for (const level of WORLDS[5]!.levels) {
      expect(level.gravity).toBeGreaterThan(0);
      expect(level.track.kind === 'spiral' && level.track.portal).toBe(true);
    }
    expect(WORLDS[5]!.levels[0]!.orbit).toBeUndefined();
    expect(WORLDS[5]!.levels.slice(1).every((level) => level.orbit !== undefined)).toBe(true);
    expect(CAMPAIGN).toHaveLength(72);
  });

  it('finds levels and their successor', () => {
    const first = findLevel('nebula-01')!;
    expect(nextLevel(first)?.id).toBe('nebula-02');
    expect(nextLevel(findLevel('nebula-12')!)?.id).toBe('neon-01');
    expect(nextLevel(findLevel('neon-12')!)?.id).toBe('abyss-01');
    expect(nextLevel(findLevel('abyss-12')!)?.id).toBe('jewel-01');
    expect(nextLevel(findLevel('jewel-12')!)?.id).toBe('volcano-01');
    expect(nextLevel(findLevel('volcano-12')!)?.id).toBe('singularity-01');
    expect(nextLevel(findLevel('singularity-12')!)).toBeUndefined();
    expect(findLevel('nope')).toBeUndefined();
  });

  it('gets harder in a saw-tooth curve', () => {
    const nebula = WORLDS[0]!.levels;
    const effort = nebula.map((level) => level.length * level.speed * (1 - level.repeatChance));
    expect(effort[10]!).toBeGreaterThan(effort[0]! * 2);
    // At least one "breathing" level easier than the one before it.
    expect(effort.slice(1, 11).some((value, i) => value < effort[i]!)).toBe(true);
  });

  it('awards stars from the score, one for finishing', () => {
    const level = findLevel('nebula-04')!;
    const [two, three] = starThresholds(level);
    expect(two).toBeLessThan(three);
    expect(starsFor(level, 10_000, false)).toBe(0);
    expect(starsFor(level, 0, true)).toBe(1);
    expect(starsFor(level, two, true)).toBe(2);
    expect(starsFor(level, three, true)).toBe(3);
  });
});

describe.each(Object.values(FRAMES))('geometry on the $kind board', (frame) => {
  it.each(CAMPAIGN.map((level) => [level.id, level] as const))('%s is playable', (_, level) => {
    const setup = toLevelSetup(resolveLevel(level, frame));
    const radius = setup.chain.ballRadius;
    // With switches, the detours must be as clean as the shortcuts.
    const variants = setup.chains.map(({ path, route }) => {
      const paths = [path];
      if (route) {
        paths.push(route.build(Array.from({ length: route.forkCount }, () => 'long')).path);
      }
      return paths.map((candidate) => candidate.sample(10));
    });
    const samples = variants.flat();

    for (const points of samples) {
      for (const [i, point] of points.entries()) {
        // The visible track stays on the board (the entrance tunnel crosses its edge)…
        if (i >= 16) {
          expect(point.x).toBeGreaterThanOrEqual(radius);
          expect(point.x).toBeLessThanOrEqual(frame.width - radius);
          expect(point.y).toBeGreaterThanOrEqual(radius);
          expect(point.y).toBeLessThanOrEqual(frame.height - radius);
        }
        // …and away from the shooter.
        expect(point.distanceTo(setup.shooter)).toBeGreaterThan(SHOOTER_RADIUS + radius * 2);
      }
    }

    // No two parts of a track overlap (beyond neighbouring samples), whichever way the
    // switches are set, and no two chains overlap.
    const overlap = (
      first: readonly Vec2[],
      second: readonly Vec2[],
      same: boolean,
      label: string,
    ) => {
      first.forEach((a, i) => {
        second.forEach((b, j) => {
          if (same && j <= i + 11) return;
          expect(a.distanceTo(b), `${label} ${i}/${j}`).toBeGreaterThan(radius * 2 + 10);
        });
      });
    };
    variants.forEach((chainVariants, chain) => {
      chainVariants.forEach((points, variant) =>
        overlap(points, points, true, `${chain}.${variant}`),
      );
      variants.slice(chain + 1).forEach((others, offset) => {
        for (const points of chainVariants) {
          for (const other of others)
            overlap(points, other, false, `${chain}/${chain + offset + 1}`);
        }
      });
    });

    // Mirrors stay on the board, clear of the tracks and of the shooter.
    const game = new Game(setup, SeededRandom.fromString('mirrors'));
    for (const reflector of game.reflectors.items) {
      for (const segment of reflector.segments) {
        for (const end of [segment.a, segment.b]) {
          expect(end.x).toBeGreaterThanOrEqual(0);
          expect(end.x).toBeLessThanOrEqual(frame.width);
          expect(end.y).toBeGreaterThanOrEqual(0);
          expect(end.y).toBeLessThanOrEqual(frame.height);
        }
        expect(segment.distanceTo(setup.shooter)).toBeGreaterThan(SHOOTER_RADIUS + radius * 2);
        for (const points of samples) {
          for (const point of points.slice(16)) {
            expect(segment.distanceTo(point), reflector.kind).toBeGreaterThan(radius * 2 + 10);
          }
        }
      }
    }
    // A turning prism sweeps a disc: keep that disc clear too.
    for (const reflector of game.reflectors.items) {
      if (!(reflector instanceof Prism) || reflector.spin === 0) continue;
      for (const points of samples) {
        for (const point of points.slice(16)) {
          expect(point.distanceTo(reflector.centre)).toBeGreaterThan(
            reflector.radius + radius + 10,
          );
        }
      }
    }

    // The shooter's ring stays clear of the tracks and of the mirrors, all the way round.
    if (setup.orbit) {
      const { centre, radiusX, radiusY } = setup.orbit;
      const ring = Array.from({ length: 96 }, (_, i) => {
        const angle = (i / 96) * Math.PI * 2;
        return centre.add(new Vec2(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY));
      });
      for (const at of ring) {
        expect(at.x).toBeGreaterThanOrEqual(SHOOTER_RADIUS);
        expect(at.x).toBeLessThanOrEqual(frame.width - SHOOTER_RADIUS);
        for (const points of samples) {
          for (const point of points) {
            expect(point.distanceTo(at)).toBeGreaterThan(SHOOTER_RADIUS + radius * 2);
          }
        }
        for (const reflector of game.reflectors.items) {
          for (const segment of reflector.segments) {
            expect(segment.distanceTo(at)).toBeGreaterThan(SHOOTER_RADIUS + radius);
          }
        }
      }
    }

    // There is room for the chain and time to play.
    for (const { path } of setup.chains) {
      expect(path.length).toBeGreaterThan(level.length * radius * 2 * 1.2);
    }
    expect(setup.parTime).toBeGreaterThan(20);
  });

  it.each(CAMPAIGN.map((level) => [level.id, level] as const))('%s starts a game', (_, level) => {
    const game = new Game(toLevelSetup(resolveLevel(level, frame)), SeededRandom.fromString('x'));
    for (let i = 0; i < 120; i++) game.update(1 / 60);
    expect(game.state).toBe('playing');
    expect(game.colossus !== null).toBe(level.colossus !== undefined);
  });
});
