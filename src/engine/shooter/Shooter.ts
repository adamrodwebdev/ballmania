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
  /** A ball pulled out of the chain keeps its colour, even if that colour left the track. */
  private pinned: 'current' | 'next' | null = null;
  private positionValue: Vec2;
  /** The point aimed at with `aimAt`, kept so a moving shooter keeps aiming at it. */
  private target: Vec2 | null = null;

  constructor(
    position: Vec2,
    private readonly random: RandomSource,
    private readonly projectileSpeed: number,
    private readonly cooldown: number,
    available: readonly Tone[],
  ) {
    if (available.length === 0) throw new RangeError('The shooter needs at least one colour');
    this.positionValue = position;
    this.currentTone = this.draw(available);
    this.nextTone = this.draw(available);
  }

  get position(): Vec2 {
    return this.positionValue;
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
    this.target = target;
    if (target.distanceTo(this.position) > 0) this.angleValue = target.sub(this.position).angle();
  }

  aim(angle: number): void {
    this.target = null;
    this.angleValue = angle;
  }

  /** Moves the shooter (Singularity world: it glides along its ring), still aiming at its target. */
  moveTo(position: Vec2): void {
    this.positionValue = position;
    if (this.target) this.aimAt(this.target);
  }

  swap(): void {
    [this.currentTone, this.nextTone] = [this.nextTone, this.currentTone];
    if (this.pinned) this.pinned = this.pinned === 'current' ? 'next' : 'current';
  }

  /**
   * Loads a ball pulled out of the chain (Abyss world, magnet): it becomes the
   * loaded ball, the loaded one becomes the next, the next one is dropped.
   */
  load(tone: Tone): void {
    this.nextTone = this.currentTone;
    this.currentTone = tone;
    this.pinned = 'current';
    this.cooldownLeft = this.cooldown;
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
    this.pinned = this.pinned === 'next' ? 'current' : null;
    this.cooldownLeft = this.cooldown;
    return projectile;
  }

  /** Replaces loaded colours that have left the track. */
  refresh(available: readonly Tone[]): void {
    if (available.length === 0) return;
    if (this.pinned !== 'current' && !available.includes(this.currentTone)) {
      this.currentTone = this.draw(available);
    }
    if (this.pinned !== 'next' && !available.includes(this.nextTone)) {
      this.nextTone = this.draw(available);
    }
  }

  private draw(available: readonly Tone[]): Tone {
    if (available.length === 0) return this.currentTone;
    return available[this.random.nextInt(available.length)]!;
  }
}
