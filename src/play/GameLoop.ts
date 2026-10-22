import { FrameCap } from './FrameCap';

/** Longest frame passed on (a tab coming back from the background). */
const MAX_FRAME = 0.1;

/**
 * Calls `frame` with the elapsed seconds on every animation frame the cap
 * admits (all of them by default), until stopped.
 */
export class GameLoop {
  private handle: number | null = null;
  private last = 0;

  constructor(
    private readonly frame: (dt: number) => void,
    private readonly scheduler: Pick<
      Window,
      'requestAnimationFrame' | 'cancelAnimationFrame'
    > = window,
    private readonly cap: FrameCap = FrameCap.none(),
  ) {}

  get running(): boolean {
    return this.handle !== null;
  }

  start(): void {
    if (this.handle !== null) return;
    this.last = performance.now();
    this.handle = this.scheduler.requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.handle !== null) this.scheduler.cancelAnimationFrame(this.handle);
    this.handle = null;
  }

  private readonly tick = (now: number): void => {
    this.handle = this.scheduler.requestAnimationFrame(this.tick);
    // A skipped frame's time goes to the next one drawn.
    if (!this.cap.admits(now)) return;
    const dt = Math.min(Math.max(0, (now - this.last) / 1000), MAX_FRAME);
    this.last = now;
    this.frame(dt);
  };
}
