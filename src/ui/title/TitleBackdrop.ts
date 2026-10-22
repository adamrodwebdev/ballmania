import type { Palette } from '@/play/Palette';
import type { TitleMessage } from './messages';
import type { Room, SceneHost, TitleScene } from './TitleScene';

/** The title screen's living backdrop, wherever it is drawn. */
export interface TitleBackdrop {
  /** Fits the scene to the canvas's CSS size (see `TitleScene.resize`). */
  resize(width: number, height: number, ratio: number, room?: Room): void;
  stop(): void;
}

/**
 * Drawn by a worker on the canvas handed to it (v1.7.6): the page's main
 * thread never waits for the canvas, not even for the graphics set-up of its
 * first frame, which a cold browser can take a tenth of a second to do.
 */
class WorkerBackdrop implements TitleBackdrop {
  private readonly onVisibility = () =>
    this.send({ kind: 'visibility', visible: document.visibilityState === 'visible' });

  constructor(
    private readonly worker: Worker,
    canvas: HTMLCanvasElement,
    palette: Palette,
    still: boolean,
  ) {
    const offscreen = canvas.transferControlToOffscreen();
    this.send({ kind: 'start', canvas: offscreen, palette: palette.colours(), still }, [offscreen]);
    this.onVisibility();
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  resize(width: number, height: number, ratio: number, room?: Room): void {
    this.send({ kind: 'resize', width, height, ratio, room });
  }

  stop(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.worker.terminate();
  }

  private send(message: TitleMessage, transfer: Transferable[] = []): void {
    this.worker.postMessage(message, transfer);
  }
}

/** Drawn in the page: browsers that cannot hand a canvas to a worker. */
class PageBackdrop implements TitleBackdrop {
  constructor(private readonly scene: TitleScene) {
    scene.start();
  }

  resize(width: number, height: number, ratio: number, room?: Room): void {
    this.scene.resize(width, height, ratio, room);
  }

  stop(): void {
    this.scene.stop();
  }
}

const PAGE: SceneHost = {
  createCanvas: () => document.createElement('canvas'),
  visible: () => document.visibilityState === 'visible',
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
};

/**
 * Starts the title scene on `canvas`: in a worker where the browser can hand
 * it the canvas, in the page otherwise (or if the worker cannot start).
 */
export async function openTitleBackdrop(
  canvas: HTMLCanvasElement,
  palette: Palette,
  still: boolean,
): Promise<TitleBackdrop> {
  const worker = 'transferControlToOffscreen' in canvas ? await startWorker() : null;
  if (worker) return new WorkerBackdrop(worker, canvas, palette, still);
  const { TitleScene } = await import('./TitleScene');
  return new PageBackdrop(new TitleScene(canvas, palette, still, PAGE));
}

/** The scene's worker once it runs; null if it cannot (blocked, failed to load). */
function startWorker(): Promise<Worker | null> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(null);
      return;
    }
    // Its one message says it runs (see ReadyMessage).
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
