import { TONE_VARIABLES, type PaletteColours } from '@/play/Palette';
import { MAX_CANVAS_PIXELS, MAX_PIXEL_RATIO } from '@/play/canvas';
import { COSMETICS, SLOTS, type CosmeticSlot } from '@/player/catalog';
import { COLOUR } from '@/rules/formats';
import { InputRecord, InvalidInput, orElse, readText } from '@/rules/input';
import { EFFECT_LEVELS, type EffectLevel } from '@/services/SettingsService';

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

/*
 * Messages are read at the door, even between the page and its own worker (the rule of
 * 9 Nov 2026): a message that does not fit is ignored, never guessed at.
 */

/** Tells the canvas the page hands over: an OffscreenCanvas, where the worker runs. */
export type CanvasCheck = (value: unknown) => value is OffscreenCanvas;

/** A window's size in CSS pixels, wider than any screen. */
const SIZE = { min: 0, max: 16_384 } as const;
const RATIO = { min: 0, max: MAX_PIXEL_RATIO } as const;
/** A canvas stays near 4 megapixels (`pixelRatioFor`): this leaves room for its rounding only. */
const MAX_PIXELS = MAX_CANVAS_PIXELS * 1.01;
/** The place of a scene in its lineup: eight moments today. */
const SCENE_INDEX = { min: 0, max: 63, integer: true } as const;

const MESSAGE_KINDS: readonly ReelMessage['kind'][] = ['start', 'resize', 'palettes', 'run', 'fit'];
const REPLY_KINDS: readonly ReelReply['kind'][] = ['ready', 'showing'];

/** A field the readers cannot type (a canvas handed over): read from the message's own fields. */
function ownField(data: unknown, key: string): unknown {
  return typeof data === 'object' &&
    data !== null &&
    Object.prototype.hasOwnProperty.call(data, key)
    ? Reflect.get(data, key)
    : undefined;
}

function readColours(set: InputRecord, key: 'day' | 'night'): PaletteColours {
  const colours = set.record(key);
  const tones = colours.list('tones', {
    maxItems: TONE_VARIABLES.length,
    item: (value, field) => readText(value, COLOUR, field),
  });
  if (tones.length !== TONE_VARIABLES.length) throw new InvalidInput(`${key}.tones`, 'bad-format');
  return {
    tones,
    board: colours.text('board', COLOUR),
    track: colours.text('track', COLOUR),
    trackEdge: colours.text('trackEdge', COLOUR),
    hole: colours.text('hole', COLOUR),
    danger: colours.text('danger', COLOUR),
    accent: colours.text('accent', COLOUR),
    text: colours.text('text', COLOUR),
    shooter: colours.text('shooter', COLOUR),
  };
}

function readPalettes(message: InputRecord): PaletteSet {
  const set = message.record('palettes');
  return { day: readColours(set, 'day'), night: readColours(set, 'night') };
}

/** The cosmetic of the catalog worn in a slot: one of that slot. */
function readWorn(look: InputRecord, slot: CosmeticSlot): string {
  const ids = COSMETICS.filter((item) => item.slot === slot).map((item) => item.id);
  return look.choice(slot, ids);
}

function readEquipped(message: InputRecord): Equipped {
  const look = message.record('equipped');
  return {
    shooter: readWorn(look, 'shooter'),
    trail: readWorn(look, 'trail'),
    burst: readWorn(look, 'burst'),
    board: readWorn(look, 'board'),
  };
}

type MessageReaders = {
  readonly [K in ReelMessage['kind']]: (
    message: InputRecord,
    data: unknown,
    isCanvas: CanvasCheck,
  ) => Extract<ReelMessage, { kind: K }>;
};

const MESSAGE_READERS: MessageReaders = {
  start: (message, data, isCanvas) => {
    const canvas = ownField(data, 'canvas');
    if (!isCanvas(canvas)) throw new InvalidInput('reel.canvas', 'not-a-record');
    const slot = message.has('slot') ? message.choice('slot', SLOTS) : null;
    return {
      kind: 'start',
      canvas,
      palettes: readPalettes(message),
      equipped: readEquipped(message),
      effects: message.choice('effects', EFFECT_LEVELS),
      still: message.boolean('still'),
      ...(slot ? { slot } : {}),
    };
  },
  resize: (message) => {
    const width = message.number('width', SIZE);
    const height = message.number('height', SIZE);
    const ratio = message.number('ratio', RATIO);
    if (width * height * ratio * ratio > MAX_PIXELS) {
      throw new InvalidInput('reel.size', 'out-of-range');
    }
    return { kind: 'resize', width, height, ratio };
  },
  palettes: (message) => ({ kind: 'palettes', palettes: readPalettes(message) }),
  run: (message) => ({ kind: 'run', running: message.boolean('running') }),
  fit: (message) => ({
    kind: 'fit',
    slot: message.choice('slot', SLOTS),
    equipped: readEquipped(message),
  }),
};

/** A message from the page, as the worker reads it; null for one that does not fit. */
export function readReelMessage(data: unknown, isCanvas: CanvasCheck): ReelMessage | null {
  return orElse<ReelMessage | null>(() => {
    const message = InputRecord.from(data, 'reel');
    return MESSAGE_READERS[message.choice('kind', MESSAGE_KINDS)](message, data, isCanvas);
  }, null);
}

/** A reply from the worker, as the page reads it; null for one that does not fit. */
export function readReelReply(data: unknown): ReelReply | null {
  return orElse<ReelReply | null>(() => {
    const reply = InputRecord.from(data, 'reply');
    return reply.choice('kind', REPLY_KINDS) === 'ready'
      ? { kind: 'ready' }
      : { kind: 'showing', index: reply.number('index', SCENE_INDEX) };
  }, null);
}
