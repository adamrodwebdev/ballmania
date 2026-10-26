import type { PaletteColours } from '@/play/Palette';
import type { CosmeticSlot } from '@/player/catalog';
import type { EffectLevel } from '@/services/SettingsService';

/** The reel's two palettes as plain data, which `postMessage` can copy to a worker. */
export interface PaletteSet {
  readonly day: PaletteColours;
  readonly night: PaletteColours;
}

/** What the page tells the reel's worker (v1.8.0). */
export type ReelMessage =
  | {
      readonly kind: 'start';
      /** The page's canvas, handed over: from now on only the worker draws on it. */
      readonly canvas: OffscreenCanvas;
      readonly palettes: PaletteSet;
      readonly equipped: Readonly<Record<CosmeticSlot, string>>;
      readonly effects: EffectLevel;
      readonly still: boolean;
    }
  | {
      readonly kind: 'resize';
      readonly width: number;
      readonly height: number;
      readonly ratio: number;
    }
  | { readonly kind: 'palettes'; readonly palettes: PaletteSet }
  | { readonly kind: 'run'; readonly running: boolean };

/** What the worker tells the page: it runs, then which moment shows. */
export type ReelReply =
  { readonly kind: 'ready' } | { readonly kind: 'showing'; readonly index: number };
