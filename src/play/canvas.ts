/**
 * A canvas the game draws on: one in the page, or an OffscreenCanvas in a
 * worker (the title scene's, v1.7.6). Both speak the same 2D API.
 */
export type SpriteCanvas = HTMLCanvasElement | OffscreenCanvas;

/** The 2D context of either kind of canvas. */
export type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Most device pixels per CSS pixel a canvas gets: beyond 2, nobody sees the difference. */
export const MAX_PIXEL_RATIO = 2;
/** Most pixels a canvas filling the screen gets: about 4 megapixels. */
export const MAX_CANVAS_PIXELS = 4_000_000;

/**
 * Device pixels per CSS pixel for a canvas of this CSS size (v1.7.6): the
 * screen's own ratio up to 2, and less on very large screens, so that the
 * canvas stays near 4 megapixels. A 4K screen would otherwise ask for 8 to
 * 16, and each layer the board keeps (background, tracks) as many again.
 */
export function pixelRatioFor(width: number, height: number, devicePixelRatio: number): number {
  const area = Math.max(1, width * height);
  return Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO, Math.sqrt(MAX_CANVAS_PIXELS / area));
}
