import { Palette } from '@/play/Palette';
import { drawCover, TITLE_FONT } from './cover';
import { Recorder, Trailer, type Shot } from './trailer';

/**
 * The CrazyGames kit, rendered in the browser and driven by `render.mjs`:
 * covers as PNG, trailers as MP4. Nothing here ships with the game.
 */

/** The cuts of the trailer: four worlds, ending on a win and its board swallowed by the hole. */
const SHOTS: readonly Shot[] = [
  { level: 'nebula-09', seed: 'trailer-1', seconds: 4.6, moment: 'action' },
  { level: 'volcano-05', seed: 'trailer-3', seconds: 4.6, moment: 'action' },
  { level: 'singularity-02', seed: 'trailer-4', seconds: 4.6, moment: 'action' },
  { level: 'neon-07', seed: 'trailer-2', seconds: 4.6, moment: 'win' },
];
/** The opening still: the cover, so the thumbnail flows into the video. */
const COVER_SECONDS = 1;

const palette = () => Palette.fromStyle(getComputedStyle(document.documentElement));

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

const cover = async (width: number, height: number): Promise<HTMLCanvasElement> => {
  await document.fonts.load(`100px "${TITLE_FONT}"`);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, palette());
  return canvas;
};

const kit = {
  async cover(width: number, height: number, type = 'image/png'): Promise<string> {
    const canvas = await cover(width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    return toDataUrl(blob!);
  },

  async trailer(width: number, height: number): Promise<string> {
    const recorder = await Recorder.create(width, height);
    await recorder.hold(await cover(width, height), COVER_SECONDS);
    const trailer = new Trailer(width, height, palette());
    for (const shot of SHOTS) {
      const start = trailer.plan(shot);
      console.log(`${shot.level}: from ${(start / 30).toFixed(1)} s`);
      await trailer.shoot(shot, start, (frame) => recorder.add(frame));
    }
    return toDataUrl(new Blob([await recorder.finish()], { type: 'video/mp4' }));
  },
};

Object.assign(window, { kit });
document.body.dataset.ready = 'true';
