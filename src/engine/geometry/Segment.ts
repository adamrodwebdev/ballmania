import { Vec2 } from './Vec2';

/** Immutable line segment between two points. */
export class Segment {
  constructor(
    readonly a: Vec2,
    readonly b: Vec2,
  ) {}

  /** The point of the segment closest to `point`. */
  closestPoint(point: Vec2): Vec2 {
    const ab = this.b.sub(this.a);
    const lengthSquared = ab.dot(ab);
    if (lengthSquared === 0) return this.a;
    const t = Math.min(1, Math.max(0, point.sub(this.a).dot(ab) / lengthSquared));
    return this.a.add(ab.scale(t));
  }

  distanceTo(point: Vec2): number {
    return this.closestPoint(point).distanceTo(point);
  }

  /** Unit vector perpendicular to the segment (one of the two sides). */
  normal(): Vec2 {
    const direction = this.b.sub(this.a).normalize();
    return new Vec2(-direction.y, direction.x);
  }
}
