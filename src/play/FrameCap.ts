/** Frames a second drawn on a touch screen (v1.7.6). */
export const TOUCH_FRAME_RATE = 60;

/**
 * Lets through at most `rate` animation frames a second, whatever the screen's
 * refresh rate (v1.7.6). Phones and tablets refresh up to 120 times a second;
 * drawing every one of those frames only heats them and drains their battery
 * (Playgama asks for 60). The admitted frames keep a steady cadence: on a 90 Hz
 * screen, two frames out of three; on a 120 Hz one, every other frame.
 */
export class FrameCap {
  private readonly interval: number;
  /** When the next frame is due, in milliseconds. */
  private next = -Infinity;

  constructor(rate: number) {
    this.interval = 1000 / rate;
  }

  /** No cap: every frame is drawn. */
  static none(): FrameCap {
    return new FrameCap(Infinity);
  }

  /** True if the frame starting at `now` (milliseconds) is drawn. */
  admits(now: number): boolean {
    // A frame a little early still counts: frame times jitter by a fraction of a millisecond.
    if (now < this.next - this.interval / 8) return false;
    // Keep the cadence; after a pause (a hidden tab, a long task), start again from now.
    this.next = now - this.next > this.interval ? now + this.interval : this.next + this.interval;
    return true;
  }
}
