import type { Point } from './LevelDefinition';

/** The two board shapes: square for landscape screens, tall for phones held upright. */
export type FrameKind = 'square' | 'portrait';

export interface Frame {
  readonly kind: FrameKind;
  readonly width: number;
  readonly height: number;
}

export const FRAMES: Record<FrameKind, Frame> = {
  square: { kind: 'square', width: 1000, height: 1000 },
  portrait: { kind: 'portrait', width: 1000, height: 1400 },
};

/** Screens at least this much taller than wide get the portrait board. */
export const PORTRAIT_RATIO = 1.2;

export function frameFor(width: number, height: number): Frame {
  return height / Math.max(1, width) >= PORTRAIT_RATIO ? FRAMES.portrait : FRAMES.square;
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
    }
  | {
      readonly kind: 'serpentine';
      readonly rows: number;
    };

export interface Track {
  readonly paths: readonly Point[][];
  readonly shooter: Point;
}

/** How far outside the board the entrance tunnel starts. */
const TUNNEL = 70;

export function buildTrack(recipe: TrackRecipe, frame: Frame): Track {
  return recipe.kind === 'spiral' ? spiralTrack(recipe, frame) : serpentineTrack(recipe, frame);
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
    return [entrance(points[0]!, frame), ...points];
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
  const points: Point[] = [[-TUNNEL, top]];
  for (let row = 0; row < recipe.rows; row++) {
    const y = top + row * gap;
    const rightwards = row % 2 === 0;
    const last = row === recipe.rows - 1;
    const to = rightwards ? frame.width - margin - turn : margin + turn;
    // The last row stops short of the far side: the hole sits there.
    const end = last ? (rightwards ? frame.width * 0.68 : frame.width * 0.32) : to;
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
  return { paths: [points], shooter: [frame.width / 2, frame.height - 170] };
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
