import type { Chain } from '../chain/Chain';
import type { PowerShot, PowerTarget } from './Powers';

/**
 * The powers at work in a game (v1.7): the rewind under way, the stasis
 * left, the shot a power has loaded. Powers act through it, the game updates
 * it every step.
 */
export class PowerEffects implements PowerTarget {
  private rewindLeft = 0;
  private rewindSpeed = 0;
  private slowLeft = 0;
  private shot: PowerShot | null = null;

  constructor(
    private readonly chains: readonly Chain[],
    readonly diameter: number,
  ) {}

  rewind(distance: number, speed: number): void {
    this.rewindLeft += distance;
    this.rewindSpeed = speed;
  }

  slow(factor: number, seconds: number): void {
    this.slowLeft = seconds;
    for (const chain of this.chains) chain.setPowerFactor(factor);
  }

  load(shot: PowerShot): void {
    this.shot = shot;
  }

  /** The shot a power has loaded, until it is fired. */
  get loaded(): PowerShot | null {
    return this.shot;
  }

  /** The loaded shot has been fired. */
  spend(): void {
    this.shot = null;
  }

  /** Seconds of stasis left; 0 when the chains run at their speed. */
  get slowRemaining(): number {
    return this.slowLeft;
  }

  /** True while the chains are being pulled back. */
  get rewinding(): boolean {
    return this.rewindLeft > 0;
  }

  update(dt: number): void {
    if (this.rewindLeft > 0) {
      const step = Math.min(this.rewindLeft, this.rewindSpeed * dt);
      for (const chain of this.chains) chain.shift(-step);
      this.rewindLeft -= step;
    }
    if (this.slowLeft > 0) {
      this.slowLeft = Math.max(0, this.slowLeft - dt);
      if (this.slowLeft === 0) for (const chain of this.chains) chain.setPowerFactor(1);
    }
  }
}
