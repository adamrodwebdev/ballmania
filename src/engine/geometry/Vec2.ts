/** Immutable 2D vector, in board units (y grows downwards, like the screen). */
export class Vec2 {
  static readonly ZERO = new Vec2(0, 0);

  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  static fromAngle(radians: number, length = 1): Vec2 {
    return new Vec2(Math.cos(radians) * length, Math.sin(radians) * length);
  }

  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  scale(factor: number): Vec2 {
    return new Vec2(this.x * factor, this.y * factor);
  }

  dot(other: Vec2): number {
    return this.x * other.x + this.y * other.y;
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  distanceTo(other: Vec2): number {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  normalize(): Vec2 {
    const length = this.length();
    return length === 0 ? Vec2.ZERO : this.scale(1 / length);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** Linear interpolation: `t` = 0 gives this vector, 1 gives `other`. */
  lerp(other: Vec2, t: number): Vec2 {
    return new Vec2(this.x + (other.x - this.x) * t, this.y + (other.y - this.y) * t);
  }
}
