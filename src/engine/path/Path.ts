import { Vec2 } from '../geometry/Vec2';

/** One cubic Bézier curve continuing from the end of the previous one. */
export interface CubicSegment {
  readonly c1: Vec2;
  readonly c2: Vec2;
  readonly to: Vec2;
}

/** Number of straight pieces each Bézier curve is flattened into. */
const SAMPLES_PER_CURVE = 48;

/**
 * The track the chain follows, parameterised by arc length: `s` = 0 is the
 * entrance, `s` = `length` is the hole. Curves are flattened once into a
 * polyline with cumulative lengths, so every query is a binary search.
 */
export class Path {
  /** Cumulative arc length at each point; `lengths[0]` = 0. */
  private readonly lengths: readonly number[];
  readonly length: number;

  private constructor(private readonly points: readonly Vec2[]) {
    if (points.length < 2) throw new Error('A path needs at least two points');
    const lengths = [0];
    for (let i = 1; i < points.length; i++) {
      lengths.push(lengths[i - 1]! + points[i - 1]!.distanceTo(points[i]!));
    }
    this.lengths = lengths;
    this.length = lengths[lengths.length - 1]!;
    if (this.length <= 0) throw new Error('A path must have a positive length');
  }

  static fromPoints(points: readonly Vec2[]): Path {
    return new Path(points);
  }

  static fromCurves(start: Vec2, segments: readonly CubicSegment[]): Path {
    const points = [start];
    let from = start;
    for (const { c1, c2, to } of segments) {
      for (let i = 1; i <= SAMPLES_PER_CURVE; i++) {
        points.push(Path.bezier(from, c1, c2, to, i / SAMPLES_PER_CURVE));
      }
      from = to;
    }
    return new Path(points);
  }

  get start(): Vec2 {
    return this.points[0]!;
  }

  get end(): Vec2 {
    return this.points[this.points.length - 1]!;
  }

  /** Point at arc length `s`; beyond either end the path is extended in a straight line. */
  pointAt(s: number): Vec2 {
    const index = this.segmentIndex(s);
    const a = this.points[index]!;
    const b = this.points[index + 1]!;
    const from = this.lengths[index]!;
    const span = this.lengths[index + 1]! - from;
    return a.lerp(b, span === 0 ? 0 : (s - from) / span);
  }

  /** Unit direction of travel at arc length `s`. */
  tangentAt(s: number): Vec2 {
    const index = this.segmentIndex(s);
    return this.points[index + 1]!.sub(this.points[index]!).normalize();
  }

  /** Evenly spaced points, for drawing the track. */
  sample(step: number): Vec2[] {
    const count = Math.max(1, Math.ceil(this.length / step));
    return Array.from({ length: count + 1 }, (_, i) => this.pointAt((i / count) * this.length));
  }

  /** Index of the polyline piece containing `s`, clamped to the first and last pieces. */
  private segmentIndex(s: number): number {
    let low = 0;
    let high = this.lengths.length - 2;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.lengths[middle]! <= s) low = middle;
      else high = middle - 1;
    }
    return low;
  }

  private static bezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return new Vec2(
      a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    );
  }
}
