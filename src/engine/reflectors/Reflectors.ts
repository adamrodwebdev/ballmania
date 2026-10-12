import { Segment } from '../geometry/Segment';
import { Vec2 } from '../geometry/Vec2';

/** Reflectors as data, in board units: the level setup carries these. */
export type ReflectorSetup =
  | { readonly kind: 'wall'; readonly from: Vec2; readonly to: Vec2 }
  | {
      readonly kind: 'prism';
      readonly centre: Vec2;
      /** Distance from the centre to each corner. */
      readonly radius: number;
      readonly sides: number;
      /** Starting rotation, in radians. */
      readonly angle: number;
      /** Rotation speed, in radians per second (0 = still). */
      readonly spin: number;
    };

/** Something shots bounce off (specification § 3.2, Neon world: ricochet). */
export interface Reflector {
  readonly kind: 'wall' | 'prism';
  readonly segments: readonly Segment[];
  update(dt: number): void;
}

export class Wall implements Reflector {
  readonly kind = 'wall';
  readonly segments: readonly Segment[];

  constructor(from: Vec2, to: Vec2) {
    this.segments = [new Segment(from, to)];
  }

  update(): void {}
}

/** A regular polygon of mirrors, possibly turning. */
export class Prism implements Reflector {
  readonly kind = 'prism';
  private angleValue: number;
  private edges: Segment[] = [];

  constructor(
    readonly centre: Vec2,
    readonly radius: number,
    readonly sides: number,
    angle: number,
    readonly spin: number,
  ) {
    this.angleValue = angle;
    this.build();
  }

  get angle(): number {
    return this.angleValue;
  }

  get segments(): readonly Segment[] {
    return this.edges;
  }

  get corners(): Vec2[] {
    return Array.from({ length: this.sides }, (_, i) =>
      this.centre.add(
        Vec2.fromAngle(this.angleValue + (i / this.sides) * Math.PI * 2, this.radius),
      ),
    );
  }

  update(dt: number): void {
    if (this.spin === 0) return;
    this.angleValue += this.spin * dt;
    this.build();
  }

  private build(): void {
    const corners = this.corners;
    this.edges = corners.map(
      (corner, i) => new Segment(corner, corners[(i + 1) % corners.length]!),
    );
  }
}

/** Where a moving circle meets a reflector, and how it leaves. */
export interface Bounce {
  readonly position: Vec2;
  readonly velocity: Vec2;
}

/**
 * Every reflector of a level. Projectiles and the aim line use the same
 * `bounce`, so the line always shows where the ball will really go.
 */
export class Reflectors {
  readonly items: readonly Reflector[];

  constructor(setups: readonly ReflectorSetup[]) {
    this.items = setups.map((setup) =>
      setup.kind === 'wall'
        ? new Wall(setup.from, setup.to)
        : new Prism(setup.centre, setup.radius, setup.sides, setup.angle, setup.spin),
    );
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  update(dt: number): void {
    for (const item of this.items) item.update(dt);
  }

  /**
   * If a circle of `radius` at `position`, moving at `velocity`, touches a
   * mirror it is heading into, returns it pushed out of the mirror with the
   * velocity reflected; otherwise null.
   */
  bounce(position: Vec2, velocity: Vec2, radius: number): Bounce | null {
    for (const item of this.items) {
      for (const segment of item.segments) {
        const closest = segment.closestPoint(position);
        const distance = closest.distanceTo(position);
        if (distance >= radius) continue;
        const normal =
          distance > 1e-9 ? position.sub(closest).scale(1 / distance) : segment.normal();
        const towards = velocity.dot(normal);
        if (towards >= 0) continue;
        return {
          position: closest.add(normal.scale(radius)),
          velocity: velocity.sub(normal.scale(2 * towards)),
        };
      }
    }
    return null;
  }
}
