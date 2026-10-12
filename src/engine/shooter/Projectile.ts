import type { Tone } from '../chain/Ball';
import type { Vec2 } from '../geometry/Vec2';
import type { Side } from '../objectives/Objective';

/** What the outside world may read of a ball in flight. */
export interface ProjectileView {
  readonly id: number;
  readonly tone: Tone;
  readonly position: Vec2;
  /** Mirrors it has bounced off so far. */
  readonly bounces: number;
  /** Who fired it: the player, or the rival of a duel. */
  readonly by: Side;
}

/** A ball in flight, from the shooter to the chain or out of the board. */
export class Projectile implements ProjectileView {
  private positionValue: Vec2;
  private velocityValue: Vec2;
  private bouncesValue = 0;
  private ageValue = 0;
  /** Direction it was fired in, to measure how far gravity bent it. */
  readonly launch: Vec2;

  constructor(
    readonly id: number,
    readonly tone: Tone,
    origin: Vec2,
    velocity: Vec2,
    readonly by: Side = 'player',
  ) {
    this.positionValue = origin;
    this.velocityValue = velocity;
    this.launch = velocity.normalize();
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

  /** Seconds in flight. */
  get age(): number {
    return this.ageValue;
  }

  /** Angle between the direction it was fired in and its direction now, in radians. */
  get deflection(): number {
    const now = this.velocityValue.normalize();
    return Math.acos(Math.min(1, Math.max(-1, now.dot(this.launch))));
  }

  move(dt: number): void {
    this.positionValue = this.positionValue.add(this.velocityValue.scale(dt));
    this.ageValue += dt;
  }

  /** Bends its course (Singularity world: the black hole's pull). */
  accelerate(acceleration: Vec2, dt: number): void {
    this.velocityValue = this.velocityValue.add(acceleration.scale(dt));
  }

  /** Bounces off a mirror: new position and direction, one more rebound. */
  bounce(position: Vec2, velocity: Vec2): void {
    this.positionValue = position;
    this.velocityValue = velocity;
    this.bouncesValue++;
  }
}
