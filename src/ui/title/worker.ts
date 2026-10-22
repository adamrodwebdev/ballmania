import { Palette } from '@/play/Palette';
import type { ReadyMessage, TitleMessage } from './messages';
import { TitleScene, type SceneHost } from './TitleScene';

/**
 * The title scene's worker (v1.7.6): it draws the scene on the canvas the
 * page handed it, so the page's main thread never waits for the canvas,
 * not even for the graphics set-up of its first frame.
 */
let scene: TitleScene | null = null;
let visible = true;

/** Workers that cannot wait for a frame (older Safari) draw at 60 fps by the clock. */
const frames: Pick<SceneHost, 'requestFrame' | 'cancelFrame'> =
  typeof requestAnimationFrame === 'function'
    ? {
        requestFrame: (callback) => requestAnimationFrame(callback),
        cancelFrame: (handle) => cancelAnimationFrame(handle),
      }
    : {
        requestFrame: (callback) => self.setTimeout(() => callback(performance.now()), 1000 / 60),
        cancelFrame: (handle) => self.clearTimeout(handle),
      };

const host: SceneHost = {
  createCanvas: () => new OffscreenCanvas(1, 1),
  visible: () => visible,
  ...frames,
};

type Handlers = {
  readonly [K in TitleMessage['kind']]: (message: Extract<TitleMessage, { kind: K }>) => void;
};

const handlers: Handlers = {
  start: ({ canvas, palette, still }) => {
    scene = new TitleScene(canvas, Palette.of(palette), still, host);
    scene.start();
  },
  resize: ({ width, height, ratio, room }) => scene?.resize(width, height, ratio, room),
  visibility: (message) => {
    visible = message.visible;
  },
};

addEventListener('message', (event: MessageEvent<TitleMessage>) => {
  const handle = handlers[event.data.kind] as (message: TitleMessage) => void;
  handle(event.data);
});

const ready: ReadyMessage = { kind: 'ready' };
postMessage(ready);
