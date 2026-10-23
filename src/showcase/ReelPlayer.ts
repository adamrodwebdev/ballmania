import type { PaletteSet, ReelMessage, ReelReply } from './messages';
import type { Reel, ReelHost } from './Reel';
import type { ReelPalettes, ReelStyle } from './Take';

/** The title reel, wherever it plays: in a worker, or in the page. */
export interface ReelPlayer {
  /** Fits it to the window's CSS size, in device pixels per CSS pixel. */
  resize(width: number, height: number, ratio: number): void;
  setPalettes(palettes: ReelPalettes): void;
  /** Plays on, or stops: off screen, in a hidden tab, behind a dialog. */
  run(running: boolean): void;
  stop(): void;
}

const coloursOf = ({ day, night }: ReelPalettes): PaletteSet => ({
  day: day.colours(),
  night: night.colours(),
});

/**
 * Played by a worker on the canvas handed to it (v1.8.0): the page's main
 * thread never runs the game for the reel, nor waits for its canvas.
 */
class WorkerReel implements ReelPlayer {
  constructor(
    private readonly worker: Worker,
    canvas: HTMLCanvasElement,
    style: ReelStyle,
    showing: (index: number) => void,
  ) {
    worker.addEventListener('message', ({ data }: MessageEvent<ReelReply>) => {
      if (data.kind === 'showing') showing(data.index);
    });
    const offscreen = canvas.transferControlToOffscreen();
    const { equipped, effects, still } = style;
    this.send(
      {
        kind: 'start',
        canvas: offscreen,
        palettes: coloursOf(style.palettes),
        equipped: { ...equipped },
        effects,
        still,
      },
      [offscreen],
    );
  }

  resize(width: number, height: number, ratio: number): void {
    this.send({ kind: 'resize', width, height, ratio });
  }

  setPalettes(palettes: ReelPalettes): void {
    this.send({ kind: 'palettes', palettes: coloursOf(palettes) });
  }

  run(running: boolean): void {
    this.send({ kind: 'run', running });
  }

  stop(): void {
    this.worker.terminate();
  }

  private send(message: ReelMessage, transfer: Transferable[] = []): void {
    this.worker.postMessage(message, transfer);
  }
}

/** Played in the page: browsers that cannot hand a canvas to a worker. */
class PageReel implements ReelPlayer {
  constructor(private readonly reel: Reel) {}

  resize(width: number, height: number, ratio: number): void {
    this.reel.resize(width, height, ratio);
  }

  setPalettes(palettes: ReelPalettes): void {
    this.reel.setPalettes(palettes);
  }

  run(running: boolean): void {
    this.reel.run(running);
  }

  stop(): void {
    this.reel.destroy();
  }
}

/** The page's own frames, for a reel played in the page. */
function pageHost(showing: (index: number) => void): ReelHost {
  return {
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (handle) => cancelAnimationFrame(handle),
    showing,
  };
}

/**
 * Opens the title reel on `canvas`: in a worker where the browser can hand it
 * the canvas, in the page otherwise (or if the worker cannot start). Only
 * then is the game's code loaded.
 */
export async function openReel(
  canvas: HTMLCanvasElement,
  style: ReelStyle,
  showing: (index: number) => void,
): Promise<ReelPlayer> {
  const worker = 'transferControlToOffscreen' in canvas ? await startWorker() : null;
  if (worker) return new WorkerReel(worker, canvas, style, showing);
  const { Reel } = await import('./Reel');
  return new PageReel(new Reel(canvas, style, pageHost(showing)));
}

/** The reel's worker once it runs; null if it cannot (blocked, failed to load). */
function startWorker(): Promise<Worker | null> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(null);
      return;
    }
    // Its first message says it runs (see ReelReply).
    worker.addEventListener('message', () => resolve(worker), { once: true });
    worker.addEventListener(
      'error',
      () => {
        worker.terminate();
        resolve(null);
      },
      { once: true },
    );
  });
}
