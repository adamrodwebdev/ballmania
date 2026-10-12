import type { RandomSource } from '../core/Random';
import type { Tone } from '../chain/Ball';
import { Vec2 } from '../geometry/Vec2';
import { Projectile } from './Projectile';

/**
 * The launcher: where it stands, where it aims, the ball loaded and the next
 * one. Colours are drawn among those still on the track.
 */
export class Shooter {
  private angleValue = -Math.PI / 2;
  private currentTone: Tone;
  private nextTone: Tone;
  private cooldownLeft = 0;
  private shots = 0;

  constructor(
    readonly position: Vec2,
    private readonly random: RandomSource,
    private readonly projectileSpeed: number,
    private readonly cooldown: number,
    available: readonly Tone[],
  ) {
    if (available.length === 0) throw new RangeError('The shooter needs at least one colour');
    this.currentTone = this.draw(available);
    this.nextTone = this.draw(available);
  }

  get angle(): number {
    return this.angleValue;
  }

  get current(): Tone {
    return this.currentTone;
  }

  get next(): Tone {
    return this.nextTone;
  }

  get ready(): boolean {
    return this.cooldownLeft <= 0;
  }

  aimAt(target: Vec2): void {
    if (target.distanceTo(this.position) > 0) this.angleValue = target.sub(this.position).angle();
  }

  aim(angle: number): void {
    this.angleValue = angle;
  }

  swap(): void {
    [this.currentTone, this.nextTone] = [this.nextTone, this.currentTone];
  }

  tick(dt: number): void {
    this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
  }

  /** Launches the loaded ball, or returns null while reloading. */
  fire(available: readonly Tone[]): Projectile | null {
    if (!this.ready) return null;
    const projectile = new Projectile(
      ++this.shots,
      this.currentTone,
      this.position,
      Vec2.fromAngle(this.angleValue, this.projectileSpeed),
    );
    this.currentTone = this.nextTone;
    this.nextTone = this.draw(available);
    this.cooldownLeft = this.cooldown;
    return projectile;
  }

  /** Replaces loaded colours that have left the track. */
  refresh(available: readonly Tone[]): void {
    if (available.length === 0) return;
    if (!available.includes(this.currentTone)) this.currentTone = this.draw(available);
    if (!available.includes(this.nextTone)) this.nextTone = this.draw(available);
  }

  private draw(available: readonly Tone[]): Tone {
    if (available.length === 0) return this.currentTone;
    return available[this.random.nextInt(available.length)]!;
  }
}
