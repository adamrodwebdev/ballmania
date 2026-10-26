import type { PaletteColours } from '@/play/Palette';
import type { CosmeticSlot } from '@/player/catalog';
import type { EffectLevel } from '@/services/SettingsService';

/** The reel's two palettes as plain data, which `postMessage` can copy to a worker. */
export interface PaletteSet {
  readonly day: PaletteColours;
  readonly night: PaletteColours;
}

/** What the player wears, slot by slot. */
export type Equipped = Readonly<Record<CosmeticSlot, string>>;

/** What the page tells a reel's worker (v1.8.0): the title's, or the fitting room's. */
export type ReelMessage =
  | {
      readonly kind: 'start';
      /** The page's canvas, handed over: from now on only the worker draws on it. */
      readonly canvas: OffscreenCanvas;
      readonly palettes: PaletteSet;
      readonly equipped: Equipped;
      readonly effects: EffectLevel;
      readonly still: boolean;
      /** The fitting room's first slot; none for the title's reel. */
      readonly slot?: CosmeticSlot;
    }
  | {
      readonly kind: 'resize';
      readonly width: number;
      readonly height: number;
      readonly ratio: number;
    }
  | { readonly kind: 'palettes'; readonly palettes: PaletteSet }
  | { readonly kind: 'run'; readonly running: boolean }
  /** The fitting room tries another cosmetic on: its slot's scene, in the look it gives. */
  | { readonly kind: 'fit'; readonly slot: CosmeticSlot; readonly equipped: Equipped };

/** What the worker tells the page: it runs, then which scene shows. */
export type ReelReply =
  { readonly kind: 'ready' } | { readonly kind: 'showing'; readonly index: number };
