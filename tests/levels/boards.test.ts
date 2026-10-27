import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '@/levels/campaign';
import { resolveLevel } from '@/levels/resolveLevel';
import { toLevelSetup } from '@/levels/LevelDefinition';
import { FRAMES, type FrameKind } from '@/levels/tracks';
import { playRobot, robotOf } from './bot';

/** Marbles a level's shortest chain track holds on a board. */
const room = (levelId: string, kind: FrameKind): number => {
  const level = CAMPAIGN.find((candidate) => candidate.id === levelId)!;
  const setup = toLevelSetup(resolveLevel(level, FRAMES[kind]));
  return Math.min(...setup.chains.map((chain) => chain.path.length / (setup.chain.ballRadius * 2)));
};

const SERPENTINES = CAMPAIGN.filter((level) => level.track.kind === 'serpentine');

/**
 * The same track on every board (v1.8.1, spec § 3.17): a serpentine holds about
 * as many marbles on a phone as on a desktop, so neither plays harder for it.
 */
describe('serpentines on every board (v1.8.1)', () => {
  it('covers the serpentines of every world', () => {
    expect(SERPENTINES.length).toBeGreaterThanOrEqual(24);
  });

  it.each(SERPENTINES.map((level) => level.id))(
    '%s holds as many marbles on the phone, portrait and landscape boards as on the wide one, within 10 %',
    (id) => {
      const wide = room(id, 'wide');
      for (const kind of ['tall', 'portrait', 'landscape'] as const) {
        expect(room(id, kind) / wide, kind).toBeGreaterThan(0.9);
        expect(room(id, kind) / wide, kind).toBeLessThan(1.1);
      }
    },
  );

  it.each(SERPENTINES.map((level) => level.id))(
    '%s keeps at least 70 % of it on the square board, which fits five rows at most',
    (id) => {
      expect(room(id, 'square') / room(id, 'wide')).toBeGreaterThan(0.7);
    },
  );
});

const TWINS = CAMPAIGN.filter((level) => level.track.kind === 'twin');

/**
 * The Abyss twins on desktop boards (v1.8.1, spec § 3.17): in columns that
 * face the shooter, no taller than the rows so that a desktop screen keeps
 * choosing them, they hold most of the marbles of a phone, and their marbles
 * no longer hide each other from the shooter.
 */
describe('twins on desktop boards (v1.8.1)', () => {
  it.each(TWINS.map((level) => level.id))(
    '%s holds 80 to 110 % of the marbles of a phone on the landscape and wide boards',
    (id) => {
      const phone = room(id, 'tall');
      for (const kind of ['landscape', 'wide'] as const) {
        expect(room(id, kind) / phone, kind).toBeGreaterThan(0.8);
        expect(room(id, kind) / phone, kind).toBeLessThan(1.1);
      }
    },
  );

  it('lets fewer than one shot in four meet another marble first on a wide board', () => {
    const level = CAMPAIGN.find((candidate) => candidate.id === 'abyss-04')!;
    const robot = robotOf('typical', 'mouse');
    const games = ['a', 'b', 'c', 'd', 'e', 'f'].map((seed) =>
      playRobot(level, FRAMES.wide, `twins-${seed}`, robot),
    );
    const aimed = games.reduce((sum, game) => sum + game.aimedShots, 0);
    const hidden = games.reduce((sum, game) => sum + game.hiddenShots, 0);
    expect(hidden / aimed).toBeLessThan(0.25);
  }, 60_000);
});
