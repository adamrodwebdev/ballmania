/**
 * Slow motion: the game runs at `scale` for `hold` real seconds, then eases
 * back to normal speed over `release` seconds. The simulation stays exact,
 * it only receives shorter frames.
 */
export class TimeWarp {
  private holdLeft = 0;
  private releaseLeft = 0;
  private releaseTime = 0;
  private scaleValue = 1;
  private target = 1;

  get scale(): number {
    return this.scaleValue;
  }

  /** Starts (or deepens) a slow motion. */
  trigger(scale: number, hold: number, release: number): void {
    if (this.holdLeft > 0 && scale > this.target) return;
    this.target = scale;
    this.holdLeft = Math.max(this.holdLeft, hold);
    this.releaseTime = release;
    this.releaseLeft = release;
  }

  /** Advances by a real duration and returns the game duration to simulate. */
  update(realDt: number): number {
    if (this.holdLeft > 0) {
      this.holdLeft -= realDt;
      this.scaleValue = this.target;
    } else if (this.releaseLeft > 0) {
      this.releaseLeft = Math.max(0, this.releaseLeft - realDt);
      const t = 1 - this.releaseLeft / this.releaseTime;
      this.scaleValue = this.target + (1 - this.target) * t * t;
    } else {
      this.scaleValue = 1;
      this.target = 1;
    }
    return realDt * this.scaleValue;
  }
}
