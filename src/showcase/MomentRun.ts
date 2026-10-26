import type { Scene } from './moments';
import { ShowcaseHand } from './ShowcaseHand';
import type { Stage } from './stage';

/** Seconds a moment plays unseen first: its chain rushes in and settles. */
export const SETTLE = 0.6;
/** Frames a second the reel plays: enough for a window on the title screen. */
export const REEL_FPS = 30;
/** Frames a moment plays unseen. */
const SETTLE_FRAMES = Math.round(SETTLE * REEL_FPS);

/**
 * One play of a scene on a stage (v1.8.0), a moment of the reel or a fitting
 * of the Workshop, frame by frame at the reel's rate, so that it plays the
 * same every time: settled unseen, then played by its hand until its time is
 * up, noting when its peak came.
 */
export class MomentRun {
  private readonly hand: ShowcaseHand;
  private readonly peaked: () => boolean;
  /** Frames since it shows; negative while it settles. */
  private frame = -SETTLE_FRAMES;
  private peakValue: number | null = null;

  constructor(
    readonly scene: Scene,
    private readonly stage: Stage,
  ) {
    this.hand = new ShowcaseHand(scene.cues);
    this.peaked = scene.peak(stage.game);
  }

  /** Seconds into the moment, from when it shows: negative while it settles. */
  get time(): number {
    return this.frame / REEL_FPS;
  }

  /** Its chain is in place: from now on it shows. */
  get settled(): boolean {
    return this.frame >= 0;
  }

  /** When its peak came, or null so far. */
  get peak(): number | null {
    return this.peakValue;
  }

  get over(): boolean {
    return this.time >= this.scene.seconds;
  }

  /** Plays its unseen frames at once: the chain rushes in and comes to rest. */
  settle(): void {
    while (!this.settled) this.step();
  }

  /**
   * One frame more: unseen while the chain settles, then as its hand plays
   * it, drawn unless `drawn` is false (a still image draws only its last).
   */
  step(drawn = true): void {
    const shown = this.settled;
    if (shown) this.hand.play(this.stage, this.time);
    this.stage.advance(1 / REEL_FPS, shown && drawn);
    this.frame++;
    if (shown && this.peakValue === null && this.peaked()) this.peakValue = this.time;
  }
}
