import type { ChainParams } from '@/engine/chain/Chain';
import type { LevelSetup } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Path } from '@/engine/path/Path';

export type Point = readonly [x: number, y: number];

/** A track, as data: a polyline, or cubic Bézier curves (c1, c2, to) from a start point. */
export type PathDefinition =
  | { readonly kind: 'points'; readonly points: readonly Point[] }
  | {
      readonly kind: 'curves';
      readonly start: Point;
      readonly segments: readonly (readonly [c1: Point, c2: Point, to: Point])[];
    };

export interface ChainDefinition {
  readonly path: PathDefinition;
  readonly length: number;
  readonly tones: number;
  readonly repeatChance: number;
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
  };
  return {
    board: level.board,
    shooter: toVec(level.shooter),
    chains: level.chains.map(({ path, length, tones, repeatChance }) => ({
      path: buildPath(path),
      recipe: { length, tones, repeatChance },
    })),
    chain,
    projectileSpeed: level.projectileSpeed ?? LEVEL_DEFAULTS.projectileSpeed,
    fireCooldown: level.fireCooldown ?? LEVEL_DEFAULTS.fireCooldown,
  };
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
