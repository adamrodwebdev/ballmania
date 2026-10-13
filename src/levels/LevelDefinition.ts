import type { ChainParams } from '@/engine/chain/Chain';
import { SECONDARIES } from '@/engine/chain/Alchemy';
import type { ColossusSetup } from '@/engine/objectives/ColossusObjective';
import type { LevelSetup, MagnetSetup } from '@/engine/Game';
import type { DuelSetup } from '@/engine/objectives/DuelObjective';
import type { HazardSetup } from '@/engine/hazards/Hazards';
import type { EndlessSetup } from '@/engine/objectives/EndlessObjective';
import type { RhythmSetup } from '@/engine/rhythm/Tempo';
import { ForkedRoute, type RoutePart } from '@/engine/path/ForkedRoute';
import type { ReflectorSetup } from '@/engine/reflectors/Reflectors';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Path } from '@/engine/path/Path';

export type Point = readonly [x: number, y: number];

/** A track, as data: a polyline, or cubic Bézier curves (c1, c2, to) from a start point. */
export type PathDefinition =
  | { readonly kind: 'points'; readonly points: readonly Point[] }
  | {
      /** A track with switches (Volcano world); the chain starts on every shortcut. */
      readonly kind: 'forked';
      readonly parts: readonly (
        | { readonly kind: 'line'; readonly points: readonly Point[] }
        | {
            readonly kind: 'fork';
            readonly short: readonly Point[];
            readonly long: readonly Point[];
          }
      )[];
    }
  | {
      readonly kind: 'curves';
      readonly start: Point;
      readonly segments: readonly (readonly [c1: Point, c2: Point, to: Point])[];
    };

/** A mirror as data, in board units (Neon world). */
export type ReflectorDefinition =
  | { readonly kind: 'wall'; readonly from: Point; readonly to: Point }
  | {
      readonly kind: 'prism';
      readonly at: Point;
      readonly radius: number;
      readonly sides: number;
      readonly angle: number;
      readonly spin: number;
    };

export interface ChainDefinition {
  readonly path: PathDefinition;
  readonly length: number;
  readonly tones: number;
  readonly repeatChance: number;
  /** The colours to draw from (Jewel world), instead of the first `tones` ones. */
  readonly palette?: readonly number[];
  /** The exact colours, tail first (Puzzle); `length` and `tones` are then ignored. */
  readonly sequence?: readonly number[];
  /** Arc length of the tail when the chain starts on the track (Puzzle, Duel). */
  readonly tail?: number;
}

/**
 * A level as data (specification § 3.2): the campaign files will follow this
 * shape. Optional fields fall back to `LEVEL_DEFAULTS`.
 */
export interface LevelDefinition {
  readonly id: string;
  readonly board: { readonly width: number; readonly height: number };
  readonly shooter: Point;
  readonly chains: readonly ChainDefinition[];
  readonly speed: number;
  readonly rushSpeed?: number;
  readonly rushDistance?: number;
  readonly retreatSpeed?: number;
  readonly ballRadius?: number;
  readonly projectileSpeed?: number;
  readonly fireCooldown?: number;
  readonly parTime?: number;
  readonly colossus?: ColossusSetup;
  readonly reflectors?: readonly ReflectorDefinition[];
  readonly magnet?: MagnetSetup;
  readonly alchemy?: boolean;
  /** The black hole (Singularity world). */
  readonly gravity?: {
    readonly centre: Point;
    readonly strength: number;
    readonly horizon: number;
  };
  /** Endless mode: stages of speed and colours. */
  readonly endless?: EndlessSetup;
  /** Puzzle mode: shots allowed. */
  readonly puzzle?: { readonly shots: number };
  /** Rhythm mode: the music's tempo. */
  readonly rhythm?: RhythmSetup;
  /** Duel mode: the tug of war and the rival. */
  readonly duel?: DuelSetup & {
    readonly rival: {
      readonly at: Point;
      readonly cadence: number;
      readonly error: number;
      readonly focus: number;
    };
  };
  /** Every gap of the chain closes (Duel). */
  readonly compact?: boolean;
  /** Falling balls, arrhythmia and weather (§ 3.9). */
  readonly hazards?: HazardSetup;
  /** Factor of the points (campaign difficulty). */
  readonly scoreFactor?: number;
  /** The ring the shooter glides along (Singularity world); `shooter` is then its start. */
  readonly orbit?: {
    readonly centre: Point;
    readonly radius: Point;
    readonly speed: number;
    readonly start: number;
  };
}

export const LEVEL_DEFAULTS = {
  ballRadius: 26,
  minMatch: 3,
  retreatSpeed: 420,
  projectileSpeed: 1500,
  fireCooldown: 0.18,
} as const;

const toVec = ([x, y]: Point): Vec2 => new Vec2(x, y);

export function buildPath(definition: PathDefinition): Path {
  if (definition.kind === 'points') return Path.fromPoints(definition.points.map(toVec));
  if (definition.kind === 'forked') return buildRoute(definition).build([]).path;
  return Path.fromCurves(
    toVec(definition.start),
    definition.segments.map(([c1, c2, to]) => ({ c1: toVec(c1), c2: toVec(c2), to: toVec(to) })),
  );
}

/** Turns level data into what the engine needs. */
export function toLevelSetup(level: LevelDefinition): LevelSetup {
  const chain: ChainParams = {
    ballRadius: level.ballRadius ?? LEVEL_DEFAULTS.ballRadius,
    speed: level.speed,
    rushSpeed: level.rushSpeed ?? level.speed,
    rushDistance: level.rushDistance ?? 0,
    retreatSpeed: level.retreatSpeed ?? LEVEL_DEFAULTS.retreatSpeed,
    minMatch: LEVEL_DEFAULTS.minMatch,
    ...(level.compact ? { compact: true } : {}),
  };
  return {
    board: level.board,
    shooter: toVec(level.shooter),
    chains: level.chains.map(({ path, length, tones, repeatChance, palette, sequence, tail }) => ({
      path: buildPath(path),
      ...(path.kind === 'forked' ? { route: buildRoute(path) } : {}),
      ...(sequence ? { tones: sequence } : {}),
      ...(tail === undefined ? {} : { tail }),
      recipe: {
        length,
        tones,
        repeatChance,
        // Jewel world: mixed colours come in pairs.
        ...(palette ? { palette, paired: SECONDARIES } : {}),
      },
    })),
    chain,
    projectileSpeed: level.projectileSpeed ?? LEVEL_DEFAULTS.projectileSpeed,
    fireCooldown: level.fireCooldown ?? LEVEL_DEFAULTS.fireCooldown,
    ...(level.parTime === undefined ? {} : { parTime: level.parTime }),
    ...(level.colossus ? { colossus: level.colossus } : {}),
    ...(level.reflectors ? { reflectors: level.reflectors.map(toReflectorSetup) } : {}),
    ...(level.magnet ? { magnet: level.magnet } : {}),
    ...(level.alchemy ? { alchemy: true } : {}),
    ...(level.gravity
      ? {
          gravity: {
            centre: toVec(level.gravity.centre),
            strength: level.gravity.strength,
            horizon: level.gravity.horizon,
          },
        }
      : {}),
    ...(level.endless ? { endless: level.endless } : {}),
    ...(level.hazards ? { hazards: level.hazards } : {}),
    ...(level.scoreFactor === undefined ? {} : { scoreFactor: level.scoreFactor }),
    ...(level.puzzle ? { puzzle: level.puzzle } : {}),
    ...(level.rhythm ? { rhythm: level.rhythm } : {}),
    ...(level.duel
      ? {
          duel: {
            push: level.duel.push,
            minimum: level.duel.minimum,
            regrow: level.duel.regrow,
            growEvery: level.duel.growEvery,
            rival: {
              position: toVec(level.duel.rival.at),
              cadence: level.duel.rival.cadence,
              error: level.duel.rival.error,
              focus: level.duel.rival.focus,
            },
          },
        }
      : {}),
    ...(level.orbit
      ? {
          orbit: {
            centre: toVec(level.orbit.centre),
            radiusX: level.orbit.radius[0],
            radiusY: level.orbit.radius[1],
            speed: level.orbit.speed,
            start: level.orbit.start,
          },
        }
      : {}),
  };
}

function buildRoute(definition: Extract<PathDefinition, { kind: 'forked' }>): ForkedRoute {
  return new ForkedRoute(
    definition.parts.map((part): RoutePart =>
      part.kind === 'line'
        ? { kind: 'line', points: part.points.map(toVec) }
        : { kind: 'fork', short: part.short.map(toVec), long: part.long.map(toVec) },
    ),
  );
}

function toReflectorSetup(reflector: ReflectorDefinition): ReflectorSetup {
  if (reflector.kind === 'wall') {
    return { kind: 'wall', from: toVec(reflector.from), to: toVec(reflector.to) };
  }
  const { radius, sides, angle, spin } = reflector;
  return { kind: 'prism', centre: toVec(reflector.at), radius, sides, angle, spin };
}

/**
 * Points of an inward spiral around `centre`, from `outer` to `inner` radius,
 * over `turns` turns, starting at `startAngle` (radians, clockwise on screen).
 */
export function spiral(
  centre: Point,
  outer: number,
  inner: number,
  turns: number,
  startAngle: number,
): Point[] {
  const total = turns * Math.PI * 2;
  const count = Math.ceil(turns * 96);
  return Array.from({ length: count + 1 }, (_, i): Point => {
    const t = i / count;
    const angle = startAngle + t * total;
    const radius = outer + (inner - outer) * t;
    return [centre[0] + Math.cos(angle) * radius, centre[1] + Math.sin(angle) * radius];
  });
}
