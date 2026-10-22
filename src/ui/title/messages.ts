import type { PaletteColours } from '@/play/Palette';
import type { Room } from './TitleScene';

/** What the page tells the title scene's worker (v1.7.6). */
export type TitleMessage =
  | {
      readonly kind: 'start';
      /** The page's canvas, handed over: from now on only the worker draws on it. */
      readonly canvas: OffscreenCanvas;
      readonly palette: PaletteColours;
      readonly still: boolean;
    }
  | {
      readonly kind: 'resize';
      readonly width: number;
      readonly height: number;
      readonly ratio: number;
      readonly room: Room | undefined;
    }
  | { readonly kind: 'visibility'; readonly visible: boolean };

/** The worker's one answer: it runs, the page can hand it the canvas. */
export interface ReadyMessage {
  readonly kind: 'ready';
}
