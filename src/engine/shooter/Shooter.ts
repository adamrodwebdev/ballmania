import type { RandomSource } from '../core/Random';
import type { Tone } from '../chain/Ball';
import { Vec2 } from '../geometry/Vec2';
import type { Side } from '../objectives/Objective';
import { Projectile, type ProjectileSpecial } from './Projectile';

export interface ShooterOptions {
  /**
   * The player picks the colour (Puzzle): "swap" goes to the next colour on
   * the track, and the loaded colour stays loaded after a shot.
   */
  readonly choosing?: boolean;
  /** Whose shooter it is; its projectiles carry it. */
  readonly side?: Side;
  /** The first colours dealt, in order, while they are on the track (level 1-1's showcase). */
  readonly opening?: readonly Tone[];
}

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
  /** Colours still to deal before chance takes over. */
  private readonly opening: Tone[];

  constructor(
    position: Vec2,
    private readonly random: RandomSource,
    private readonly projectileSpeed: number,
    private readonly cooldown: number,
    available: readonly Tone[],
    private readonly options: ShooterOptions = {},
  ) {
    if (available.length === 0) throw new RangeError('The shooter needs at least one colour');
    this.opening = [...(options.opening ?? [])];
    this.positionValue = position;
    if (options.choosing) {
      this.currentTone = available[0]!;
      this.nextTone = Shooter.following(this.currentTone, available);
    } else {
      this.currentTone = this.draw(available);
      this.nextTone = this.draw(available);
    }
  }

  /** The colour after `tone` among those available, in order, wrapping around. */
  private static following(tone: Tone, available: readonly Tone[]): Tone {
    const index = available.indexOf(tone);
    return available[(index + 1) % available.length] ?? tone;
  }

  get side(): Side {
    return this.options.side ?? 'player';
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

  /** Swaps the loaded and next balls; when choosing, loads the next colour on the track. */
  swap(available: readonly Tone[] = []): void {
    if (this.options.choosing && available.length > 0) {
      this.currentTone = Shooter.following(this.currentTone, available);
      this.nextTone = Shooter.following(this.currentTone, available);
      return;
    }
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

  /**
   * Launches the loaded ball, or returns null while reloading; a powered shot
   * flies `power` times faster.
   */
  fire(
    available: readonly Tone[],
    power = 1,
    special: ProjectileSpecial = null,
  ): Projectile | null {
    if (!this.ready) return null;
    // The rival's shots count down, so no two projectiles share an id.
    const id = this.side === 'rival' ? -++this.shots : ++this.shots;
    const projectile = new Projectile(
      id,
      this.currentTone,
      this.position,
      Vec2.fromAngle(this.angleValue, this.projectileSpeed * power),
      this.side,
      power > 1,
      special,
    );
    this.cooldownLeft = this.cooldown;
    if (this.options.choosing) {
      this.refresh(available);
      return projectile;
    }
    this.currentTone = this.nextTone;
    this.nextTone = this.draw(available);
    this.pinned = this.pinned === 'next' ? 'current' : null;
    return projectile;
  }

  /** Replaces loaded colours that have left the track. */
  refresh(available: readonly Tone[]): void {
    if (available.length === 0) return;
    if (this.options.choosing) {
      if (!available.includes(this.currentTone)) this.currentTone = available[0]!;
      this.nextTone = Shooter.following(this.currentTone, available);
      return;
    }
    if (this.pinned !== 'current' && !available.includes(this.currentTone)) {
      this.currentTone = this.draw(available);
    }
    if (this.pinned !== 'next' && !available.includes(this.nextTone)) {
      this.nextTone = this.draw(available);
    }
  }

  private draw(available: readonly Tone[]): Tone {
    if (available.length === 0) return this.currentTone;
    const dealt = this.opening.shift();
    if (dealt !== undefined && available.includes(dealt)) return dealt;
    return available[this.random.nextInt(available.length)]!;
  }
}
