import { Vec2 } from '../geometry/Vec2';

export interface OrbitSetup {
  /** Centre of the ring, in board units. */
  readonly centre: Vec2;
  /** Half-axes of the ring (an ellipse on a tall board). */
  readonly radiusX: number;
  readonly radiusY: number;
  /** Radians per second; negative to turn anticlockwise on screen. */
  readonly speed: number;
  /** Starting angle, in radians (π/2 = bottom of the board). */
  readonly start: number;
}

/**
 * The ring the shooter glides along (Singularity world): it turns at a steady
 * speed, so the player picks the moment as much as the angle.
 */
export class Orbit {
  private angleValue: number;

  constructor(readonly setup: OrbitSetup) {
    this.angleValue = setup.start;
  }

  get angle(): number {
    return this.angleValue;
  }

  get position(): Vec2 {
    const { centre, radiusX, radiusY } = this.setup;
    return new Vec2(
      centre.x + Math.cos(this.angleValue) * radiusX,
      centre.y + Math.sin(this.angleValue) * radiusY,
    );
  }

  advance(dt: number): void {
    this.angleValue = (this.angleValue + this.setup.speed * dt) % (Math.PI * 2);
  }
}
