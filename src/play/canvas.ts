/**
 * A canvas the game draws on: one in the page, or an OffscreenCanvas in a
 * worker (the title scene's, v1.7.6). Both speak the same 2D API.
 */
export type SpriteCanvas = HTMLCanvasElement | OffscreenCanvas;

/** The 2D context of either kind of canvas. */
export type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * The 2D context of a canvas of either kind, typed as such: TypeScript does
 * not resolve a call on the union of both reliably (it depends on the order
 * in which it met them).
 */
export function context2d(
  canvas: SpriteCanvas,
  settings?: CanvasRenderingContext2DSettings,
): Context2D | null {
  return 'ownerDocument' in canvas
    ? canvas.getContext('2d', settings)
    : canvas.getContext('2d', settings);
}

/**
 * A new blank canvas of the same kind as `like`: in the page for a page's
 * canvas, offscreen for a worker's (v1.8.0: the title's reel draws the game
 * in a worker).
 */
export function blankCanvas(like: SpriteCanvas): SpriteCanvas {
  return 'ownerDocument' in like
    ? like.ownerDocument.createElement('canvas')
    : new OffscreenCanvas(1, 1);
}

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
