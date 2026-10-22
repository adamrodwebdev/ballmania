/**
 * A canvas the game draws on: one in the page, or an OffscreenCanvas in a
 * worker (the title scene's, v1.7.6). Both speak the same 2D API.
 */
export type SpriteCanvas = HTMLCanvasElement | OffscreenCanvas;

/** The 2D context of either kind of canvas. */
export type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
