import { blankCanvas, context2d, type Context2D, type SpriteCanvas } from '@/play/canvas';
import { FrameCap } from '@/play/FrameCap';
import { MOMENTS } from './moments';
import { REEL_FPS, SETTLE } from './MomentRun';
import { Take, type ReelPalettes, type ReelStyle } from './Take';

/** Seconds one moment fades into the next. */
export const FADE = 0.4;
/** Seconds after its peak the still image shows the Nova: its blast spreading. */
const STILL_AFTER = 0.3;

/** What the reel needs from where it runs: the page, or a worker. */
export interface ReelHost {
  requestFrame(callback: (now: number) => void): number;
  cancelFrame(handle: number): void;
  /** The moment shown from now on, by its place in the lineup: its caption, its tick. */
  showing(index: number): void;
}

/**
 * The title screen's reel (v1.8.0): the game's highlights, each one a real
 * game played by the game's own engine and renderer, one after the other in
 * a loop, each fading into the next. With reduced motion, one still image:
 * the Nova at its peak. Drawn by a worker where the browser can hand it the
 * canvas, in the page otherwise.
 */
export class Reel {
  private readonly ctx: Context2D;
  private readonly cap = new FrameCap(REEL_FPS);
  private style: ReelStyle;
  /** The moment showing, and its place in the lineup. */
  private current: Take | null = null;
  private index = 0;
  /** The next one, settling unseen, then fading in over the end of the current one. */
  private next: Take | null = null;
  /** The very first moment fades in from the empty window. */
  private opening = true;
  private size = { width: 0, height: 0, ratio: 1 };
  private handle: number | null = null;

  constructor(
    private readonly canvas: SpriteCanvas,
    style: ReelStyle,
    private readonly host: ReelHost,
  ) {
    const ctx = context2d(canvas);
    if (!ctx) throw new Error('No 2D canvas');
    this.ctx = ctx;
    this.style = style;
  }

  /** Fits the reel to the window's CSS size; the first moment is ready once it is known. */
  resize(width: number, height: number, ratio: number): void {
    if (width < 1 || height < 1) return;
    this.size = { width, height, ratio };
    // Resizing a canvas clears it and allocates it anew: only when its size changes.
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
    if (this.current) {
      this.current.resize(width, height, ratio);
      this.next?.resize(width, height, ratio);
    } else this.begin();
    this.draw();
  }

  setPalettes(palettes: ReelPalettes): void {
    this.style = { ...this.style, palettes };
    this.current?.setPalettes(palettes);
    this.next?.setPalettes(palettes);
    this.draw();
  }

  /** Plays on, or stops: off screen, in a hidden tab, behind a dialog. A still image never moves. */
  run(running: boolean): void {
    if (!running || this.style.still) {
      if (this.handle !== null) this.host.cancelFrame(this.handle);
      this.handle = null;
    } else if (this.handle === null) {
      this.handle = this.host.requestFrame(this.tick);
    }
  }

  destroy(): void {
    this.run(false);
    this.current?.destroy();
    this.next?.destroy();
    this.current = null;
    this.next = null;
  }

  private readonly tick = (now: number): void => {
    this.handle = this.host.requestFrame(this.tick);
    // One frame of the moments for each frame drawn, at the reel's own rate.
    if (!this.cap.admits(now)) return;
    this.step();
    this.draw();
  };

  /** The first moment, its chain in place; with reduced motion, the Nova at its peak. */
  private begin(): void {
    const take = this.take(0);
    take.run.settle();
    if (this.style.still) {
      const { run } = take;
      while (!run.over && (run.peak === null || run.time < run.peak + STILL_AFTER)) run.step(false);
      run.step();
      this.opening = false;
    }
    this.current = take;
    this.host.showing(0);
  }

  /** One frame of the moment showing, and of the next one once its turn nears. */
  private step(): void {
    const current = this.current;
    if (!current) return;
    current.run.step();
    const following = (this.index + 1) % MOMENTS.length;
    if (!this.next && current.moment.seconds - current.run.time <= SETTLE + FADE) {
      this.next = this.take(following);
    }
    const next = this.next;
    if (next) {
      next.run.step();
      // Its chain has just come to rest: it shows from now on, fading in.
      if (next.run.time === 0) this.host.showing(following);
    }
    if (current.run.over) {
      current.destroy();
      this.current = next;
      this.next = null;
      this.index = following;
      this.opening = false;
    }
  }

  /** The moment showing, and the next one over it as it fades in. */
  private draw(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const current = this.current;
    if (!current) return;
    ctx.globalAlpha = this.opening ? Math.min(1, current.run.time / FADE) : 1;
    ctx.drawImage(current.canvas, 0, 0, canvas.width, canvas.height);
    const next = this.next;
    if (next && next.run.time > 0) {
      ctx.globalAlpha = Math.min(1, next.run.time / FADE);
      ctx.drawImage(next.canvas, 0, 0, canvas.width, canvas.height);
    }
    ctx.globalAlpha = 1;
  }

  /** A moment of the lineup, on a canvas of its own the size of the window. */
  private take(index: number): Take {
    const take = new Take({
      moment: MOMENTS[index]!,
      canvas: blankCanvas(this.canvas),
      style: this.style,
    });
    take.resize(this.size.width, this.size.height, this.size.ratio);
    return take;
  }
}
