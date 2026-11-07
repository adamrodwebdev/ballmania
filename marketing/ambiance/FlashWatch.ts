/**
 * The flash check of the picture (specification § 3.18): whatever the
 * effects, the luminance of the frame, and of each zone of it, never moves
 * by more than 10 % of full scale within one second. Fed with a sample every
 * 0.2 s; pure.
 */

export const FLASH_LIMIT = 0.1;
const WINDOW = 1;

interface Sample {
  readonly at: number;
  readonly mean: number;
  readonly cells: ArrayLike<number>;
}

export interface FlashReport {
  readonly samples: number;
  /** The largest change of the whole frame's luminance within a second (0 to 1). */
  readonly frame: number;
  /** The largest change of a zone's luminance within a second. */
  readonly zone: number;
  /** When the largest change ended, in seconds. */
  readonly at: number;
}

export class FlashWatch {
  private readonly recent: Sample[] = [];
  private count = 0;
  private frame = 0;
  private zone = 0;
  private worstAt = 0;

  push(at: number, mean: number, cells: ArrayLike<number>): void {
    while (this.recent.length && at - this.recent[0]!.at > WINDOW + 1e-9) this.recent.shift();
    for (const before of this.recent) {
      const frameChange = Math.abs(mean - before.mean);
      let zoneChange = 0;
      for (let i = 0; i < cells.length; i++) {
        zoneChange = Math.max(zoneChange, Math.abs(cells[i]! - before.cells[i]!));
      }
      if (Math.max(frameChange, zoneChange) > Math.max(this.frame, this.zone)) this.worstAt = at;
      this.frame = Math.max(this.frame, frameChange);
      this.zone = Math.max(this.zone, zoneChange);
    }
    this.recent.push({ at, mean, cells: Array.from(cells) });
    this.count++;
  }

  /** Starts afresh (a new video, or a cut that is not a change of the picture). */
  reset(): void {
    this.recent.length = 0;
  }

  report(): FlashReport {
    return { samples: this.count, frame: this.frame, zone: this.zone, at: this.worstAt };
  }
}
