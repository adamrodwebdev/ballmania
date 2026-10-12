import type { Tone } from '../chain/Ball';
import type { Vec2 } from '../geometry/Vec2';

/** What the outside world may read of a ball in flight. */
export interface ProjectileView {
  readonly id: number;
  readonly tone: Tone;
  readonly position: Vec2;
}

/** A ball in flight, from the shooter to the chain or out of the board. */
export class Projectile implements ProjectileView {
  private positionValue: Vec2;

  constructor(
    readonly id: number,
    readonly tone: Tone,
    origin: Vec2,
    readonly velocity: Vec2,
  ) {
    this.positionValue = origin;
  }

  get position(): Vec2 {
    return this.positionValue;
  }

  move(dt: number): void {
    this.positionValue = this.positionValue.add(this.velocity.scale(dt));
  }
}
