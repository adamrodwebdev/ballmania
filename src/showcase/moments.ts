import type { Game, GameEvents } from '@/engine/Game';
import type { Vec2 } from '@/engine/geometry/Vec2';
import { duelLevel } from '@/levels/arcade/duel';
import { findLevel, type WorldId } from '@/levels/campaign';
import { toLevelSetup, type LevelDefinition } from '@/levels/LevelDefinition';
import { resolveLevel } from '@/levels/resolveLevel';
import type { Frame } from '@/levels/tracks';
import { trainingDefinition, trainingLevel } from '@/levels/training';
import { LESSON_BEND } from '@/play/HandCoach';
import { LINEUP, type Highlight, type MomentId } from './lineup';
import type { Cue } from './ShowcaseHand';

/** How a moment of the reel plays. */
export interface Script {
  /** Seconds it plays. */
  readonly seconds: number;
  /** Seconds by which its peak comes (all under 3: the window opens on the action). */
  readonly peakBy: number;
  /** The game it plays, on a board shape. */
  level(frame: Frame): LevelDefinition;
  readonly seed: string;
  readonly cues: readonly Cue[];
  /** Watches a game for the moment's peak: the function says whether it has come. */
  peak(game: Game): () => boolean;
}

/** How close a take comes to its board: `zoom` times, centred on a point of the board. */
export interface Framing {
  readonly zoom: number;
  /** The point to centre on, in board units, read once the chain is in place. */
  focus(game: Game): Vec2;
}

/**
 * What a take plays (v1.8.0): a script on a world's board, as the title's
 * reel shows its moments and the Workshop's fitting room its cosmetics.
 */
export interface Scene extends Script {
  readonly id: string;
  readonly world: WorldId;
  /** It wears the player's board rather than its world's (the fitting room's boards). */
  readonly ownBoard?: boolean;
  /** Closer than the whole board; the whole board if absent. */
  readonly framing?: Framing;
}

/**
 * One moment of the title's reel (v1.8.0): a real game of the game's own
 * engine, its chain already on the board, a hand that plays it, and the
 * peak it reaches within its first seconds.
 */
export interface Moment extends Highlight, Script {}

/** The chain rushes in over this share of its track: the moment opens with it in place. */
const READY = 0.45;
/** Units per second it rushes in at. */
const RUSH = 2600;

/** A level whose chains are in place within a few tenths of a second. */
export function ready(level: LevelDefinition): LevelDefinition {
  const longest = Math.max(...toLevelSetup(level).chains.map((chain) => chain.path.length));
  return { ...level, rushSpeed: RUSH, rushDistance: longest * READY };
}

/** A campaign level, its chain laid out by hand (head first) and its first colours dealt. */
export function laidOut(
  id: string,
  frame: Frame,
  layout: { readonly headFirst: readonly number[]; readonly opening: readonly number[] },
): LevelDefinition {
  const level = resolveLevel(findLevel(id)!, frame);
  return ready({
    ...level,
    chains: level.chains.map((chain, index) =>
      index === 0
        ? { ...chain, length: layout.headFirst.length, sequence: [...layout.headFirst].reverse() }
        : chain,
    ),
    opening: layout.opening,
  });
}

/** Says whether the game has emitted an event of a kind that passes `test`. */
export function seen<K extends keyof GameEvents>(
  game: Game,
  event: K,
  test: (payload: GameEvents[K]) => boolean = () => true,
): () => boolean {
  let come = false;
  game.events.on(event, (payload) => {
    if (test(payload)) come = true;
  });
  return () => come;
}

/** Says whether `first` came, then an explosion of the player's. */
function then(game: Game, first: () => boolean): () => boolean {
  let burst = false;
  game.events.on('exploded', ({ by }) => {
    if (by === 'player' && first()) burst = true;
  });
  return () => burst;
}

/** Pairs nested around a pair, head first: a shot of the middle's colour sets a cascade off. */
export const nested = (a: number, b: number, c: number) => [a, a, b, b, c, c, b, b, a, a];

const SCRIPTS: Readonly<Record<MomentId, Script>> = {
  // The Nova of the training's first showcase, then the cascade behind it.
  nova: {
    seconds: 4.5,
    peakBy: 1.5,
    level: (frame) => ready(trainingDefinition(trainingLevel(1), frame)),
    seed: 'reel-nova',
    cues: [
      { at: 0.8, act: 'nova' },
      { at: 2.3, act: 'shot' },
    ],
    peak: (game) => seen(game, 'bomb'),
  },
  // A bank shot off the neon mirrors into the middle of a cascade.
  bank: {
    seconds: 4,
    peakBy: 2.5,
    level: (frame) => ready(trainingDefinition(trainingLevel(2), frame)),
    seed: 'reel-bank',
    cues: [
      { at: 0.8, act: 'bank' },
      { at: 2.4, act: 'bank' },
    ],
    peak: (game) => seen(game, 'exploded', ({ by, bounces }) => by === 'player' && bounces > 0),
  },
  // A marble pulled out from between two pairs of one colour, which meet and burst.
  magnet: {
    seconds: 4,
    peakBy: 2,
    level: (frame) =>
      laidOut('abyss-02', frame, {
        headFirst: [
          ...[0, 0, 2, 0, 0],
          ...[1, 1, 3, 1, 1],
          ...[2, 2, 0, 2, 2],
          ...[3, 3, 1, 3, 3],
          ...[0, 0, 2, 0, 0],
          ...[1, 1, 3, 1, 1],
        ],
        opening: [2, 3, 0],
      }),
    seed: 'reel-magnet',
    cues: [
      { at: 0.8, act: 'pull' },
      { at: 2.3, act: 'shot' },
    ],
    peak: (game) => then(game, seen(game, 'pulled')),
  },
  // Lime shot onto ruby beside two ambers: the ruby turns amber, and three burst.
  alchemy: {
    seconds: 4,
    peakBy: 2,
    level: (frame) =>
      laidOut('jewel-02', frame, {
        headFirst: [
          ...[1, 1, 0, 4, 2, 4],
          ...[1, 1, 0, 2, 4, 2],
          ...[1, 1, 0, 4, 2, 4],
          ...[0, 2, 0, 4, 2, 4],
        ],
        opening: [2, 2, 2],
      }),
    seed: 'reel-alchemy',
    cues: [
      { at: 0.8, act: 'fuse' },
      { at: 2.3, act: 'fuse' },
    ],
    peak: (game) => then(game, seen(game, 'fused')),
  },
  // The lava sent down the detour, then a shot.
  switch: {
    seconds: 4,
    peakBy: 1,
    level: (frame) => ready(resolveLevel(findLevel('volcano-02')!, frame)),
    seed: 'reel-switch',
    cues: [
      { at: 0.6, act: 'flip' },
      { at: 1.8, act: 'shot' },
      { at: 3.2, act: 'shot' },
    ],
    peak: (game) => seen(game, 'switched'),
  },
  // A shot the black hole bends onto a cascade, the launcher gliding round its ring.
  blackHole: {
    seconds: 4.5,
    peakBy: 2.2,
    level: (frame) =>
      laidOut('singularity-02', frame, {
        headFirst: [...nested(0, 1, 2), ...nested(2, 0, 1), ...nested(1, 2, 0)],
        opening: [2, 1, 0],
      }),
    seed: 'reel-black-hole',
    cues: [
      { at: 0.8, act: 'curve' },
      { at: 2.6, act: 'curve' },
    ],
    peak: (game) => {
      let shot: { readonly deflection: number } | null = null;
      game.events.on('fired', ({ projectile }) => {
        if (projectile.by === 'player') shot = projectile;
      });
      return seen(
        game,
        'exploded',
        ({ by, cause }) =>
          by === 'player' && cause === 'shot' && (shot?.deflection ?? 0) >= LESSON_BEND,
      );
    },
  },
  // The Stellar Colossus's last blow, and its fall: the supernova.
  colossus: {
    seconds: 4.5,
    peakBy: 2,
    level: (frame) => {
      // A pair of the colour dealt first right in front of it, at the rear of the chain.
      const level = laidOut('nebula-12', frame, {
        headFirst: [...nested(0, 1, 2), ...nested(3, 0, 1), 2, 3, 3, 1, 0, 0],
        opening: [0, 3, 1],
      });
      return { ...level, colossus: { ...level.colossus!, hp: 3 } };
    },
    seed: 'reel-colossus',
    cues: [{ at: 0.8, act: 'colossus' }],
    peak: (game) => seen(game, 'ended', ({ outcome }) => outcome === 'won'),
  },
  // The Duel: a cascade pushes the chain back toward the rival's hole.
  duel: {
    seconds: 4,
    peakBy: 2.2,
    level: (frame) => {
      const level = duelLevel('normal', frame);
      const headFirst = [...nested(0, 1, 2), ...nested(3, 0, 1)];
      return {
        ...level,
        chains: level.chains.map((chain) => ({
          ...chain,
          length: headFirst.length,
          sequence: [...headFirst].reverse(),
        })),
        opening: [2, 1, 3],
      };
    },
    seed: 'reel-duel',
    cues: [
      { at: 0.8, act: 'shot' },
      { at: 2.4, act: 'shot' },
    ],
    peak: (game) => seen(game, 'exploded', ({ by, depth }) => by === 'player' && depth >= 2),
  },
};

/** The reel's moments, in the order of its lineup. */
export const MOMENTS: readonly Moment[] = LINEUP.map((highlight) => ({
  ...highlight,
  ...SCRIPTS[highlight.id],
}));
