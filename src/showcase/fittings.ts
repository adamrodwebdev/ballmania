import type { Game } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import type { Frame } from '@/levels/tracks';
import type { CosmeticSlot } from '@/player/catalog';
import { laidOut, nested, seen, type Scene } from './moments';
import { plan } from './ShowcaseHand';

/**
 * The level every fitting plays: 1-2, a spiral of the Nebula with no hand
 * teaching on it, its chain laid by hand in nested pairs so that each colour
 * dealt sets a three-step cascade off, rushed into place.
 */
const level = (frame: Frame) =>
  laidOut('nebula-02', frame, {
    headFirst: [...nested(0, 1, 2), ...nested(1, 2, 0), ...nested(2, 0, 1), ...nested(0, 1, 2)],
    opening: [2, 0, 1],
  });

/** Where the hand's shot of a kind would land now: the marble it aims at, else the launcher. */
function landing(game: Game, act: 'shot' | 'far'): Vec2 {
  const angle = plan(game, act);
  const target = angle === null ? null : game.aimLineAt(angle).target;
  const chain = target ? game.chains[target.chain] : undefined;
  const ball = target ? chain?.balls[target.index] : undefined;
  return chain && ball ? chain.positionOf(ball) : game.shooter.position;
}

/** Says whether a shot of the player's has flown `distance` units from the launcher. */
function flown(game: Game, distance: number): () => boolean {
  return () =>
    game.projectiles.some(
      (projectile) =>
        projectile.by === 'player' &&
        projectile.position.distanceTo(game.shooter.position) >= distance,
    );
}

/**
 * The Workshop's fitting room (v1.8.0): what each slot's cosmetic shows, on
 * the game's own engine, close up. Each one peaks within its first two
 * seconds and loops; with reduced motion, its peak is the still image.
 */
export const FITTINGS: Readonly<Record<CosmeticSlot, Scene>> = {
  // The launcher aims, its line showing, and fires twice, close up.
  shooter: {
    id: 'fitting-shooter',
    world: 'nebula',
    seconds: 3.5,
    peakBy: 1,
    level,
    seed: 'fitting-shooter',
    cues: [
      { at: 0.6, act: 'shot' },
      { at: 2, act: 'shot' },
    ],
    peak: (game) => seen(game, 'fired', ({ projectile }) => projectile.by === 'player'),
    framing: {
      zoom: 2.2,
      // The launcher, a little towards its first shot, so its aim line shows.
      focus: (game) => game.shooter.position.lerp(landing(game, 'shot'), 0.25),
    },
  },
  // A long shot across the board, the trail behind it.
  trail: {
    id: 'fitting-trail',
    world: 'nebula',
    seconds: 3.5,
    peakBy: 1.5,
    level,
    seed: 'fitting-trail',
    cues: [
      { at: 0.6, act: 'far' },
      { at: 2, act: 'far' },
    ],
    peak: (game) => flown(game, 380),
    framing: {
      zoom: 1.5,
      focus: (game) => game.shooter.position.lerp(landing(game, 'far'), 0.5),
    },
  },
  // The shot that sets the cascade off: two bursts in the style tried.
  burst: {
    id: 'fitting-burst',
    world: 'nebula',
    seconds: 3.5,
    peakBy: 1.5,
    level,
    seed: 'fitting-burst',
    cues: [
      { at: 0.5, act: 'shot' },
      { at: 2.1, act: 'shot' },
    ],
    peak: (game) => seen(game, 'exploded', ({ by }) => by === 'player'),
    framing: { zoom: 1.9, focus: (game) => landing(game, 'shot') },
  },
  // The board in the look tried, a little closer than whole, its chain running, a cascade on it.
  board: {
    id: 'fitting-board',
    world: 'nebula',
    seconds: 4,
    peakBy: 1.5,
    level,
    seed: 'fitting-board',
    ownBoard: true,
    cues: [
      { at: 0.6, act: 'shot' },
      { at: 2.2, act: 'shot' },
    ],
    peak: (game) => seen(game, 'exploded', ({ by }) => by === 'player'),
    framing: {
      zoom: 1.3,
      focus: (game) => new Vec2(game.setup.board.width / 2, game.setup.board.height / 2),
    },
  },
};
