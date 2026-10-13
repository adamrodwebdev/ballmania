import type { Point } from './LevelDefinition';

/**
 * The three board shapes: wide for large landscape screens, square in
 * between, tall for phones held upright.
 */
export type FrameKind = 'square' | 'portrait' | 'landscape';

export interface Frame {
  readonly kind: FrameKind;
  readonly width: number;
  readonly height: number;
}

export const FRAMES: Record<FrameKind, Frame> = {
  square: { kind: 'square', width: 1000, height: 1000 },
  portrait: { kind: 'portrait', width: 1000, height: 1400 },
  landscape: { kind: 'landscape', width: 1400, height: 1000 },
};

/** Screens at least this much taller than wide get the portrait board. */
export const PORTRAIT_RATIO = 1.2;

/** Screens at least this much wider than tall get the wide board. */
export const LANDSCAPE_RATIO = 1.25;

export function frameFor(width: number, height: number): Frame {
  if (height / Math.max(1, width) >= PORTRAIT_RATIO) return FRAMES.portrait;
  if (width / Math.max(1, height) >= LANDSCAPE_RATIO) return FRAMES.landscape;
  return FRAMES.square;
}

/**
 * A track described by intent rather than coordinates, so that one level fits
 * both board shapes (specification § 3.2). Sizes are fractions of the board.
 */
export type TrackRecipe =
  | {
      readonly kind: 'spiral';
      readonly turns: number;
      /** Start and end distances from the centre, as fractions of the half-board. */
      readonly outer: number;
      readonly inner: number;
      /** Angle of the first point, in turns (0 = right, 0.75 = top). */
      readonly start: number;
      readonly clockwise: boolean;
      /** 1 = ellipse; higher values give a rounded rectangle. */
      readonly squareness?: number;
      /** Number of interleaved chains (2 = double spiral). */
      readonly arms?: number;
      /**
       * Balls come out of a portal on the board instead of an entrance
       * tunnel (Singularity world: the tunnel would cross the shooter's ring).
       */
      readonly portal?: boolean;
    }
  | {
      /**
       * Two entrances, two exits (§ 3.9): a chain snakes down each side of the
       * board towards its own hole, near the middle; the shooter stands between.
       */
      readonly kind: 'twin';
    }
  | {
      readonly kind: 'serpentine';
      readonly rows: number;
      /** Rows (not the last one) whose middle splits into a shortcut and a detour (Volcano world). */
      readonly forks?: readonly number[];
    };

/** A piece of a track with switches: a line, or a fork with its two branches. */
export type TrackPart =
  | { readonly kind: 'line'; readonly points: readonly Point[] }
  | { readonly kind: 'fork'; readonly short: readonly Point[]; readonly long: readonly Point[] };

export interface Track {
  /** Each chain's track; with forks, the version that takes every shortcut. */
  readonly paths: readonly Point[][];
  readonly shooter: Point;
  /** Each chain's track as lines and forks, when it has switches. */
  readonly routes?: readonly (readonly TrackPart[])[];
}

/** How far outside the board the entrance tunnel starts. */
const TUNNEL = 70;

export function buildTrack(recipe: TrackRecipe, frame: Frame): Track {
  if (recipe.kind === 'spiral') return spiralTrack(recipe, frame);
  if (recipe.kind === 'twin') return twinTrack(frame);
  return serpentineTrack(recipe, frame);
}

/**
 * Two mirrored serpentines, one on each half of the board, each ending in
 * its own hole on either side of the middle, below the shooter.
 */
function twinTrack(frame: Frame): Track {
  const top = 110;
  const span = frame.height * 0.62 - top;
  // An odd number of rows, about 125 units apart: the last one runs towards the middle.
  const rows = 2 * Math.max(1, Math.floor(span / 250)) + 1;
  const gap = span / (rows - 1);
  const turn = gap / 2;
  const middle = frame.width / 2;
  const outer = 70 + turn;
  const inner = middle - 130 - turn;
  const last = top + (rows - 1) * gap;
  const hole: Point = [middle - 70, last + 150];
  const left: Point[] = [[-TUNNEL, top]];
  for (let row = 0; row < rows; row++) {
    const y = top + row * gap;
    const inwards = row % 2 === 0;
    left.push([inwards ? inner : outer, y]);
    if (row === rows - 1) break;
    for (let k = 1; k <= 24; k++) {
      const a = -Math.PI / 2 + (k / 24) * Math.PI;
      const x = inwards ? inner + Math.cos(a) * turn : outer - Math.cos(a) * turn;
      left.push([x, y + turn + Math.sin(a) * turn]);
    }
  }
  // A smooth bend from the last row down into the hole.
  const [ex, ey] = left[left.length - 1]!;
  for (let k = 1; k <= 16; k++) {
    const t = k / 16;
    left.push([ex + (hole[0] - ex) * Math.sin((t * Math.PI) / 2), ey + (hole[1] - ey) * t * t]);
  }
  const right = left.map(([x, y]): Point => [frame.width - x, y]);
  return { paths: [left, right], shooter: [middle, (top + last) / 2] };
}

const signedPower = (value: number, power: number) => Math.sign(value) * Math.abs(value) ** power;

function spiralTrack(recipe: Extract<TrackRecipe, { kind: 'spiral' }>, frame: Frame): Track {
  const cx = frame.width / 2;
  const cy = frame.height / 2;
  const arms = recipe.arms ?? 1;
  const power = 1 / (recipe.squareness ?? 1);
  const direction = recipe.clockwise ? 1 : -1;
  const steps = Math.ceil(recipe.turns * 120);
  const paths = Array.from({ length: arms }, (_, arm) => {
    const start = (recipe.start + arm / arms) * Math.PI * 2;
    const points = Array.from({ length: steps + 1 }, (_, i): Point => {
      const t = i / steps;
      const angle = start + direction * t * recipe.turns * Math.PI * 2;
      const radius = recipe.outer + (recipe.inner - recipe.outer) * t;
      return [
        cx + signedPower(Math.cos(angle), power) * radius * cx,
        cy + signedPower(Math.sin(angle), power) * radius * cy,
      ];
    });
    return recipe.portal ? points : [entrance(points[0]!, frame), ...points];
  });
  return { paths, shooter: [cx, cy] };
}

/** Rows sweeping left and right across the top of the board; the shooter stands below. */
function serpentineTrack(
  recipe: Extract<TrackRecipe, { kind: 'serpentine' }>,
  frame: Frame,
): Track {
  const margin = 90;
  const top = 110;
  const gap = Math.min(300, (frame.height * 0.62 - top) / Math.max(1, recipe.rows - 1));
  const turn = gap / 2;
  const forks = new Set(recipe.forks ?? []);
  const parts: TrackPart[] = [];
  let points: Point[] = [[-TUNNEL, top]];
  // The detour dips towards the shooter, clear of the next row.
  const depth = Math.min(120, gap - 75);
  for (let row = 0; row < recipe.rows; row++) {
    const y = top + row * gap;
    const rightwards = row % 2 === 0;
    const last = row === recipe.rows - 1;
    const to = rightwards ? frame.width - margin - turn : margin + turn;
    // The last row stops short of the far side: the hole sits there.
    const end = last ? (rightwards ? frame.width * 0.68 : frame.width * 0.32) : to;
    if (forks.has(row) && !last) {
      const start = row === 0 ? margin : rightwards ? margin + turn : frame.width - margin - turn;
      const a = start + (end - start) * 0.3;
      const b = start + (end - start) * 0.7;
      points.push([a, y]);
      parts.push({ kind: 'line', points });
      const long: Point[] = Array.from({ length: 33 }, (_, k): Point => {
        const phi = (k / 32) * Math.PI;
        return [a + ((b - a) * (1 - Math.cos(phi))) / 2, y + depth * Math.sin(phi)];
      });
      parts.push({
        kind: 'fork',
        short: [
          [a, y],
          [b, y],
        ],
        long,
      });
      points = [[b, y]];
    }
    // Each row starts where the previous half circle ended.
    points.push([end, y]);
    if (last) break;
    // Half circle down to the next row.
    for (let k = 1; k <= 24; k++) {
      const a = -Math.PI / 2 + (k / 24) * Math.PI;
      const x = rightwards ? to + Math.cos(a) * turn : to - Math.cos(a) * turn;
      points.push([x, y + turn + Math.sin(a) * turn]);
    }
  }
  parts.push({ kind: 'line', points });
  const shooter: Point = [frame.width / 2, frame.height - 170];
  if (forks.size === 0) return { paths: [points], shooter };
  const shortcut = parts.flatMap((part) => (part.kind === 'line' ? part.points : part.short));
  return { paths: [shortcut], shooter, routes: [parts] };
}

/** A straight tunnel from outside the nearest edge to the first point of the track. */
function entrance([x, y]: Point, frame: Frame): Point {
  const distances = [x, frame.width - x, y, frame.height - y];
  const nearest = distances.indexOf(Math.min(...distances));
  if (nearest === 0) return [-TUNNEL, y];
  if (nearest === 1) return [frame.width + TUNNEL, y];
  if (nearest === 2) return [x, -TUNNEL];
  return [x, frame.height + TUNNEL];
}
