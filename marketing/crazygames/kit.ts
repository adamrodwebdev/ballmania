import { Palette } from '@/play/Palette';
import { drawCover, TITLE_FONT } from './cover';
import { CUTS } from './cuts';
import { Recorder, Trailer } from './trailer';

/**
 * The CrazyGames kit, rendered in the browser and driven by `render.mjs`:
 * covers as PNG, trailers as MP4. Nothing here ships with the game.
 */

const palette = () => Palette.fromStyle(getComputedStyle(document.documentElement));

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

const cover = async (
  width: number,
  height: number,
  title = 'Ballmania',
): Promise<HTMLCanvasElement> => {
  await document.fonts.load(`100px "${TITLE_FONT}"`);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, palette(), title);
  return canvas;
};

const kit = {
  async cover(
    width: number,
    height: number,
    type = 'image/png',
    title = 'Ballmania',
  ): Promise<string> {
    const canvas = await cover(width, height, title);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    return toDataUrl(blob!);
  },

  /** The trailer: the cover, then the title reel's moments (see `CUTS`). */
  async trailer(width: number, height: number): Promise<string> {
    const recorder = await Recorder.create(width, height);
    const trailer = new Trailer(width, height, palette());
    await trailer.shoot(await cover(width, height), CUTS, (frame) => recorder.add(frame));
    return toDataUrl(new Blob([await recorder.finish()], { type: 'video/mp4' }));
  },
};

Object.assign(window, { kit });
document.body.dataset.ready = 'true';
