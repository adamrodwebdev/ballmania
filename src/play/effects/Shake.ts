import { Vec2 } from '@/engine/geometry/Vec2';

/** How fast the trauma fades, per second. */
const DECAY = 2.2;

/**
 * Screen shake driven by "trauma": hits add trauma, which fades over time;
 * the offset grows with its square, so small hits stay subtle and big
 * chain reactions really rock the board.
 */
export class Shake {
  private trauma = 0;
  private time = 0;

  constructor(private amplitude: number) {}

  setAmplitude(amplitude: number): void {
    this.amplitude = amplitude;
    if (amplitude === 0) this.trauma = 0;
  }

  add(amount: number): void {
    if (this.amplitude > 0) this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - DECAY * dt);
  }

  /** Current offset of the board, in board units. */
  get offset(): Vec2 {
    if (this.trauma === 0) return Vec2.ZERO;
    const power = this.trauma * this.trauma * this.amplitude;
    // Two incommensurable sines: smooth, never repeating, no random state.
    return new Vec2(
      power * Math.sin(this.time * 61.3) * Math.cos(this.time * 17.1),
      power * Math.sin(this.time * 47.9 + 1.7),
    );
  }
}
