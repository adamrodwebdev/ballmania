import type { Moment } from './moments';
import { ShowcaseHand } from './ShowcaseHand';
import type { Stage } from './stage';

/** Seconds a moment plays unseen first: its chain rushes in and settles. */
export const SETTLE = 0.6;
/** Frames a second the reel plays: enough for a window on the title screen. */
export const REEL_FPS = 30;

/**
 * One play of a moment of the reel on a stage (v1.8.0): settled unseen, then
 * played by its hand until its time is up, noting when its peak came.
 */
export class MomentRun {
  private readonly hand: ShowcaseHand;
  private readonly peaked: () => boolean;
  private timeValue = 0;
  private peakValue: number | null = null;

  constructor(
    readonly moment: Moment,
    private readonly stage: Stage,
  ) {
    this.hand = new ShowcaseHand(moment.cues);
    this.peaked = moment.peak(stage.game);
  }

  /** Seconds into the moment, from when it shows. */
  get time(): number {
    return this.timeValue;
  }

  /** When its peak came, or null so far. */
  get peak(): number | null {
    return this.peakValue;
  }

  get over(): boolean {
    return this.timeValue >= this.moment.seconds;
  }

  /** Plays its first seconds unseen: the chain rushes in and comes to rest. */
  settle(): void {
    for (let t = 0; t < SETTLE; t += 1 / REEL_FPS) this.stage.advance(1 / REEL_FPS);
  }

  /** `dt` seconds more, as its hand plays them. */
  advance(dt: number): void {
    this.hand.play(this.stage, this.timeValue);
    this.stage.advance(dt);
    this.timeValue += dt;
    if (this.peakValue === null && this.peaked()) this.peakValue = this.timeValue;
  }
}
