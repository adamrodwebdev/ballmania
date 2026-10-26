import { blankCanvas, context2d, type Context2D, type SpriteCanvas } from '@/play/canvas';
import { FrameCap } from '@/play/FrameCap';
import type { CosmeticSlot } from '@/player/catalog';
import type { Scene } from './moments';
import { REEL_FPS, SETTLE } from './MomentRun';
import { Take, type ReelPalettes, type ReelStyle } from './Take';

/** Seconds one scene fades into the next. */
export const FADE = 0.4;
/** Seconds after its peak the still image shows a scene: the Nova's blast spreading. */
const STILL_AFTER = 0.3;

/** What the reel needs from where it runs: the page, or a worker. */
export interface ReelHost {
  requestFrame(callback: (now: number) => void): number;
  cancelFrame(handle: number): void;
  /** The scene shown from now on, by its place in the lineup: its caption, its tick. */
  showing(index: number): void;
}

/**
 * Scenes played by the game's own engine and renderer, one after the other
 * in a loop, each fading into the next (v1.8.0): the title screen's
 * highlights, or the cosmetic tried on in the Workshop's fitting room. With
 * reduced motion, one still image: the first scene at its peak. Drawn by a
 * worker where the browser can hand it the canvas, in the page otherwise.
 */
export class Reel {
  private readonly ctx: Context2D;
  private readonly cap = new FrameCap(REEL_FPS);
  private style: ReelStyle;
  private scenes: readonly Scene[];
  /** The scene showing, and its place in the lineup. */
  private current: Take | null = null;
  private index = 0;
  /** The next one, settling unseen, then fading in over the end of the current one. */
  private next: Take | null = null;
  private nextIndex = 0;
  /** The next one takes over as soon as it has faded in (a new lineup), not at the end. */
  private cutting = false;
  /** The very first scene fades in from the empty window. */
  private opening = true;
  private size = { width: 0, height: 0, ratio: 1 };
  private handle: number | null = null;

  constructor(
    private readonly canvas: SpriteCanvas,
    style: ReelStyle,
    private readonly host: ReelHost,
    scenes: readonly Scene[],
  ) {
    const ctx = context2d(canvas);
    if (!ctx) throw new Error('No 2D canvas');
    this.ctx = ctx;
    this.style = style;
    this.scenes = scenes;
  }

  /** Fits the reel to the window's CSS size; the first scene is ready once it is known. */
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

  /**
   * Plays another lineup from now on, in another look (the fitting room's
   * next cosmetic): its first scene settles unseen, then fades in over the
   * one showing. A still image changes at once.
   */
  play(scenes: readonly Scene[], equipped: Readonly<Record<CosmeticSlot, string>>): void {
    this.scenes = scenes;
    this.style = { ...this.style, equipped };
    this.next?.destroy();
    this.next = null;
    if (!this.current) return;
    if (this.style.still) {
      this.current.destroy();
      this.current = null;
      this.begin();
      this.draw();
      return;
    }
    this.next = this.take(0);
    this.nextIndex = 0;
    this.cutting = true;
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
    // One frame of the scenes for each frame drawn, at the reel's own rate.
    if (!this.cap.admits(now)) return;
    this.step();
    this.draw();
  };

  /** The first scene, its chain in place; with reduced motion, at its peak. */
  private begin(): void {
    if (this.size.width < 1) return;
    const take = this.take(0);
    take.run.settle();
    if (this.style.still) {
      const { run } = take;
      while (!run.over && (run.peak === null || run.time < run.peak + STILL_AFTER)) run.step(false);
      run.step();
      this.opening = false;
    }
    this.current = take;
    this.index = 0;
    this.host.showing(0);
  }

  /** One frame of the scene showing, and of the next one once its turn nears. */
  private step(): void {
    const current = this.current;
    if (!current) return;
    current.run.step();
    if (!this.next && current.scene.seconds - current.run.time <= SETTLE + FADE) {
      this.nextIndex = (this.index + 1) % this.scenes.length;
      this.next = this.take(this.nextIndex);
    }
    const next = this.next;
    if (next) {
      next.run.step();
      // Its chain has just come to rest: it shows from now on, fading in.
      if (next.run.time === 0) this.host.showing(this.nextIndex);
    }
    if (current.run.over || (this.cutting && next && next.run.time >= FADE)) {
      current.destroy();
      this.current = next;
      this.next = null;
      this.index = this.nextIndex;
      this.opening = false;
      this.cutting = false;
    }
  }

  /** The scene showing, and the next one over it as it fades in. */
  private draw(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const current = this.current;
    if (!current) return;
    ctx.globalAlpha = this.opening ? Math.min(1, current.run.time / FADE) : 1;
    this.paint(current);
    const next = this.next;
    if (next && next.run.time > 0) {
      ctx.globalAlpha = Math.min(1, next.run.time / FADE);
      this.paint(next);
    }
    ctx.globalAlpha = 1;
  }

  /** A take into the window: the part of it its framing shows. */
  private paint(take: Take): void {
    const { ctx, canvas } = this;
    const crop = take.crop();
    ctx.drawImage(
      take.canvas,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }

  /** A scene of the lineup, on a canvas of its own the size of the window (or its framing's). */
  private take(index: number): Take {
    const take = new Take({
      scene: this.scenes[index]!,
      canvas: blankCanvas(this.canvas),
      style: this.style,
    });
    take.resize(this.size.width, this.size.height, this.size.ratio);
    return take;
  }
}
