/** Longest frame passed on (a tab coming back from the background). */
const MAX_FRAME = 0.1;

/** Calls `frame` with the elapsed seconds on every animation frame, until stopped. */
export class GameLoop {
  private handle: number | null = null;
  private last = 0;

  constructor(
    private readonly frame: (dt: number) => void,
    private readonly scheduler: Pick<
      Window,
      'requestAnimationFrame' | 'cancelAnimationFrame'
    > = window,
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
    const dt = Math.min(Math.max(0, (now - this.last) / 1000), MAX_FRAME);
    this.last = now;
    this.handle = this.scheduler.requestAnimationFrame(this.tick);
    this.frame(dt);
  };
}
