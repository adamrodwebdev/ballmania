import displayFace from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2?url';
import { Palette } from '@/play/Palette';
import type { CosmeticSlot } from '@/player/catalog';
import type { PaletteSet, ReelMessage, ReelReply } from './messages';
import type { Scene } from './moments';
import { Reel, type ReelHost } from './Reel';
import type { ReelPalettes } from './Take';

/** The scenes a worker plays: the title's lineup, or the scene of the slot tried on. */
export type Lineup = (slot: CosmeticSlot | undefined) => readonly Scene[];

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

/**
 * A reel's worker (v1.8.0): it plays its lineup on the canvas the page handed
 * it, so the page's main thread never runs the game for it. The title's reel
 * and the Workshop's fitting room each have their own, sharing this.
 */
export function serveReel(lineup: Lineup): void {
  let reel: Reel | null = null;
  const handlers: Handlers = {
    start: ({ canvas, palettes, equipped, effects, still, slot }) => {
      loadDisplayFace();
      const style = { palettes: palettesOf(palettes), equipped, effects, still };
      reel = new Reel(canvas, style, host, lineup(slot));
    },
    resize: ({ width, height, ratio }) => reel?.resize(width, height, ratio),
    palettes: ({ palettes }) => reel?.setPalettes(palettesOf(palettes)),
    run: ({ running }) => reel?.run(running),
    fit: ({ slot, equipped }) => reel?.play(lineup(slot), equipped),
  };
  addEventListener('message', (event: MessageEvent<ReelMessage>) => {
    const handle = handlers[event.data.kind] as (message: ReelMessage) => void;
    handle(event.data);
  });
  reply({ kind: 'ready' });
}
