import { vi } from 'vitest';
import { Palette } from '@/play/Palette';
import { DEFAULT_LOOK } from '@/player/catalog';
import type { ReelStyle } from '@/showcase/Take';

/** One drawing call on a recorded canvas, with the opacity it was made at. */
export interface DrawCall {
  readonly method: string;
  readonly alpha: number;
}

/**
 * A 2D context that takes every call and does nothing: any property read or
 * call gives it back, and it reads as 0 in arithmetic. A call to `drawImage`
 * is recorded if asked.
 */
function nullContext(canvas: object, record?: (call: DrawCall) => void): unknown {
  let alpha = 1;
  const context: unknown = new Proxy(function () {}, {
    get: (_, key) => {
      if (key === Symbol.toPrimitive) return () => 0;
      if (key === 'canvas') return canvas;
      if (key === 'globalAlpha') return alpha;
      if (key === 'drawImage' && record) {
        return () => record({ method: 'drawImage', alpha });
      }
      return context;
    },
    set: (_, key, value) => {
      if (key === 'globalAlpha') alpha = Number(value);
      return true;
    },
    apply: () => context,
  });
  return context;
}

/**
 * A canvas for tests in Node, which has none (v1.8.0): the game's own play
 * session and renderer run on it as in the page, drawing nothing. Its blank
 * canvases are fake ones too.
 */
export function fakeCanvas(record?: (call: DrawCall) => void): HTMLCanvasElement {
  // The renderer traces its tracks as paths.
  vi.stubGlobal(
    'Path2D',
    // Called with `new`: an arrow function cannot be.
    vi.fn(function path() {
      return new Proxy({}, { get: () => () => undefined });
    }),
  );
  const canvas = {
    width: 300,
    height: 150,
    ownerDocument: { createElement: () => fakeCanvas() },
    getContext: () => context,
  };
  const context = nullContext(canvas, record);
  return canvas as unknown as HTMLCanvasElement;
}

/** How the reel looks for a newcomer, colours aside: the tests need no theme. */
export function reelStyle(still = false): ReelStyle {
  const palette = Palette.fromStyle({ getPropertyValue: () => '' });
  return {
    palettes: { day: palette, night: palette },
    equipped: DEFAULT_LOOK,
    effects: 'spectacular',
    still,
  };
}
