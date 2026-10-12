import type { Tone } from '../chain/Ball';
import type { Vec2 } from '../geometry/Vec2';

/** What the outside world may read of a ball in flight. */
export interface ProjectileView {
  readonly id: number;
  readonly tone: Tone;
  readonly position: Vec2;
  /** Mirrors it has bounced off so far. */
  readonly bounces: number;
}

/** A ball in flight, from the shooter to the chain or out of the board. */
export class Projectile implements ProjectileView {
  private positionValue: Vec2;
  private velocityValue: Vec2;
  private bouncesValue = 0;

  constructor(
    readonly id: number,
    readonly tone: Tone,
    origin: Vec2,
    velocity: Vec2,
  ) {
    this.positionValue = origin;
    this.velocityValue = velocity;
  }

  get position(): Vec2 {
    return this.positionValue;
  }

  get velocity(): Vec2 {
    return this.velocityValue;
  }

  get bounces(): number {
    return this.bouncesValue;
  }

  move(dt: number): void {
    this.positionValue = this.positionValue.add(this.velocityValue.scale(dt));
  }

  /** Bounces off a mirror: new position and direction, one more rebound. */
  bounce(position: Vec2, velocity: Vec2): void {
    this.positionValue = position;
    this.velocityValue = velocity;
    this.bouncesValue++;
  }
}
