import displayFace from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2?url';
import { Palette } from '@/play/Palette';
import type { PaletteSet, ReelMessage, ReelReply } from './messages';
import { Reel, type ReelHost } from './Reel';
import type { ReelPalettes } from './Take';

/**
 * The title reel's worker (v1.8.0): it plays the moments on the canvas the
 * page handed it, so the page's main thread never runs the game for them.
 */
let reel: Reel | null = null;

const reply = (message: ReelReply) => postMessage(message);

/** Workers that cannot wait for a frame (older Safari) draw at 60 fps by the clock. */
const frames: Pick<ReelHost, 'requestFrame' | 'cancelFrame'> =
  typeof requestAnimationFrame === 'function'
    ? {
        requestFrame: (callback) => requestAnimationFrame(callback),
        cancelFrame: (handle) => cancelAnimationFrame(handle),
      }
    : {
        requestFrame: (callback) => self.setTimeout(() => callback(performance.now()), 1000 / 60),
        cancelFrame: (handle) => self.clearTimeout(handle),
      };

const host: ReelHost = { ...frames, showing: (index) => reply({ kind: 'showing', index }) };

const palettesOf = ({ day, night }: PaletteSet): ReelPalettes => ({
  day: Palette.of(day),
  night: Palette.of(night),
});

/** The cheers over the board are set in the game's display face: a worker loads it for itself. */
function loadDisplayFace(): void {
  const fonts = (self as unknown as { fonts?: FontFaceSet }).fonts;
  if (!fonts || typeof FontFace !== 'function') return;
  const face = new FontFace('Lilita One', `url(${displayFace})`);
  fonts.add(face);
  // Until it comes, or if it cannot, the cheers fall back on the system's face.
  face.load().catch(() => fonts.delete(face));
}

type Handlers = {
  readonly [K in ReelMessage['kind']]: (message: Extract<ReelMessage, { kind: K }>) => void;
};

const handlers: Handlers = {
  start: ({ canvas, palettes, equipped, effects, still }) => {
    loadDisplayFace();
    reel = new Reel(canvas, { palettes: palettesOf(palettes), equipped, effects, still }, host);
  },
  resize: ({ width, height, ratio }) => reel?.resize(width, height, ratio),
  palettes: ({ palettes }) => reel?.setPalettes(palettesOf(palettes)),
  run: ({ running }) => reel?.run(running),
};

addEventListener('message', (event: MessageEvent<ReelMessage>) => {
  const handle = handlers[event.data.kind] as (message: ReelMessage) => void;
  handle(event.data);
});

reply({ kind: 'ready' });
