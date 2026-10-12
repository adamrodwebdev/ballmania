/** Frame time above which effects are considered too heavy (about 40 fps). */
const SLOW_FRAME = 1 / 40;
/** Seconds of slow frames before the effects are lowered. */
const PATIENCE = 2;
/** Seconds ignored after a change, while the browser settles. */
const GRACE = 1.5;

/**
 * Watches the frame rate and says when the effects should be lowered
 * (specification § 3.5: automatic switch when the frame rate drops).
 */
export class FrameMonitor {
  private average = 1 / 60;
  private slowFor = 0;
  private grace = GRACE;

  /** Records a real frame duration; true when it is time to lower the effects. */
  record(dt: number): boolean {
    if (this.grace > 0) {
      this.grace -= dt;
      return false;
    }
    this.average += (dt - this.average) * 0.1;
    this.slowFor = this.average > SLOW_FRAME ? this.slowFor + dt : 0;
    if (this.slowFor < PATIENCE) return false;
    this.reset();
    return true;
  }

  reset(): void {
    this.average = 1 / 60;
    this.slowFor = 0;
    this.grace = GRACE;
  }
}
